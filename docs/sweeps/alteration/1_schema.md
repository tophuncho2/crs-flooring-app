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
  - [ ] Migrate existing rows: any current `PENDING` → new "draft"
    equivalent; any current `FINAL` → new "finalized" equivalent +
    `isFinal = true`; any current `VOID` → preserve via `void` boolean
- [ ] Keep `void Boolean` as-is (existing void marker — voids erase the
  cut/coverageCut/cost fields, this stays the marker bit)
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
  open question)
- [ ] Whether voiding a finalized cut log routes through the worker
  (single-writer rule on `totalCutSum`) or runs inline — affects whether
  `status` needs a void-in-flight value
