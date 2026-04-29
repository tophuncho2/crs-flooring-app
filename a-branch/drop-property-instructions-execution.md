# Execution Summary — Drop `propertyInstructions` Columns + Templates Cleanup

Plan: [drop-property-instructions-plan.md](drop-property-instructions-plan.md) — locked.
Decisions: Q1=B (strictly remove-only), Q2=A (fully delete smoke mock).

## Commit 1 — Schema (DONE, NOT COMMITTED YET)

| Step | Status | Detail |
|---|---|---|
| Edit `packages/db/prisma/schema.prisma` line 440 — drop `propertyInstructions` from `FlooringTemplate` | ✅ | |
| Edit `packages/db/prisma/schema.prisma` line 549 — drop `propertyInstructions` from `FlooringWorkOrder` | ✅ | |
| Author migration file `packages/db/prisma/migrations/20260429120000_drop_property_instructions_columns/migration.sql` | ✅ | Two `ALTER TABLE … DROP COLUMN "propertyInstructions"` statements, matching the existing manual migration style |
| `npm run db:deploy` (= `npx prisma migrate deploy`) against Railway staging via `.env` `DATABASE_URL` | ✅ exit 0 | Migration applied to `shortline.proxy.rlwy.net:22153` (Railway staging) |
| `npm run db:generate` (= `npx prisma generate`) — regenerate client | ✅ exit 0 | TS types updated |
| `npx prisma migrate status` — verify clean | ✅ exit 0 | "Database schema is up to date!" |

**Local working-tree changes ready to commit (commit 1):**
- `packages/db/prisma/schema.prisma` — 2 lines deleted
- `packages/db/prisma/migrations/20260429120000_drop_property_instructions_columns/migration.sql` — new

**Awaiting user approval before `git commit`.** (CLAUDE.md: never commit unless explicitly asked.)

## Commit 2 — Code cleanup (NOT STARTED)

13 files queued per plan. Build is currently broken (expected — code still references the dropped fields). Will execute after commit 1 lands.

## Open issues

None encountered. Migration applied cleanly on first try.
