# Alteration Sweep — Schema Changes Checklist

---

# Next alteration — cut logs finalize / void worker model

Aligns `FlooringCutLog` with the staged-inventory worker pattern: `isFinal`
becomes the durable business fact ("has this been finalized?"), `status`
becomes the worker-pipeline tracker ("where is this in the job pipeline?").
See `docs/cut-logs-finalize-and-void-intent.md` for the full intent.

## `FlooringCutLog`

- [x] Add `isFinal Boolean @default(false)` — durable business fact,
  independent of worker lifecycle
- [x] Repurpose `FlooringCutLogStatus` enum to drive the worker job
  lifecycle (mirror the shape of `FlooringStagedRowStatus`) —
  added `QUEUED` (final set: `{ PENDING, QUEUED, FINAL, VOID }`)
  - [x] Decide exact value set — `{ PENDING, QUEUED, FINAL, VOID }`
    (single generic `QUEUED` covers any in-flight worker job; the
    job kind is encoded in the outbox topic, not in `status`)
  - [x] No row backfill needed — `flooring_cut_log` table is empty
- [x] Keep `void Boolean` as-is (existing void marker — voids erase the
  cut/coverageCut/cost/waste ect. fields, this stays the marker bit)
- [x] Re-evaluate existing status-bearing indexes after the enum repurpose:
  - [x] `@@index([workOrderItemId, status])` — kept (per-WO-item scope)
  - [x] `@@index([inventoryId, status])` — kept (per-inventory pipeline scope)
- [x] Add `@@index([inventoryId, isFinal])` to support pending-vs-finalized
  queries scoped to an inventory
- [x] Add a selection-pattern index that mirrors staged-inv's
  `@@index([status, isImported])` — `@@index([status, isFinal])`
- [x] Add `cutLogNumber String @unique @default(dbgenerated(...))` —
  global sequence-backed display identifier (`CUT-0000001`, 7-digit
  zero-pad), plus `@@index([cutLogNumber])` matching the
  `inventoryNumber` convention. Backed by new sequence
  `flooring_cut_log_number_seq`.
- [x] Add `finalCutSequence Int?` — per-inventory finalize ordinal
  assigned by the finalize worker. NULL until finalized. Enforced by
  `@@unique([inventoryId, finalCutSequence])`.

## `FlooringInventory`

- [x] No schema change — `totalCutSum` already exists; the alteration only
  changes *who writes it* (now exclusively the cut-log workers, under the
  per-inventory row lock described in the intent doc)

## Open / TBD before migration

- [x] Final `FlooringCutLogStatus` value set — resolved as
  `{ PENDING, QUEUED, FINAL, VOID }`. Single `QUEUED` is the
  void-in-flight value (same value carries pending-save-in-flight and
  finalize-in-flight; the kind is in the outbox topic).

## Resolved by sweep 1 (post-execution notes)

Sweep 1 applied — see `docs/sweep-1-cut-log-schema-alteration-report.md`.
Migration: `20260426204436_cut_log_finalize_status_alteration`.

Two TBDs were resolved as defaults during execution; if the user wants
either changed, it lands as a small follow-up migration:

- Work-order-link `CHECK` constraint (paired
  `workOrderId` / `workOrderItemId`): **deferred to sweep 2** as a
  domain rule. Not enforced at the DB level by sweep 1.
- `finalCutSequence` naming: **kept as `finalCutSequence`**.
  Alternatives `inventoryFinalSequence` / `inventoryFinalOrdinal`
  remain available via `RENAME COLUMN` if preferred — must be done
  before downstream sweeps reference the name.
