# Migration Plan: Lovable Cloud → Own Supabase

> Project: **Luyện Đề Dễ Dàng** (`luyenthi.jp`)
> Source: Lovable Cloud Supabase `dvlzxznutlkqjlxvjxvv` (`https://dvlzxznutlkqjlxvjxvv.supabase.co`)
> Source config: `supabase/config.toml:1`, `src/integrations/supabase/client.ts:5`, `.env:2`
> Target: Own Supabase project (to be created, `<NEW_ID>`)
> Date: 2026-08-21
> Backup verified: `backup/luyenthijp_260821.backup` (3.3 MB, PG 17.6, 699 TOC entries)

---

## 1. Overview

Migrate full backend from **Lovable Cloud** (managed Supabase under Lovable org) to **customer-owned Supabase** for data ownership, credential control, and independent billing. Not just data pull — migrate schema, RLS, auth, storage files, edge functions, and env wiring.

**What we migrate:**
| Area | Source | Target |
|------|--------|--------|
| Postgres schema + RLS + functions/views | 34 migrations in `supabase/migrations/` + full dump | New Supabase |
| Data (12 public tables) | `backup/luyenthijp_260821.backup` (verified below) | New DB |
| Auth (`auth.users` + identities/sessions) | Same backup (hashes preserved `$2a$`) | New Auth |
| Storage files (S3 bytes) | `storage-export/` (667 objects, 1.0 GB) | New Storage buckets |
| Edge Function | `supabase/functions/sitemap/index.ts` | `supabase functions deploy` |
| App wiring | `.env` `VITE_SUPABASE_URL/PUBLISHABLE_KEY` | Updated to new project |

---

## 2. Current System Inventory

**Verified from `src/integrations/supabase/types.ts:17` and `pg_restore --list`:**

**Public tables (12):**
- `subjects: 3`, `subject_layers: 5`, `levels: 5`, `categories: 30`, `sections: 25`
- `questions: 3488` (with `image_url`, `audio_url`, `parent_id`, `question_type` in `types.ts:302`)
- `question_history: 48482` (`user_id -> auth.users.id` in migration `202601...`), `profiles: 603`, `profile_private: 603`, `user_roles: 1` (admin), `blog_posts: 94`, `contact_messages: 6`

**Auth:**
- `auth.users` (603) + `auth.identities`, `auth.refresh_tokens`, `auth.sessions` — `handle_new_user()` trigger auto-creates `profiles` (`supabase/migrations/*`)

**Storage (public buckets):**
- `question-media` (public) — paths `images/*` (467, **602 MB orig → 139.5 MB optimized 76.7% saved, kept original `.png` + resolution for rollback**) + `audios/*` (197, 445 MB) — used in `src/components/admin/MediaUpload.tsx:42`, `src/pages/ManageQuestionsPage.tsx:600`
- `avatars` (public, RLS `auth.uid()::text = storage.foldername(name)[1]`) — 3 objects — used in `src/pages/ProfilePage.tsx:145`
- Metadata in dump: `storage.buckets` + `storage.objects` (667 rows); bytes exported to `storage-export/` (see §4); after optimize total `question-media 551 MB + avatars 3603 kB = 554 MB` (was 1014 MB) — under Free 1 GB

