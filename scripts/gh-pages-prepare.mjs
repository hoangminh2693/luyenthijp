#!/usr/bin/env node
/**
 * GitHub Pages deploy-prep script (manual build + upload flow).
 *
 * After `vite build` has produced `dist/`, this script adds the files that
 * GitHub Pages needs but Vite doesn't generate by default:
 *
 *   1. 404.html  – a copy of index.html so BrowserRouter deep-links
 *                  (e.g. https://luyenthi.jp/quiz/jlpt-n5) work on GitHub Pages,
 *                  which has no SPA fallback for unknown paths.
 *   2. CNAME     – declares the custom domain (GitHub Pages uses this when the
 *                  gh-pages branch is published, and it also gets picked up when
 *                  you set the domain in repo Settings → Pages).
 *                  SKIPPED when GH_PAGES_NO_CNAME=1 (preview-only deployments:
 *                  keeps https://<user>.github.io/<repo>/ from redirecting to the
 *                  custom domain before its DNS points at GitHub Pages).
 *   3. .nojekyll – disables Jekyll processing so all static assets pass through
 *                  untouched.
 *
 * Usage:
 *   node scripts/gh-pages-prepare.mjs [domain]
 *   (default domain is read from CUSTOM_DOMAIN env or falls back to luyenthi.jp;
 *    set GH_PAGES_NO_CNAME=1 to skip the CNAME file)
 */
import { cpSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const defaultDomain = "luyenthi.jp";
const customDomain = process.env.CUSTOM_DOMAIN || process.argv[2] || defaultDomain;
const skipCname = process.env.GH_PAGES_NO_CNAME === "1";

if (!existsSync(path.join(distDir, "index.html"))) {
  console.error(
    `✖ dist/index.html not found. Run "npm run build" (or npm run build:pages) first.`
  );
  process.exit(1);
}

// 1. SPA fallback: unknown paths on GitHub Pages are served this file.
cpSync(path.join(distDir, "index.html"), path.join(distDir, "404.html"));

// 3. Disable Jekyll.
writeFileSync(path.join(distDir, ".nojekyll"), "");

console.log("✓ dist prepared for GitHub Pages:");
console.log(`  - dist/404.html   (SPA fallback)`);
console.log(`  - dist/.nojekyll  (Jekyll disabled)`);

if (!skipCname) {
  // 2. Custom domain declaration.
  writeFileSync(path.join(distDir, "CNAME"), `${customDomain}\n`);
  console.log(`  - dist/CNAME      → ${customDomain}`);
} else {
  console.log(`  - dist/CNAME      → skipped (preview mode: no custom domain)`);
}