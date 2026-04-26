# Cut Logs — Finalize & Void Flow (Intent)

## Goal

Bring `FlooringCutLog` under the same worker-driven completion model that
staged inventory rows already use. Users curate a set of PENDING cut logs
freely, then trigger a worker job that finalizes them. Voiding is a separate
additive flow that wipes a single cut log's effects.

## Mental model — mimic staged inventory row imports

The staged-inventory flow is the template:

- In `controllers/` for the staged-inventory section of imports, users check
  the rows they want and click **Run Import**.
- That selection triggers a use case → outbox event → relay dispatch → worker
  job that performs the actual import.

The cut logs section of inventory will use the **same** selection +
"run worker job" flow, except the job is **finalize cut logs** instead of
import staged rows.

## Prisma changes (FlooringCutLog)

- Add `isFinal Boolean @default(false)`.
- Repurpose the existing `status` field so it can drive the worker job
  lifecycle (in the same shape staged-inventory uses for its row status).
  `isFinal` answers "has this been finalized?"; `status` answers
  "where is this in the worker pipeline?".

The two fields are intentionally separate: `isFinal` is the durable business
fact, `status` is the job-state tracker.

## Runtime flow

### Editing PENDING cut logs (worker-driven)

- Users can freely add / edit / delete cut logs while they are `PENDING` /
  not final.
- Save mode (diff-save vs. one-edit-at-a-time) is **still TBD** — decide as
  part of the use-case + API pass.
- **Invariant:** every change to a cut log's `cut` column must adjust the
  parent `FlooringInventory.totalCutSum`. This applies to add, edit, and
  delete on PENDING rows. The cut sum stays in lockstep with the live
  pending state.
- **Single writer:** pending saves go through a worker job too — not just
  finalize. The worker is the only writer to `totalCutSum`, so there is one
  serialized path for every cut sum mutation. UI handles the async lag with
  optimistic state / a visible pending indicator.

### Finalize (worker-driven)

1. User selects PENDING cut logs in the cut logs section and clicks the
   finalize action (mirrors staged-inv "Run Import" UX).
2. Use case writes an outbox event.
3. Relay picks the event up and dispatches it to the worker.
4. Worker reads the cut log's `before`, `after`, `cut`, `coverageCut`,
   `cost`, `freight`, etc., applies the finalization, and adjusts the parent
   inventory's cut sum accordingly. The worker is the only writer that
   completes a cut log into its final state.

### Void (worker-driven, one-at-a-time)

- Voiding a cut log **erases** its `cut`, `coverageCut`, `cost`, `freight`,
  etc. (the cut log row stays as a void marker).
- **Always** one cut log at a time — never a batch operation, regardless of
  whether the cut log is `PENDING` or already finalized. Same single-row
  control surface in both cases.
- **Worker-driven** to keep the pattern uniform: every cut log mutation
  (pending save, finalize, void) flows through the outbox/relay/worker
  plumbing, every state change is visible via `status`, and retries +
  observability are uniform across all three flows. A sync use case would
  also be safe (the row lock is what enforces correctness, not the writer
  identity), but uniformity won out.
- Still flows through the locked-transaction pattern below: lock parent
  inventory + the single cut log being voided, erase the cut fields, adjust
  `totalCutSum`, commit.

### Concurrency model

Every job (pending save batch, finalize run, *and* single-row void)
executes in a single transaction that:

1. Locks the parent `FlooringInventory` row (`SELECT … FOR UPDATE`) — acts
   as a per-inventory mutex so pending and finalize never race on the same
   inventory.
2. Locks the specific cut logs being mutated by that job
   (`SELECT … FOR UPDATE` on those rows only — not the entire cut log set
   under the inventory).
3. Applies the cut log change(s) and recomputes / adjusts `totalCutSum`
   inside the same transaction.
4. Commits.

This keeps the invariant `totalCutSum = sum(cut)` of non-void cut logs
provable inside the lock, while keeping lock scope minimal (parent row +
touched cut logs only). Watch finalize-job duration — long-held inventory
locks queue any pending-edit jobs for the same inventory.

## Order of operations

1. **Prisma** — add `isFinal`, evolve `status` field for worker lifecycle.
2. **Domain layer** — encode finalize / void rules and cut-sum invariants.
3. **Data layer** — repository surface for PENDING edits, finalize state
   transitions, void, and the parent-inventory cut sum maintenance.
4. **Use cases** — add/edit/delete PENDING cut log, finalize selection
   (writes outbox), void single cut log.
5. **Relay / outbox / worker** — wire three worker jobs end to end
   (pending-save, finalize-cut-logs, void-cut-log), following the
   staged-inventory-row-import job as the reference shape.
6. **API** — surface the new use cases.
7. **Cut logs section UI** — migrate components to the new primitives
   (whatever the staged-inv list/record migration introduced).
8. **Controllers** — extend the cut logs section controllers to drive the
   finalize selection flow (mirroring staged-inv import controller) and add
   the per-row void action.

## Open questions to resolve along the way

- Diff-save vs. single-edit save mode for PENDING cut logs (affects how a
  pending-save worker job is batched — one job per save, or one job per
  flushed batch).
- Exact `status` value set for the worker lifecycle (align names with
  whatever staged-inv uses so the worker plumbing is uniform).
- ~~Whether the void of a finalized cut log dispatches through the worker
  or runs inline.~~ **Resolved:** voids run through a worker job, one at a
  time, to keep the pattern uniform with pending save and finalize.
- UI strategy during the async lag on pending edits (optimistic update vs.
  visible pending indicator vs. blocking spinner).