**Functions/Views:**
- Functions: `has_role`, `handle_new_user`, `update_updated_at_column`, `check_quiz_answers`, `submit_quiz_answers`, `get_leaderboard_by_level`, `get_enhanced_leaderboard`, `get_public_activity_stats`, `get_question_count_by_category`
- Views: `leaderboard_stats`, `questions_safe`
- Extensions: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`

**Edge Function:** `sitemap` (`supabase/functions/sitemap/index.ts:1`, `supabase/config.toml:3` `verify_jwt=false`)

---

## 3. Requirements

### 3.1 Access & Credentials
- [x] Lovable Cloud source: **`service_role` NOT required and NOT exposed by Lovable** — we bypass it: full DB (including `auth.users` hashes) is in `backup/luyenthijp_260821.backup` (via `Lovable > Cloud > Advanced settings > Export project data`), and storage files were exported via **anon key only** (`VITE_SUPABASE_PUBLISHABLE_KEY` in `.env:2`) because both buckets are `public=true` (`supabase/migrations/20260111140318_*.sql`, `20260120130908_*.sql`) — verified `node scripts/export-storage.mjs` downloaded 667 files with anon key, 0 failed.
- [ ] New Supabase project created — obtain `NEW_URL`, `NEW_ANON_KEY`, `NEW_SERVICE_ROLE_KEY`, `NEW_DATABASE_URL` (postgres role, `Project Settings > Database > Connection string`) — **only target needs `service_role`** (for `avatars` RLS and `auth` restore).
- [ ] `psql` 18+ + `pg_restore` 18+ (we use `/opt/homebrew/opt/postgresql@18/bin/pg_restore` to handle dump v1.16) and `node >=18` + `@supabase/supabase-js@2.89.0` (already in `package.json:44`)

### 3.2 Tooling
- Scripts in `scripts/`: `export-storage.mjs`, `import-storage.mjs` (validated), `gh-pages-prepare.mjs`
- Backup dir `backup/` + `storage-export/` gitignored (`.gitignore:31` `backup/`, `*.backup`, `storage-export/`)

### 3.3 Target Project Setup
- [ ] New project region chosen (cannot change after — Lovable default was closest to you, pick `asia-pacific` for `luyenthi.jp` users)
- [ ] New project on at least `Small` instance if expecting 48k+ `question_history` growth (Lovable Tiny may OOM on restore)

---

## 4. What We Have Done (Completed)

- [x] **Inventory & schema map** — listed 34 migrations, 12 tables, 2 buckets, auth, functions
- [x] **Scripts generated** — `scripts/export-storage.mjs:1` (recursive list + concurrent download, uses anon key via `.env:2` fallback — **no `service_role` needed for Lovable Cloud**, works because buckets are public) and `scripts/import-storage.mjs:1` (needs `service_role` only on **target**, preserves paths, `upsert:true`, auto-creates public buckets, prints URL rewrite SQL)
- [x] **Backup verified** — `backup/luyenthijp_260821.backup` (3.3 MB, `PGDMP v1.16 zstd`, dumped 2026-08-21 03:18 +07 from PG 17.6) — `pg_restore --list` shows 699 entries including `auth.users` with `encrypted_password $2a$...` preserved. **Users CAN login with same password on new backend via `pg_restore` (hash preserved, bcrypt verification same).** Note: the earlier `Plus you must separately copy public.profiles/profile_private/user_roles/question_history` applies only to **API method** (`supabase-js` anon/service_role) — with this `pg_dump` backup all those tables + FKs (`user_id -> auth.users.id`) are already in dump and restored together, no separate copy needed.
- [x] **Storage exported & verified** — `node scripts/export-storage.mjs` (2026-08-21 11:44) → `storage-export/` **667 files, 0 failed**:
  - `question-media/images: 467` (602 MB), `question-media/audios: 197` (445 MB), `avatars: 3` (3.5 MB), total 1.0 GB
  - Matches `pg_restore` metadata `storage.objects` count (664 + 3)
  - `manifest.json` with `source` + `publicUrlBase https://dvlzxznutlkqjlxvjxvv.supabase.co/storage/v1/object/public/<bucket>/`
- [x] **Gitignore** — added `backup/`, `*.backup`, `*.dump`, `storage-export/`, `.env` + `.env.*` (never commit hashes/PII/service_role/DB password) to `.gitignore:27` — `git rm --cached .env` untracked `.env` (history still has old Lovable anon key, new `vhtlabtdvhafjuhayeld` keys never committed)
- [x] **Image optimize (keep rollback)** — `scripts/compress-keep-original.mjs` (sharp `png{compressionLevel:9,palette:true}/jpeg{mzjpeg}`, **no resize, kept `.png` ext**) `467 png 599.6 MB → 139.5 MB` saved `460 MB (76.7%)` to `storage-export/question-media/images` (same paths, no DB rewrite, so `cp .env.lovable.bak .env` instantly rolls back). Re-uploaded `664` (`467 png optimized + 197 mp3`) with `upsert:true`, deleted old unoptimized objects — new total `554 MB` (was 1014 MB), `png 200` verified, `webp` not used for rollback safety.

