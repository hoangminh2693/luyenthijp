#!/usr/bin/env node
/**
 * export-storage.mjs - Bulk export Lovable Cloud storage buckets to local disk.
 *
 * Buckets: `avatars` (public) + `question-media` (public, paths images/*, audios/*)
 *   defined in supabase/migrations/20260111140318_*.sql / 20260120130908_*.sql
 *   used in src/components/admin/MediaUpload.tsx:42, src/pages/ProfilePage.tsx:145
 *
 * Output: ./storage-export/<bucket>/<path> + manifest.json
 *
 * Usage:
 *   # 1. Set source creds (Lovable Cloud). Falls back to .env VITE_SUPABASE_URL/PUBLISHABLE_KEY
 *   SOURCE_SUPABASE_URL="https://dvlzxznutlkqjlxvjxvv.supabase.co" \
 *   SOURCE_SUPABASE_KEY="<anon-or-service_role>" \
 *   node scripts/export-storage.mjs
 *
 *   # Custom buckets / output dir:
 *   node scripts/export-storage.mjs --buckets=question-media,avatars --out=./storage-export
 *
 * Requires: @supabase/supabase-js (already in package.json:45)
 * Needs anon key for public buckets, service_role for private/RLS-restricted files.
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// --- Load .env fallback if env vars not set (no dotenv dependency) ---
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

// --- CLI args ---
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const SOURCE_URL =
  env("SOURCE_SUPABASE_URL") ||
  env("VITE_SUPABASE_URL") ||
  env("SUPABASE_URL") ||
  "";
const SOURCE_KEY =
  env("SOURCE_SUPABASE_KEY") ||
  env("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  env("SUPABASE_PUBLISHABLE_KEY") ||
  "";

const BUCKETS = (args.buckets || "question-media,avatars").split(",").map((s) => s.trim()).filter(Boolean);
const OUT_DIR = path.resolve(ROOT, args.out || "./storage-export");
const CONCURRENCY = Number(args.concurrency || 5);

if (!SOURCE_URL || !SOURCE_KEY) {
  console.error("✖ Missing source credentials.");
  console.error("  Set SOURCE_SUPABASE_URL + SOURCE_SUPABASE_KEY, or ensure .env has VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  console.error(`  Current: URL=${SOURCE_URL ? "ok" : "MISSING"} KEY=${SOURCE_KEY ? "ok" : "MISSING"}`);
  process.exit(1);
}

console.log(`→ Source: ${SOURCE_URL}`);
console.log(`→ Buckets: ${BUCKETS.join(", ")}`);
console.log(`→ Out: ${OUT_DIR}`);

const supabase = createClient(SOURCE_URL, SOURCE_KEY);

async function listRecursive(bucket, prefix = "") {
  const files = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      // Empty folder or bucket not found - treat as empty
      if (error.message?.includes("not found") || error.message?.includes("Bucket not found")) {
        console.warn(`  ⚠ Bucket/prefix not found: ${bucket}/${prefix} - ${error.message}`);
        break;
      }
      throw new Error(`list ${bucket}/${prefix} offset=${offset}: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const entry of data) {
      // Supabase marks folders by null metadata / id
      const isFolder = !entry.metadata && !entry.id;
      // Fallback: extension-less entries with no metadata are folders
      const looksLikeFolder = isFolder || (entry.metadata === null && !entry.name.includes("."));
      if (looksLikeFolder) {
        const subPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Skip .emptyFolderPlaceholder
        if (entry.name === ".emptyFolderPlaceholder") continue;
        const subFiles = await listRecursive(bucket, subPrefix);
        files.push(...subFiles);
      } else {
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        files.push(fullPath);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }
  return files;
}

async function downloadWithConcurrency(bucket, files) {
  let done = 0;
  let failed = 0;
  const queue = [...files];
  const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
    while (queue.length) {
      const filePath = queue.shift();
      const localPath = path.join(OUT_DIR, bucket, filePath);
      try {
        const { data, error } = await supabase.storage.from(bucket).download(filePath);
        if (error) throw new Error(error.message);
        const buffer = Buffer.from(await data.arrayBuffer());
        await mkdir(path.dirname(localPath), { recursive: true });
        await writeFile(localPath, buffer);
        done++;
        if (done % 10 === 0 || done === files.length) {
          console.log(`  [${bucket}] ${done}/${files.length} downloaded`);
        }
      } catch (e) {
        failed++;
        console.error(`  ✖ ${bucket}/${filePath}: ${e.message}`);
      }
    }
  });
  await Promise.all(workers);
  return { done, failed };
}

// Main
let totalFiles = 0;
let totalFailed = 0;
const manifest = { source: SOURCE_URL, exportedAt: new Date().toISOString(), buckets: {} };

for (const bucket of BUCKETS) {
  console.log(`\n● Listing ${bucket}/ ...`);
  const files = await listRecursive(bucket, "");
  console.log(`  Found ${files.length} files`);
  manifest.buckets[bucket] = { count: files.length, files: [] };

  if (files.length === 0) {
    // Ensure bucket dir exists even if empty
    mkdirSync(path.join(OUT_DIR, bucket), { recursive: true });
    continue;
  }

  const { done, failed } = await downloadWithConcurrency(bucket, files);
  totalFiles += done;
  totalFailed += failed;
  manifest.buckets[bucket].downloaded = done;
  manifest.buckets[bucket].failed = failed;
  manifest.buckets[bucket].files = files;

  // Add public URLs for reference (useful for DB URL rewriting)
  manifest.buckets[bucket].publicUrlBase = `${SOURCE_URL}/storage/v1/object/public/${bucket}/`;
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`\n✓ Done: ${totalFiles} files exported to ${OUT_DIR}, ${totalFailed} failed`);
console.log(`  Manifest: ${path.join(OUT_DIR, "manifest.json")}`);
if (totalFailed > 0) process.exitCode = 1;
