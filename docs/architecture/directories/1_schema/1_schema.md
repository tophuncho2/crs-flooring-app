# Schema (Prisma)

All migrations are applied with `npx prisma migrate deploy`.

## Migrating to staging

- [ ] **1. Schema edit** — update `prisma/schema.prisma`
- [ ] **2. Migration file** — generate / write the corresponding migration under `prisma/migrations/`
- [ ] **3. `.env` must match `.env.staging`** — verify before running the migration; never run `db:migrate:dev` against any other environment
- [ ] **4. Run `npm run db:migrate:dev`**
- [ ] **5. Commit + push** — done manually by the user (do not commit on their behalf)

## Migrating to main

Worktree layout: each branch lives in its own folder (`main/`, `staging/`, …) with its own persistent `.env`. There is no env swapping and no `git checkout` to switch branches — the main promotion is done **inside the `main/` folder**.

- [ ] **0. Never run directly after a staging migration** — staging must be clean and clear first; do not chain main migration onto the same session as the staging one
- [ ] **1. Run `/promote` skill** — read-only pre-check scan; only proceed once it returns green. It hands back the exact commands.
- [ ] **2. `cd` into the `main/` folder**
- [ ] **3. `git fetch origin`**
- [ ] **4. `git pull --ff-only origin main`**
- [ ] **5. `git merge --ff-only staging`**
- [ ] **6. `npm run db:deploy`** — runs `prisma migrate deploy` against main (uses `main/.env`; no-op if no migrations pending)
- [ ] **7. `git push origin main`**

> No `.env` swap is needed — `main/.env` already points at the main DB. There is no `bin/promote.sh` anymore; run the steps above (or copy them from `/promote`'s output) in the `main/` folder.

## Backups

- [ ] **DB is backed up weekly in both Railway environments** (staging and main)

## Tables that require periodic clearing

- [ ] **`AppMutationReceipt`** — idempotency receipts; clear out periodically
- [ ] **`UserLoginActivity`** — login activity log; clear out periodically
- [ ] **`QueueOutboxEvent`** — outbox events; clear out periodically

## Seeds

TS sources live under `packages/db/src/seed/`; JS runners live under `packages/db/scripts/`.

- [ ] **`npm run db:seed`** — runs the full seed (system users + uoms + categories) — JS runner: `seed.js`
- [ ] **`db:seed:categories`** — TS: `categories.ts` — JS runner: `seed-categories.js`
- [ ] **`db:seed:uoms`** — TS: `unit-of-measures.ts` — JS runner: `seed-unit-of-measures.js`
- [ ] **System Users** — no standalone command; only runs as part of `npm run db:seed` — TS: — (data from `.env`) — JS runner: `system-user-seed.js`

## Manual owner upsert

- [ ] **`npm run db:upsert-owner -- @crsfloorcovering.com ""`** — manually add an owner (JS runner: `owner-recovery.js`)