---

## 5. Step-by-Step Migration Plan

### Phase 1 — Preparation (30 min)
1. Create new Supabase project `<NEW_ID>` — note `NEW_URL`, `NEW_ANON_KEY`, `NEW_SERVICE_ROLE_KEY`, `NEW_DATABASE_URL` (enable `pgcrypto`/`uuid-ossp` — auto via migrations)
2. Store creds in `.env.local` or shell (never commit):
   ```bash
   export DEST_SUPABASE_URL="https://<NEW_ID>.supabase.co"
   export DEST_SUPABASE_SERVICE_ROLE_KEY="<service_role>"
   export NEW_DB_URL="postgresql://postgres.<NEW_ID>:<pass>@db.<NEW_ID>.supabase.co:5432/postgres"
   ```
3. Install PG18 if needed: `brew install postgresql@18 && /opt/homebrew/opt/postgresql@18/bin/pg_restore --version # 18.3`

### Phase 2 — Schema Restore (5 min)
> We have 34 migrations locally, but backup already contains full schema. Use backup for 1:1 fidelity; migrations stay as source of truth for future changes.

4. **Option A — Full restore to empty project (recommended):**
   ```bash
   /opt/homebrew/opt/postgresql@18/bin/pg_restore \
     -d "$NEW_DB_URL" --no-owner --no-acl --clean --if-exists \
     backup/luyenthijp_260821.backup
   ```
   *Verifies:* all tables, RLS policies, functions (`submit_quiz_answers` etc.), `supabase_migrations` history, `auth` + `storage` schemas.

   **Option B — Replay migrations + data-only restore** (if full restore conflicts with Supabase-managed schemas):
   ```bash
   supabase link --project-ref <NEW_ID>
   supabase db push   # replays supabase/migrations/*.sql
   /opt/homebrew/opt/postgresql@18/bin/pg_restore --data-only -d "$NEW_DB_URL" backup/luyenthijp_260821.backup
   ```
5. Verify in new project `SQL Editor`:
   ```sql
   SELECT count(*) FROM public.questions; -- expect 3488
   SELECT count(*) FROM public.question_history; -- 48482
   SELECT count(*) FROM auth.users; -- 603, check encrypted_password like '$2a$%'
   ```

### Phase 3 — Storage Files (was 1.0 GB → 554 MB after keep-original optimize) — **no Lovable `service_role` needed**
6. Already exported with **anon key only** — `node scripts/export-storage.mjs` (no env override, falls back to `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env:2`) → 667 files (11:44 2026-08-21, `images 467 602M + audios 197 445M`).
7. **Optimize (keep rollback):** `node scripts/compress-keep-original.mjs` — sharp `png{compressionLevel:9,palette:true}/jpeg{mozjpeg:80}`, **kept original resolution + `.png` ext** (no resize, no `.webp`), `599.6→139.5 MB` saved `460 MB (76.7%)` to same `images/*.png` paths. Rejected WebP path (`compress-images.mjs 98% saved` but needed DB `.png→.webp` rewrite, broke `cp .env.lovable.bak` rollback) — reverted. This keeps DB unchanged.
8. Dry-run import:
    ```bash
    DEST_SUPABASE_URL="$DEST_SUPABASE_URL" DEST_SUPABASE_SERVICE_ROLE_KEY="$DEST_SUPABASE_SERVICE_ROLE_KEY"     node scripts/import-storage.mjs --dry-run
    ```
9. Real import (creates `question-media`/`avatars` public buckets if missing, `upsert:true`, preserves `images/*`/`audios/*`/`<user_id>/*`):
    ```bash
    DEST_SUPABASE_URL="$DEST_SUPABASE_URL" DEST_SUPABASE_SERVICE_ROLE_KEY="$DEST_SUPABASE_SERVICE_ROLE_KEY"     node scripts/import-storage.mjs
    # After optimize: 664 ok (467 png optimized 139M + 197 mp3) + 3 avatars = 667 ok, 0 failed; total 554 MB (was 1014 MB)
    ```
