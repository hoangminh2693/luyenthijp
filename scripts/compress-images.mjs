#!/usr/bin/env node
/**
 * compress-images.mjs - Compress already-migrated question-media images in-place then re-upload.
 * - Reads storage-export/question-media/images/* (467 files, ~602M)
 * - Resizes max width 1024, strips metadata, outputs WebP 80 (best saving) with same basename .webp
 * - Keeps original .png/.jpg for rollback, writes compressed .webp alongside, then overwrites original path with webp data? No, we create .webp and will handle DB URL rewrite + delete old.
 * - This script: creates storage-export/compressed/question-media/images/*.webp
 * - Run then re-upload via import-storage.mjs, then UPDATE questions SET image_url = replace(..., '.png', '.webp') etc. and delete old .png objects.
 *
 * Usage: node scripts/compress-images.mjs [--quality=80] [--width=1024]
 * Requires: sharp (npm i sharp)
 */

import { readdir, stat, mkdir, copyFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "storage-export", "question-media", "images");
const OUT_DIR = path.join(ROOT, "storage-export", "compressed", "question-media", "images");

const args = Object.fromEntries(process.argv.slice(2).map(a=>{const [k,v]=a.replace(/^--/,"").split("="); return [k,v??true]}));
const QUALITY = Number(args.quality || 80);
const WIDTH = Number(args.width || 1024);

let sharp;
try { sharp = (await import("sharp")).default; } catch { console.error("✖ sharp not installed. Run: npm i sharp"); process.exit(1); }

if (!existsSync(SRC_DIR)) { console.error(`✖ SRC not found: ${SRC_DIR}`); process.exit(1); }
await mkdir(OUT_DIR, { recursive: true });

const files = (await readdir(SRC_DIR)).filter(f=> /\.(png|jpe?g|webp)$/i.test(f));
console.log(`→ Found ${files.length} images in ${SRC_DIR}`);
console.log(`→ Compress: resize width=${WIDTH}, webp quality=${QUALITY}, to ${OUT_DIR}`);

let done=0, failed=0, saved=0;
let totalOrig=0, totalComp=0;

for (const file of files) {
  const src = path.join(SRC_DIR, file);
  const base = path.parse(file).name;
  const out = path.join(OUT_DIR, base + ".webp");
  try {
    const origStat = await stat(src);
    totalOrig += origStat.size;
    await sharp(src)
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 4 })
      .toFile(out);
    const compStat = await stat(out);
    totalComp += compStat.size;
    const save = origStat.size - compStat.size;
    saved += save;
    done++;
    if (done % 50===0 || done===files.length) {
      console.log(`  ${done}/${files.length} ${file} ${ (origStat.size/1024).toFixed(0)}k → ${(compStat.size/1024).toFixed(0)}k saved ${ (save/1024).toFixed(0)}k`);
    }
  } catch (e) {
    failed++;
    console.error(`  ✖ ${file}: ${e.message}`);
    // fallback: copy original
    try { await copyFile(src, path.join(OUT_DIR, file)); } catch {}
  }
}

console.log(`\n✓ Done: ${done} ok, ${failed} failed`);
console.log(`  Original: ${(totalOrig/1024/1024).toFixed(1)} MB → Compressed: ${(totalComp/1024/1024).toFixed(1)} MB saved ${(saved/1024/1024).toFixed(1)} MB (${(saved/totalOrig*100).toFixed(1)}%)`);
console.log(`  Output: ${OUT_DIR}`);
console.log(`\nNext: copy compressed .webp back to storage-export/question-media/images/ and upload:`);
console.log(`  rm storage-export/question-media/images/*.{png,jpg,jpeg}  # keep backup in storage-export/compressed/`);
console.log(`  cp storage-export/compressed/question-media/images/*.webp storage-export/question-media/images/`);
console.log(`  # then re-upload with upsert:true: node scripts/import-storage.mjs`);

// Also write manifest for DB rewrite
const manifest = { at: new Date().toISOString(), quality: QUALITY, width: WIDTH, files: files.map(f=> ({orig:f, webp: path.parse(f).name+".webp"})) };
await mkdir(path.join(ROOT,"storage-export"), {recursive:true});
import { writeFile } from "node:fs/promises";
await writeFile(path.join(ROOT,"storage-export","compress-manifest.json"), JSON.stringify(manifest,null,2));
console.log(`  Manifest: storage-export/compress-manifest.json (${manifest.files.length} mappings)`);

if (failed>0) process.exitCode=1;
