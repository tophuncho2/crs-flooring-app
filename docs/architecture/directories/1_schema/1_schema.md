# Schema (Prisma)

All migrations are applied with `npx prisma migrate deploy`.

## Migrating to staging

- [ ] **1. Schema edit** — update `prisma/schema.prisma`
- [ ] **2. Migration file** — generate / write the corresponding migration under `prisma/migrations/`
- [ ] **3. `.env` must match `.env.staging`** — verify before running the migration; never run `db:migrate:dev` against any other environment
- [ ] **4. Run `npm run db:migrate:dev`**
- [ ] **5. Commit + push** — done manually by the user (do not commit on their behalf)

## Migrating to main

- [ ] **0. Never run directly after a staging migration** — staging must be clean and clear first; do not chain main migration onto the same session as the staging one
- [ ] **1. Run `/promote` skill** — read-only pre-check scan; only proceed once it returns green
- [ ] **2. `git fetch origin`**
- [ ] **3. `git checkout main`**
- [ ] **4. `git pull --ff-only origin main`**
- [ ] **5. `git merge --ff-only staging`**
- [ ] **6. `cp .env.main .env`**
- [ ] **7. `diff -q .env .env.main >/dev/null`** — verify env matches `.env.main`
- [ ] **8. `npm run db:deploy`** — runs `prisma migrate deploy` against main
- [ ] **9. `git push origin main`**
- [ ] **10. `git checkout staging`**
- [ ] **11. `cp .env.staging .env`**
- [ ] **12. `diff -q .env .env.staging >/dev/null`** — verify env restored to `.env.staging`

> Use `bin/promote.sh` (the quick bin command) **only** when there are no actual migrations to apply to main. If migrations are pending, run the steps above manually.

## Backups

- [ ] **DB is backed up weekly in both Railway environments** (staging and main)

## Tables that require periodic clearing

- [ ] **`AppMutationReceipt`** — idempotency receipts; clear out periodically
- [ ] **`UserLoginActivity`** — login activity log; clear out periodically
- [ ] **`QueueOutboxEvent`** — outbox events; clear out periodically

## Seeds

TS sources live under `packages/db/src/seed/`; JS runners live under `packages/db/scripts/`.

- [ ] **`npm run db:seed`** — runs the full seed (system users + uoms + categories + job-types) — JS runner: `seed.js`
- [ ] **`db:seed:job-types`** — TS: `job-types.ts` — JS runner: `seed-job-types.js`
- [ ] **`db:seed:categories`** — TS: `categories.ts` — JS runner: `seed-categories.js`
- [ ] **`db:seed:uoms`** — TS: `unit-of-measures.ts` — JS runner: `seed-unit-of-measures.js`
- [ ] **System Users** — no standalone command; only runs as part of `npm run db:seed` — TS: — (data from `.env`) — JS runner: `system-user-seed.js`

## Manual owner upsert

- [ ] **`npm run db:upsert-owner -- @crsfloorcovering.com ""`** — manually add an owner (JS runner: `owner-recovery.js`)

## Product backfill

- [ ] **`npm run db:backfill:product-names -- --dry-run`** — preview which products need backfilling (no writes)
- [ ] **`npm run db:backfill:product-names`** — run the backfill (JS runner: `backfill-product-names.js`)