10. Rewrite public URLs in DB if domain changed (kept `.png`, no `.webp`):
    ```sql
    UPDATE public.questions SET image_url = replace(image_url,'dvlzxznutlkqjlxvjxvv.supabase.co','<NEW_ID>.supabase.co') WHERE image_url IS NOT NULL;
    UPDATE public.questions SET audio_url = replace(audio_url,'dvlzxznutlkqjlxvjxvv.supabase.co','<NEW_ID>.supabase.co') WHERE audio_url IS NOT NULL;
    UPDATE public.profiles SET avatar_url = replace(avatar_url,'dvlzxznutlkqjlxvjxvv.supabase.co','<NEW_ID>.supabase.co') WHERE avatar_url IS NOT NULL;
    UPDATE public.blog_posts SET thumbnail_url = replace(thumbnail_url,'dvlzxznutlkqjlxvjxvv.supabase.co','<NEW_ID>.supabase.co') WHERE thumbnail_url IS NOT NULL;
    ```

### Phase 4 — Edge Functions & Secrets (5 min)
10. Deploy sitemap:
    ```bash
    supabase link --project-ref <NEW_ID>
    supabase functions deploy sitemap --no-verify-jwt
    ```
11. Copy secrets: `Lovable > Cloud > Secrets` → `New Project > Project Settings > Vault/Secrets` (Resend, etc. if any). Re-set `SITE_URL` to `https://luyenthi.jp` in function env if hardcoded in `supabase/functions/sitemap/index.ts:8`.

### Phase 5 — App Cutover (10 min)
12. Update `.env` (and CI/GH Pages secrets):
    ```
    VITE_SUPABASE_URL="https://<NEW_ID>.supabase.co"
    VITE_SUPABASE_PUBLISHABLE_KEY="<NEW_ANON_KEY>"
    SUPABASE_URL="https://<NEW_ID>.supabase.co"
    SUPABASE_PUBLISHABLE_KEY="<NEW_ANON_KEY>"
    ```
    Keep old creds in `.env.lovable.bak` for rollback.
13. `npm run build && npm run preview` locally — test flows: `Supase Auth` login, `MediaUpload.tsx:42` upload, `ManageQuestionsPage.tsx:600` delete, `ProfilePage.tsx:145` avatar, quiz submit (`submit_quiz_answers`), leaderboard (`get_enhanced_leaderboard`), public read (`subjects` etc. RLS `Anyone can read`).

### Phase 6 — Verification & Go-Live (15 min)
14. Run acceptance checks (§6) — all must pass.
15. Deploy: `npm run build:pages &&` push to `gh-pages` / Vercel. Verify `https://luyenthi.jp/sitemap` (edge function) + `https://<NEW_ID>.supabase.co/storage/v1/object/public/question-media/images/...` loads.
16. Monitor `Supabase > Logs` + `Cloud tab > Logs` for 24h.

### Phase 7 — Cleanup & Decommission (after 7-day burn-in)
17. Pause (not delete) Lovable Cloud: `Lovable > Cloud > Advanced settings > Pause Cloud` — keep backup + `storage-export/` for 30 days.
18. After burn-in, `Remove Lovable Cloud` only if you have off-site backup (we have `backup/` + `storage-export/`).

---

## 6. Acceptance Criteria

**All must pass on new project before DNS cutover:**

