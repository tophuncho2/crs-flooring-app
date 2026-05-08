# Execution — Schema migration: add unit snapshots to `flooringCutLog`

**Date:** 2026-05-01
**Commit shape:** schema-only (per CLAUDE.md). No code touches; new columns are unread/unwritten until the per-row pending-cut refactor (Commit Y) lands.
**Predecessors:** previous commits (locker fix, before/after nullable, pending worker hardening) already merged.

---

## What changed

| File | Action | Content |
|---|---|---|
| [packages/db/prisma/schema.prisma:394-405](packages/db/prisma/schema.prisma:394) | **EDIT** | Added 4 columns to `FlooringCutLog`: `stockUnitName String?`, `stockUnitAbbrev String?`, `itemCoverageUnitName String?`, `itemCoverageUnitAbbrev String?` |
| [packages/db/prisma/migrations/20260501175827_add_cut_log_unit_snapshots/migration.sql](packages/db/prisma/migrations/20260501175827_add_cut_log_unit_snapshots/migration.sql) | **CREATE** | `ALTER TABLE "flooring_cut_log" ADD COLUMN ...` × 4 |

Generated SQL:

```sql
ALTER TABLE "flooring_cut_log" ADD COLUMN     "itemCoverageUnitAbbrev" TEXT,
ADD COLUMN     "itemCoverageUnitName" TEXT,
ADD COLUMN     "stockUnitAbbrev" TEXT,
ADD COLUMN     "stockUnitName" TEXT;
```

Postgres metadata-only operation — `ADD COLUMN` with no default + nullable runs without table rewrite.

## Why these columns

Each cut log row needs to render `cut` alongside its stock unit (e.g. "10.50 SY") and `coverageCut` alongside its item-coverage unit (e.g. "94.50 SF"). Today the rendering joins through to `flooringInventory` to fetch the unit abbreviations. Snapshotting the four unit fields onto the cut log itself:

- Removes the inventory join requirement at read time (UI + PDF generation simplify)
- Freezes the unit at create-time so the row's display history is stable even if the inventory's unit ever changes
- Mirrors the existing snapshot pattern (`flooringInventory.stockUnitName/Abbrev/itemCoverageUnitName/Abbrev` are themselves snapshots from `flooringProduct`)

## No backfill

Per direction: existing cut log rows will be cleared by hand. New rows get the snapshot at create-time once the per-row pending-cut routes (Commit Y) start writing them. Until then the columns are uniformly null on any rows that exist post-wipe.

## Verification

| Check | Result |
|---|---|
| `npx prisma migrate dev` (dev DB) | ✅ Applied. Generated SQL is the 4-column `ADD COLUMN` we expected. |
| `npm run typecheck` (root, all 8 packages) | ✅ All clean. Columns are nullable and not yet referenced in code, so no breakage. |
| `npm run build --workspace @builders/db` | ✅ Prisma client regenerated, db dist rebuilt against the new shape. |

## Migration history

`20260501175827_add_cut_log_unit_snapshots` lands after `20260501152403_make_cut_log_before_after_nullable` (the earlier `before`/`after` nullable migration).

## Commit message

```
schema: add unit-of-measure snapshots to flooring_cut_log

Add four nullable text columns to flooring_cut_log mirroring the
inventory snapshot pattern: stockUnitName, stockUnitAbbrev,
itemCoverageUnitName, itemCoverageUnitAbbrev. Each row will be stamped
with its parent inventory's units at create-time once the per-row
pending-cut routes write them — frozen for the row's life so display
history is stable even if the inventory's unit ever changes.

Migration is metadata-only — Postgres ADD COLUMN with no default and
nullable runs without table rewrite. Existing rows are not backfilled
(they will be cleared by hand before the new code lands).

No code touches in this commit. The columns are unread/unwritten until
the per-row pending-cut refactor lands.
```

---

## What's next

Commit Y — per-row pending-cut refactor (separate plan). Will:
- Tear out the diff bundle (producer/consumer/worker/outbox/queue for `flooring.work-order-item.pending-cut-log.save`)
- Add three sync use cases + routes (create / update / delete one row)
- Stamp the four new unit columns at create-time from the parent inventory
- Rewrite the WOMI cut-log section UI controller for per-row mutations
- Drop the `SAVING_CUTS` WOMI status (sync mutations don't need it)

Finalize worker stays untouched; void flow stays untouched.
