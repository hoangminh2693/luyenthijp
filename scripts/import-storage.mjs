#!/usr/bin/env node
/**
 * import-storage.mjs - Upload local storage-export/ to your OWN Supabase.
 *
 * Reads files from ./storage-export/<bucket>/<path> produced by export-storage.mjs
 * and uploads to DEST Supabase, preserving paths (images/*, audios/*, <user_id>/*).
 *
 * Buckets must be public (as in supabase/migrations/20260111140318_*.sql).
 * Avatars bucket has RLS `auth.uid()::text = (storage.foldername(name))[1]` so
 * you MUST use service_role key for import (anon will be denied).
 *
 * Usage:
 *   DEST_SUPABASE_URL="https://<new-project>.supabase.co" \
 *   DEST_SUPABASE_SERVICE_ROLE_KEY="<service_role>" \
 *   node scripts/import-storage.mjs
 *
 *   # Custom:
 *   node scripts/import-storage.mjs --in=./storage-export --buckets=question-media,avatars --dry-run
 *   node scripts/import-storage.mjs --upsert=false --concurrency=10
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  const raw = readFileSync(envPath, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const fileEnv = loadEnvFile();
function env(name, fallback = undefined) {
  return process.env[name] ?? fileEnv[name] ?? fallback;
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const DEST_URL =
  env("DEST_SUPABASE_URL") ||
  env("VITE_SUPABASE_URL") ||
  env("SUPABASE_URL") ||
  "";
const DEST_KEY =
  env("DEST_SUPABASE_SERVICE_ROLE_KEY") ||
  env("SUPABASE_SERVICE_ROLE_KEY") ||
  env("DEST_SUPABASE_KEY") ||
  "";

const IN_DIR = path.resolve(ROOT, args.in || "./storage-export");
const BUCKETS = (args.buckets || "question-media,avatars").split(",").map((s) => s.trim()).filter(Boolean);
const DRY_RUN = args["dry-run"] === true || args["dry-run"] === "true";
const UPSERT = args.upsert !== "false";
const CONCURRENCY = Number(args.concurrency || 5);

if (!DEST_URL || !DEST_KEY) {
  console.error("✖ Missing dest credentials.");
  console.error("  Set DEST_SUPABASE_URL + DEST_SUPABASE_SERVICE_ROLE_KEY (service_role required for avatars RLS).");
  console.error(`  Current: URL=${DEST_URL ? "ok" : "MISSING"} KEY=${DEST_KEY ? "ok(BUT must be service_role)" : "MISSING"}`);
  process.exit(1);
}

if (!existsSync(IN_DIR)) {
  console.error(`✖ Input dir not found: ${IN_DIR} - run export-storage.mjs first`);
  process.exit(1);
}

console.log(`→ Dest: ${DEST_URL}`);
console.log(`→ In: ${IN_DIR}`);
console.log(`→ Buckets: ${BUCKETS.join(", ")} ${DRY_RUN ? "(dry-run)" : ""}`);

const supabase = createClient(DEST_URL, DEST_KEY);

function walkFiles(dir, base = "") {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "manifest.json") continue;
    const full = path.join(dir, entry);
    const rel = base ? path.join(base, entry) : entry;
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walkFiles(full, rel));
    else out.push(rel);
  }
  return out;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".mp4": "video/mp4", ".pdf": "application/pdf", ".json": "application/json",
  };
  return map[ext] || "application/octet-stream";
}

async function ensureBucket(bucket) {
  // Check exists
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.warn(`  ⚠ listBuckets failed: ${listErr.message} (will try upload anyway)`);
    return;
  }
  if (buckets.find((b) => b.id === bucket || b.name === bucket)) {
    console.log(`  Bucket exists: ${bucket}`);
    return;
  }
  console.log(`  Creating bucket: ${bucket} (public=true)`);
  if (DRY_RUN) return;
  const { error } = await supabase.storage.createBucket(bucket, { public: true });
  if (error) console.error(`  ✖ createBucket ${bucket}: ${error.message}`);
  else console.log(`  ✓ Created ${bucket}`);
}

let totalOk = 0;
let totalFail = 0;

for (const bucket of BUCKETS) {
  const bucketDir = path.join(IN_DIR, bucket);
  if (!existsSync(bucketDir)) {
    console.log(`\n● Skipping ${bucket} - no local dir ${bucketDir}`);
    continue;
  }
  console.log(`\n● Importing ${bucket}/ ...`);
  await ensureBucket(bucket);

  const files = walkFiles(bucketDir);
  console.log(`  Found ${files.length} local files`);
  if (files.length === 0) continue;
  if (DRY_RUN) {
    for (const f of files.slice(0, 10)) console.log(`    would upload: ${f}`);
    if (files.length > 10) console.log(`    ... +${files.length - 10} more`);
    continue;
  }

  let done = 0;
  let failed = 0;
  const queue = [...files];

  const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
    while (queue.length) {
      const rel = queue.shift();
      const fullPath = path.join(bucketDir, rel);
      // Normalize to posix for storage key (images/foo.jpg not windows \)
      const storageKey = rel.split(path.sep).join(path.posix.sep);
      try {
        const buffer = await readFile(fullPath);
        const blob = new Blob([buffer], { type: contentTypeFor(storageKey) });
        const { error } = await supabase.storage.from(bucket).upload(storageKey, blob, {
          upsert: UPSERT,
          contentType: contentTypeFor(storageKey),
        });
        if (error) throw new Error(error.message);
        done++;
        totalOk++;
        if (done % 10 === 0 || done === files.length) {
          console.log(`  [${bucket}] ${done}/${files.length} uploaded`);
        }
      } catch (e) {
        failed++;
        totalFail++;
        console.error(`  ✖ ${bucket}/${storageKey}: ${e.message}`);
      }
    }
  });
  await Promise.all(workers);
  console.log(`  → ${bucket}: ${done} ok, ${failed} failed`);
}

console.log(`\n✓ Import done: ${totalOk} ok, ${totalFail} failed`);
if (!DRY_RUN && totalOk > 0) {
  console.log(`\nNext: rewrite DB URLs if you exported DB dump:`);
  console.log(`  UPDATE questions SET image_url = replace(image_url, 'dvlzxznutlkqjlxvjxvv.supabase.co', '${new URL(DEST_URL).host}');`);
  console.log(`  UPDATE questions SET audio_url = replace(audio_url, 'dvlzxznutlkqjlxvjxvv.supabase.co', '${new URL(DEST_URL).host}');`);
  console.log(`  UPDATE profiles SET avatar_url = replace(avatar_url, 'dvlzxznutlkqjlxvjxvv.supabase.co', '${new URL(DEST_URL).host}');`);
}
if (totalFail > 0) process.exitCode = 1;