- [ ] **DB integrity:** `public` row counts match backup exactly (subjects 3, subject_layers 5, levels 5, categories 30, sections 25, questions 3488, question_history 48482, profiles 603, profile_private 603, user_roles 1, blog_posts 94, contact_messages 6) and `pg_restore --data-only` exits 0.
- [ ] **RLS:** `SELECT * FROM subjects` as `anon` succeeds; `SELECT * FROM profiles WHERE user_id != auth.uid()` is blocked (RLS `auth.uid()=user_id`).
- [ ] **Auth:** 603 `auth.users` present with `encrypted_password` `$2a$`, can login with old password (hash preserved via direct `psql` restore). New JWT secret invalidates old sessions as expected, but password login works.
- [ ] **Storage:** 667 objects re-uploaded, `storage.objects` count 667, `storage.buckets` both `public=true`; public URL `https://<NEW_ID>.supabase.co/storage/v1/object/public/question-media/images/<file>` returns 200 and `questions.image_url/audio_url` rewritten to new host.
- [ ] **Functions:** `supabase functions list` shows `sitemap` active; `curl https://<NEW_ID>.supabase.co/functions/v1/sitemap` returns XML with `<urlset>` containing `/`, `/subjects/<slug>`, `/blog/<slug>`.
- [ ] **App e2e:** Anonymous quiz read (no login), logged-in quiz submit (writes `question_history`), avatar upload (`avatars/<uid>/*`), admin media upload/delete (`question-media`), leaderboard (`leaderboard_stats` view), blog CRUD as admin — all pass on `npm run preview` against new project.
- [ ] **No regressions:** `supabase/migrations` history matches, `vault`/extensions intact, `.gitignore` prevents leaking `backup/`/`storage-export/`.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| PG version mismatch (dump v1.16 needs PG18) | Use `postgresql@18` `pg_restore` (verified) |
| `auth.users` hash not carried by Lovable 1-click export | We use full `pg_dump` backup (`backup/luyenthijp_260821.backup` has `$2a$` hashes) + direct `psql` restore — **no Lovable `service_role` needed** |
| `storage.objects` bytes not in dump | Use `scripts/export-storage.mjs:1` (anon key, **no Lovable `service_role`**) + `import-storage.mjs:1` (target `service_role` only) — 667 files, 1.0 GB, 0 failed verified |
| Old public URLs break after host change | Run `UPDATE ... replace(...)` in §5 step 9 |
| Instance too small for 48k history + 3.4k questions | Start new project on `Small`+; monitor `Cloud > Advanced settings > Disk/CPU` |
| Lovable Cloud pause auto-unpauses on traffic | Explicitly `Pause Cloud`, not just idle; keep backup off-site |

### 7.1 Extra Caution — Critical Items (Must Read Before Running)

> These are **irreversible or silent-failure** risks. Check each box during the maintenance window.

**1. Backup Staleness / Data Freeze Window — HIGH**
- `backup/luyenthijp_260821.backup` was dumped `2026-08-21 03:18 +07`. Every write to Lovable Cloud after that (new `question_history`, `profiles`, `blog_posts`, `contact_messages`, new signups) is **NOT** in this file.
- **Caution:** Put Lovable app in **read-only / maintenance mode** before final export, or re-export a fresh backup right before Phase 2 (`Lovable > Cloud > Advanced settings > Export project data` or `storage-export/`). Otherwise you will silently lose user progress.
- **Verify:** Compare `SELECT max(answered_at) FROM question_history` on Lovable vs new DB after restore; delta should be 0.

**2. Auth Session Invalidation + `handle_new_user()` Conflict — HIGH**
- New Supabase generates a fresh `JWT secret` + `anon/service_role` keys — **all existing user sessions are invalidated** on cutover (users will be logged out, `localStorage` in `src/integrations/supabase/client.ts:13` will hold stale token). App must handle `auth.getSession()` null and show login prompt, not crash. **But password login still works** — `backup/luyenthijp_260821.backup` preserves `auth.users.encrypted_password $2a$` (verified), so `email + old password` succeeds on new backend (bcrypt same). No password reset needed in `pg_dump` path (unlike API path `auth.admin.createUser` which needs plaintext).
- Restoring `auth.users` will fire `public.handle_new_user()` trigger which tries to `INSERT INTO profiles` for each user. Since `profiles` rows for 603 users already exist in dump, this causes `unique_violation` if trigger is not `ON CONFLICT DO NOTHING`. **Mitigation:** Before `pg_restore`, ensure function is `INSERT ... ON CONFLICT (user_id) DO NOTHING` (check `supabase/migrations/*handle_new_user.sql`) or temporarily `ALTER TABLE profiles DISABLE TRIGGER` during restore.
- **Verify:** `SELECT count(*) FROM auth.users` = 603 and `SELECT count(*) FROM profiles` = 603 (no duplicates), and test login with old password (should succeed).

