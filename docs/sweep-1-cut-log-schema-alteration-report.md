# Sweep 1 — Cut Log Schema Alteration Report

**Date:** 2026-04-26
**Plan:** `~/.claude/plans/take-a-look-at-functional-falcon.md`
**Intent:** [docs/cut-logs-finalize-and-void-intent.md](cut-logs-finalize-and-void-intent.md)
**Sweep doc:** [docs/sweeps/alteration/1_schema.md](sweeps/alteration/1_schema.md)
**Branch:** `staging`

## Headlines

- **Schema:** `FlooringCutLog` gains `cutLogNumber`, `finalCutSequence`,
  `isFinal`; `FlooringCutLogStatus` gains `QUEUED`. 2 unique constraints
  + 5 indexes total added (3 new composites + the unique-constraint
  implicit index + the explicit `cutLogNumber_idx`).
- **Migration:** `20260426204436_cut_log_finalize_status_alteration`
  hand-written in section-commented style, applied cleanly via
  `prisma migrate deploy` against the Railway dev DB.
- **Sequence:** `flooring_cut_log_number_seq` created and reset to 1
  after a one-time preview-query side-effect during verification.
  First production insert will produce `CUT-0000001`.
- **Typecheck error counts (sweep-1-attributable):**
  - `@builders/domain` — **0**
  - `@builders/db` — **0**
  - `@builders/application` — **0**
  - `@builders/lib` — **0**
  - `@builders/relay` — **0**
  - `@builders/worker` — **0**
  - `@builders/web` — **0** (3 pre-existing errors in
    `apps/web/modules/work-orders/record/panel/work-order-record-panel.tsx`
    on lines 539-542 are unchanged on HEAD and unrelated to cut logs;
    not regressions from this sweep)
- **Pre-existing repo-level failures observed (NOT caused by sweep 1, but
  worth flagging for sweep 2 / a separate cleanup):**
  - `npm run guard:prisma` fails because
    `packages/domain/src/flooring/inventory/cut-logs/types.ts` and
    `packages/domain/src/flooring/imports/staged-inventory-rows/types.ts`
    import directly from `@prisma/client`. The guard rule requires
    domain types to be re-exported through `packages/db`. **Sweep 2
    should fix the cut-log violation as part of the domain pass.**

## What changed

### `packages/db/prisma/schema.prisma`

`FlooringCutLogStatus` enum: added `QUEUED` between `PENDING` and `FINAL`
in source order (Postgres stores it at sortorder 4 — appended at the
tail).

`FlooringCutLog` model:

- New field `cutLogNumber String @unique @default(dbgenerated("…"))` —
  global display identifier, format `CUT-0000001` (7-digit zero-pad).
  Backed by sequence `flooring_cut_log_number_seq`.
- New field `finalCutSequence Int?` — per-inventory ordinal assigned
  by the finalize worker (NULL until finalize lands).
- New field `isFinal Boolean @default(false)` — durable "is finalized"
  fact, independent of `status`.
- New unique: `@@unique([inventoryId, finalCutSequence])`.
- New indexes: `@@index([cutLogNumber])`,
  `@@index([inventoryId, isFinal])`, `@@index([status, isFinal])`.
- Field column alignment widened from 16 to 17 chars to accommodate
  `finalCutSequence` (16 chars).

`FlooringInventory` — no schema change (per plan).

### `packages/db/prisma/migrations/20260426204436_cut_log_finalize_status_alteration/migration.sql`

Hand-written, section-commented SQL. Applies in this order:

1. `ALTER TYPE "FlooringCutLogStatus" ADD VALUE 'QUEUED';` (top-level
   statement — required because `ALTER TYPE … ADD VALUE` cannot run
   inside an explicit transaction block).
2. `CREATE SEQUENCE flooring_cut_log_number_seq;`
3. `ALTER TABLE "flooring_cut_log" ADD COLUMN …` for the three new
   columns in one statement.
4. Five `CREATE [UNIQUE] INDEX` statements for the new indexes.

No row backfill (`flooring_cut_log` is empty).

### `packages/db/scripts/verify-cut-log-alteration.mjs` (new)

One-shot verification script. Queries `information_schema.columns`,
`pg_indexes`, `pg_enum`, and the new sequence to confirm the migration
applied as expected. Final query is a non-mutating format preview
(`lpad('1', 7, '0')`) that does not advance the sequence. Safe to re-run.

