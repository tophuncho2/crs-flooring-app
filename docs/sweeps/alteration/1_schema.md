# Alteration Sweep — Schema Changes Checklist

---

# Next alteration — cut logs finalize / void worker model

Aligns `FlooringCutLog` with the staged-inventory worker pattern: `isFinal`
becomes the durable business fact ("has this been finalized?"), `status`
becomes the worker-pipeline tracker ("where is this in the job pipeline?").
See `docs/cut-logs-finalize-and-void-intent.md` for the full intent.

## `FlooringCutLog`

- [ ] Add `isFinal Boolean @default(false)` — durable business fact,
  independent of worker lifecycle
- [ ] Repurpose `FlooringCutLogStatus` enum to drive the worker job
  lifecycle (mirror the shape of `FlooringStagedRowStatus`)
  - [ ] Decide exact value set (DRAFT / QUEUED / FINALIZED-equivalent + how
    void interacts) — open question in intent doc
  - [x] No row backfill needed — `flooring_cut_log` table is empty
- [ ] Keep `void Boolean` as-is (existing void marker — voids erase the
  cut/coverageCut/cost/waste ect. fields, this stays the marker bit)
- [ ] Re-evaluate existing status-bearing indexes after the enum repurpose:
  - [ ] `@@index([workOrderItemId, status])`
  - [ ] `@@index([inventoryId, status])`
- [ ] Add `@@index([inventoryId, isFinal])` to support pending-vs-finalized
  queries scoped to an inventory
- [ ] Add a selection-pattern index that mirrors staged-inv's
  `@@index([status, isImported])` — likely `@@index([status, isFinal])`

## `FlooringInventory`

- [ ] No schema change — `totalCutSum` already exists; the alteration only
  changes *who writes it* (now exclusively the cut-log workers, under the
  per-inventory row lock described in the intent doc)

## Open / TBD before migration

- [ ] Final `FlooringCutLogStatus` value set (carry forward from intent doc
  open question) — must include a void-in-flight value, since voids are
  worker-driven and need to be visible in `status` like pending and
  finalize