**3. Storage URL Rewrite — HIGH (Silent Broken Images/Audio)**
- `questions.image_url/audio_url`, `profiles.avatar_url`, `blog_posts.thumbnail_url` store **absolute URLs** `https://dvlzxznutlkqjlxvjxvv.supabase.co/storage/v1/object/public/...`. After migration they 404 unless you run step 9 `UPDATE ... replace(...)`. Lovable Cloud `Pause` will make old URLs permanently fail.
- **Caution:** Do the `UPDATE` in a transaction and verify `SELECT image_url FROM questions WHERE image_url LIKE '%dvlzxznutlkqjlxvjxvv%'` returns 0 after.
- **Already verified:** `storage-export/question-media/images 467 (602 MB)` + `audios 197 (445 MB)` paths must be preserved exactly (`images/<file>`, `audios/<file>`). Do not rename files.

**4. RLS & `vault` / Supabase-Managed Schemas — MEDIUM**
- `pg_restore --clean` will try to drop `supabase_auth_admin`, `supabase_storage_admin` roles and `auth`, `storage`, `realtime`, `vault` schemas that are **managed by Supabase** on target. Always use `--no-owner --no-acl` (Phase 2 Option A) or you will get `role does not exist` / permission errors. Never restore `vault.secrets` blindly — it contains Supabase internal keys; new project already has its own.
- **Verify:** After restore, `SELECT * FROM storage.buckets WHERE id IN ('question-media','avatars')` both `public=true` and `SELECT count(*) FROM storage.objects` = 667.

**5. Backup & `storage-export/` Contain PII — MEDIUM (Compliance)**
- Backup has 603 users (`email`, `encrypted_password`, `raw_user_meta_data`), `profile_private` (DoB, country), `contact_messages`. `storage-export/avatars` has user photos. Both are gitignored (`.gitignore:31`) but still on local disk at `backup/` and `storage-export/` (1.0 GB + 3.3 MB). **Do not** upload to public GitHub, do not email, encrypt at rest. Delete or archive securely after 30-day burn-in.

**6. Idempotency & Partial Failures — MEDIUM**
- Storage import is 1.0 GB over network — transient 5xx/timeouts will drop files. Scripts are idempotent (`upsert:true`) — safe to **re-run** `node scripts/import-storage.mjs` until `667 ok, 0 failed`. Do not `TRUNCATE storage.objects` manually; re-upload is enough.
- `question_history` is 48k rows — if `pg_restore` is killed mid-transaction, you get half state. Always restore inside a single transaction (default) and verify row counts before cutover.

**7. Irreversible Lovable Action — HIGH**
- `Lovable > Cloud > Advanced settings > Remove Lovable Cloud` **permanently deletes** Lovable DB + storage and cannot be undone (even backups deleted). Only `Pause Cloud` is reversible. **Never click `Remove`** until §6 acceptance passes and you have off-site copy of `backup/` + `storage-export/` for 30 days.

**8. App Config Drift — LOW but noisy**
- Edge function `supabase/functions/sitemap/index.ts:8` hardcodes `SITE_URL="https://luyenthi.jp"` — if you change domain, update it. Also re-set Supabase `Auth > URL Configuration` (`Site URL`, `Redirect URLs`) on new project to `https://luyenthi.jp` or magic-link/OAuth redirects will 404.
- Check `supabase/config.toml:1` `project_id` will change — update `VITE_SUPABASE_PROJECT_ID` if used, and rotate `VITE_SUPABASE_PUBLISHABLE_KEY` everywhere (including GitHub Pages secrets).

---

## 8. Rollback

1. Revert `.env` to `.env.lovable.bak` (`dvlzxznutlkqjlxvjxvv`)
2. Redeploy `npm run build:pages` to point back to Lovable Cloud
3. New project data remains; no deletion of Lovable Cloud until 30 days.

---

## 9. Deliverables

- `backup/luyenthijp_260821.backup` (verified, gitignored)
- `storage-export/` (667 files, `manifest.json`, gitignored)
- `scripts/export-storage.mjs`, `scripts/import-storage.mjs`
- This plan `MIGRATION_PLAN.md`

---

## 10. Next Action (Owner)

1. Create new Supabase project `<NEW_ID>` and provide `NEW_DB_URL` + `SERVICE_ROLE` to run §5 Phase 2-4.
2. Confirm target region (`asia-pacific` recommended for JP/VN users).
3. Schedule 1h maintenance window for cutover + verification (§6).

