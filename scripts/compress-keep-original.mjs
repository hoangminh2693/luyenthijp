#!/usr/bin/env node
/**
 * compress-keep-original.mjs - Keep original resolution + extension, just optimize.
 * - Reads storage-export/original-images/* (467 png 601M)
 * - Writes optimized same name/ext to storage-export/question-media/images/
 * - png: compressionLevel 9, palette true, no resize, strip metadata
 * - jpg/jpeg: mozjpeg quality 80
 * - webp: quality 80 (if any)
 * Usage: node scripts/compress-keep-original.mjs
 */
import { readdir, stat, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "storage-export", "original-images");
const OUT = path.join(ROOT, "storage-export", "question-media", "images");
let sharp; try{ sharp=(await import("sharp")).default }catch{ console.error("need sharp: npm i sharp"); process.exit(1);}
if(!existsSync(SRC)){console.error("SRC missing",SRC);process.exit(1);}
await mkdir(OUT,{recursive:true});
const files = (await readdir(SRC)).filter(f=>/\.(png|jpe?g|webp)$/i.test(f));
console.log(`→ Found ${files.length} in ${SRC} - keep resolution+ext, optimize`);
let done=0,failed=0, origTotal=0, compTotal=0;
for(const f of files){
  const src=path.join(SRC,f);
  const out=path.join(OUT,f);
  try{
    const s=await stat(src); origTotal+=s.size;
    const ext=path.extname(f).toLowerCase();
    let pipeline=sharp(src).withMetadata(false);
    if(ext===".png") pipeline= pipeline.png({compressionLevel:9, palette:true, effort:10});
    else if(ext===".jpg"||ext===".jpeg") pipeline= pipeline.jpeg({quality:80, mozjpeg:true});
    else if(ext===".webp") pipeline= pipeline.webp({quality:80});
    await pipeline.toFile(out);
    const c=await stat(out); compTotal+=c.size;
    done++;
    if(done%50===0||done===files.length) console.log(` ${done}/${files.length} ${f} ${(s.size/1024).toFixed(0)}k→${(c.size/1024).toFixed(0)}k`);
  }catch(e){ failed++; console.error(` ✖ ${f}: ${e.message}`); }
}
console.log(`\n✓ ${done} ok, ${failed} failed`);
console.log(` Original: ${(origTotal/1024/1024).toFixed(1)}MB → Optimized: ${(compTotal/1024/1024).toFixed(1)}MB saved ${((origTotal-compTotal)/1024/1024).toFixed(1)}MB (${((origTotal-compTotal)/origTotal*100).toFixed(1)}%)`);
console.log(` Out: ${OUT} - ready for upsert import, DB needs NO rewrite (same .png paths, rollback safe)`);