## TBDs explicitly resolved by this sweep

The plan flagged two decisions deferred to "before migration generation."
Both were resolved as the plan's defaults — flagged here so the user can
pivot in a follow-up migration if either choice is wrong:

1. **Work-order-link `CHECK` constraint** — **DEFERRED to sweep 2**
   (domain-rule enforcement). No DB-level pairing constraint added in
   this sweep. If we later want DB-level enforcement, it lands as a
   small follow-up migration; the constraint itself is one statement and
   unblocked by anything in this sweep.
2. **`finalCutSequence` naming** — **kept as `finalCutSequence`**.
   Alternatives `inventoryFinalSequence` / `inventoryFinalOrdinal` are
   still on the table; rename now requires only a `RENAME COLUMN` +
   schema update before downstream sweeps reference it.

## Postgres state (verified via Prisma `$queryRaw`)

```
Columns:
  cutLogNumber     text     NOT NULL   default ('CUT-' || lpad((nextval('flooring_cut_log_number_seq'::regclass))::text, 7, '0'::text))
  finalCutSequence integer  NULL       no default
  isFinal          boolean  NOT NULL   default false

Indexes:
  flooring_cut_log_cutLogNumber_idx                 (cutLogNumber)
  flooring_cut_log_cutLogNumber_key                 UNIQUE (cutLogNumber)
  flooring_cut_log_inventoryId_finalCutSequence_key UNIQUE (inventoryId, finalCutSequence)
  flooring_cut_log_inventoryId_isFinal_idx          (inventoryId, isFinal)
  flooring_cut_log_status_isFinal_idx               (status, isFinal)

FlooringCutLogStatus enum (sortorder):
  1 PENDING
  2 FINAL
  3 VOID
  4 QUEUED   ← appended (Postgres ADD VALUE without BEFORE/AFTER)

flooring_cut_log_number_seq: last_value=1, is_called=false
```

## FlooringCutLogStatus callsite worklist (for sweep 2)

Ripgrep `FlooringCutLogStatus` across `packages/` + `apps/` returns:

- [packages/domain/src/flooring/inventory/cut-logs/types.ts](../packages/domain/src/flooring/inventory/cut-logs/types.ts) — re-exports the type
  three times. Sweep 2 should:
  - Re-route the import through `packages/db` (fixes the
    `guard:prisma` failure).
  - Decide whether the domain layer wants its own discriminated union
    (`{ kind: "PENDING" | "QUEUED" | "FINAL" | "VOID" }`) for the
    pipeline rules instead of the raw Prisma enum.

No other source files reference the enum. Application / web / relay /
worker layers consume cut-log status indirectly through
`packages/domain` types.

## Sweep doc updates

`docs/sweeps/alteration/1_schema.md` checklist boxes ticked:

- [x] Add `isFinal Boolean @default(false)`
- [x] Repurpose `FlooringCutLogStatus` (now `{ PENDING, QUEUED, FINAL, VOID }`)
- [x] Decide exact value set
- [x] No row backfill needed
- [x] Keep `void Boolean` as-is
- [x] Re-evaluate existing status indexes — kept both
- [x] Add `@@index([inventoryId, isFinal])`
- [x] Add `@@index([status, isFinal])`

Two additions not in the original sweep doc — added retroactively to the
checklist:

- [x] Add `cutLogNumber` global sequence-backed display identifier
- [x] Add `finalCutSequence Int?` per-inventory finalize ordinal +
  `@@unique([inventoryId, finalCutSequence])`

## Next sweep

Sweep 2 (`docs/sweeps/alteration/2_domain.md`) — domain-layer pass:

- Update `cut-log-rules.ts` and `editability.ts` for the new enum +
  `isFinal`.
- Add pending-save and void payload schemas alongside the existing
  `finalize-payload.ts`.
- Add predicates (`isCutLogPendingEditable`, `isCutLogQueued`,
  `isCutLogFinalized`, `isCutLogVoided`) mirroring staged-inv
  `editability.ts`.
- Decide where the `finalCutSequence` allocator helper lives (likely a
  pure function fed the current `MAX(finalCutSequence)` for the parent
  inventory).
- Fix the `@prisma/client` import in `types.ts` to satisfy
  `guard:prisma`.
