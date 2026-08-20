# Deploy to GitHub Pages (Manual build + upload)

This project is a Vite + React SPA that also depends on **Supabase** for auth, data,
and blog content. GitHub Pages can only serve static files, which is fine — the app
is fully client-side. This guide covers the manual build + push-to-`gh-pages` flow
you chose, using the custom domain **luyenthi.jp**.

> **Prereq already done:** `scripts/gh-pages-prepare.mjs` was added and wired into
> the `build:pages` npm script. Building produces `dist/` with three extra files
> GitHub Pages needs:
> - `404.html` — SPA fallback so deep links like `/quiz/jlpt-n5` render correctly
> - `CNAME` → `luyenthi.jp` — declares the custom domain
> - `.nojekyll` — disables Jekyll processing

---

## Step 1 — Create the GitHub repo and push the source

```sh
# from the project folder
git init
git add -A
git commit -m "Initial commit"

# creates a public repo named "luyen-de-de-dang" under your account
gh repo create luyen-de-de-dang --public --source=. --push
```

> **Note on `.env`:** the file contains only the Supabase *anon/publishable* key,
> which is **designed to be public** — that's fine to commit. If you later add
> secrets (e.g. a service role key) to `.env`, add it to `.gitignore` first.

## Step 2 — Build the deployable folder

```sh
npm run build:pages
```

This runs `vite build` then adds `404.html`, `CNAME`, and `.nojekyll` into `dist/`.
You can re-run it any time after making changes.

## Step 3 — Publish `dist/` to the `gh-pages` branch

The source branch should keep only source code (`dist/` is already git-ignored).
The **`gh-pages` branch holds only the compiled site**. Simplest method:

```sh
git subtree push --prefix dist origin gh-pages
```

If `git subtree` complains (history differences), use a temp worktree instead:

```sh
# after npm run build:pages
git worktree add --detach gh-pages-tmp
rm -rf gh-pages-tmp/*
cp -R dist/. gh-pages-tmp/
cd gh-pages-tmp
git add -A
git commit -m "Deploy to GitHub Pages"
git push origin HEAD:gh-pages
cd ..
git worktree remove gh-pages-tmp
git branch -D gh-pages   # optional cleanup of the local branch
```

## Step 4 — Enable GitHub Pages

1. Go to **repo → Settings → Pages**
2. Under **Source**, choose **Deploy from a branch**
3. Branch: `gh-pages` / `/(root)` → **Save**
4. In **Custom domain**, enter `luyenthi.jp` → **Save**
   (the `CNAME` file in your build also declares it, so this just confirms it)

## Step 5 — DNS for the custom domain

At your domain registrar (for luyenthi.jp), point the domain at GitHub Pages.
GitHub Pages serves on port 443 with HTTPS enabled automatically; TLS may take a
few minutes to provision after DNS propagates.

| Type  | Name/Host | Value / Target            | Notes                      |
|-------|-----------|---------------------------|----------------------------|
| A     | @         | 185.199.108.153           |                            |
| A     | @         | 185.199.109.153           | GitHub Pages IPs — add all |
| A     | @         | 185.199.110.153           | four for redundancy        |
| A     | @         | 185.199.111.153           |                            |
| CNAME | www       | your-username.github.io    | (if you use www)           |

## Step 6 — Supabase: allow the new origin

The app signs in with email/password and Google OAuth and redirects back to
`${window.location.origin}/`. Supabase validates that origin, so add the
GitHub Pages origin to the allow-list or sign-up/Google sign-in will be blocked:

1. **Supabase Dashboard → Authentication → URL Configuration**
2. **Site URL:** `https://luyenthi.jp`
3. **Redirect URLs:** add `https://luyenthi.jp/**`
4. If the app should work under the preview `https://<user>.github.io/<repo>/` URL
   too, add `https://<user>.github.io/<repo>/**` as an additional redirect URL.
5. Save. (Existing sessions keep working; auth flows from GitHub Pages will now pass.)

**Google OAuth note:** the Google Cloud Console's authorized redirect URI points at
`https://dvlzxznutlkqjlxvjxvv.supabase.co/auth/v1/callback`, not your website — so
it does **not** change when you move hosting. Only the Supabase redirect list above
needs the new origin.

**CORS note:** the Supabase REST API doesn't restrict browser origins; data access
is controlled by **RLS policies** (your project already uses a public `questions_safe`
view for visitors vs. the full `questions` table for admins). Storage media is served
via public URLs. So no CORS changes are needed for this deployment. If you ever call
an Edge Function from the browser, set `verify_jwt = false` and return proper CORS
headers in that function.

## Step 7 — Verify

- `https://luyenthi.jp` loads and assets resolve (no mixed content).
- `https://luyenthi.jp/subjects` and a few deep links render (the `404.html`
  fallback kicks in; the network tab will show a 404 status for those pages —
  that's expected and harmless for a SPA, though it means SEO crawlers won't index
  deep routes without extra `<h1>Home</h1>` style work).
- Sign in / sign up flow works end-to-end.
- `https://luyenthi.jp/sitemap.xml` and `https://luyenthi.jp/ads.txt` still resolve.

## Redoing a deploy later

```sh
# make code changes…
npm run build:pages
git subtree push --prefix dist origin gh-pages   # or the worktree method above
```

No GitHub Action is configured — every deploy is exactly this manual step.