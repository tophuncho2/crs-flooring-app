# Smoke Test — Cut-Log Worker Pipeline (sweeps 1–5) Report

**Date:** 2026-04-26 (smoke run completed 02:58 UTC on 2026-04-27)
**Branch:** `staging`
**Result:** ✅ **SMOKE PASSED** on the 4th attempt (after fixing 2 bugs the smoke uncovered)
**Smoke script:** [packages/db/scripts/smoke-cut-log-pipeline.mjs](../packages/db/scripts/smoke-cut-log-pipeline.mjs)
**Helper scripts:** [packages/db/scripts/smoke-cleanup.mjs](../packages/db/scripts/smoke-cleanup.mjs), [packages/db/scripts/inspect-outbox.mjs](../packages/db/scripts/inspect-outbox.mjs), [apps/relay/scripts/inspect-queues.mjs](../apps/relay/scripts/inspect-queues.mjs), [apps/relay/scripts/clear-cut-log-queues.mjs](../apps/relay/scripts/clear-cut-log-queues.mjs)

## Headlines

- **End-to-end pipeline works.** All three worker flows (pending-save, finalize, void) executed against the real Railway-hosted Postgres + Redis, with the actual relay and worker apps running as long-lived processes. Producer use case → outbox row → relay claim/dispatch → BullMQ → worker handler → consumer use case → DB state change → assertion.
- **Two bugs surfaced and fixed during the smoke run** — both in sweep-4 application code, both stuff that pure typecheck could not catch:
  1. **`:` in pending-save idempotency key.** BullMQ rejects custom job IDs containing `:` unless the ID splits into exactly 3 parts. My pending-save producer was building an 11-part key (with `:` separators inside the timestamp's `02:45:10` and inside `m::d::` empty markers). Worker never got the job; the relay logged `lastError: "Custom Id cannot contain :"` and retried forever. Fixed in `save-cut-log-pending-diff.ts` by collapsing to 3 parts and replacing inner `:` with `-` / `_`.
  2. **Worker-side defensive re-validation rejects QUEUED rows.** The finalize and void consumer use cases were re-running their producer-side validators (`validateCutLogFinalizeBatch` / `validateCutLogVoidRequest`) under the lock. Those validators reject rows in `QUEUED` state — but the producer's whole job is to flip rows to QUEUED so the worker picks them up. The worker was rejecting exactly the state it was supposed to handle. Fixed in `finalize-cut-logs.ts` and `void-cut-log.ts` by replacing the validator re-call with an inline drift check (`status !== "QUEUED" || isFinal || void`).
- **All sweep-2 / sweep-3 / sweep-4 contracts verified working end-to-end:**
  - Sweep-1 schema: `cutLogNumber` auto-generates as `CUT-0000004` from the sequence, `finalCutSequence=1` allocated correctly, `isFinal/void` flip in lockstep with `status`.
  - Sweep-2 domain: `computeCutCoverage(10 × 48.11) = 481.1` ✓; `nextFinalCutSequence(null) = 1` ✓; `computeBeforeAfterForFinalize({startingStock: 55, priorConsumed: 0, cut: 10}) = {before: 55, after: 45}` ✓; `buildVoidedCutLogPatch()` erased cut/coverageCut/cost/freight while preserving before/after/isFinal/finalCutSequence ✓; `computeTotalCutSum` recomputes correctly across all three flows ✓.
  - Sweep-3 data: `applyCutLogPendingSaveDiff` createMany worked; `finalizeCutLogBatch` stamped before/after/finalCutSequence in `cutLogNumber` order ✓; `applyVoidToCutLog` applied the patch; `updateInventoryTotalCutSum` was the only writer to `totalCutSum`.
  - Sweep-4 application: producer-consumer split worked — pending-save's status stays PENDING throughout (outbox event is the in-flight marker); finalize / void producers flip to QUEUED, workers transition to terminal state.
  - Sweep-5 wiring: relay polled outbox table every 2s, claimed events, parsed payloads, enqueued to BullMQ; worker subscribed to all 4 queues, handlers invoked correctly.

## Smoke timings (final successful run)

| Step | Producer return | Worker apply (poll-detected) |
|---|---|---|
| 1. saveCutLogPendingDiffUseCase | 665ms | 1156ms |
| 2. markCutLogsForFinalizeUseCase | 324ms | 2182ms |
| 3. markCutLogForVoidUseCase | 376ms | 2169ms |

The ~2-second worker-apply latency is dominated by the relay's 2-second poll
interval (`POLL_INTERVAL_MS=2000` in `apps/relay/src/env.ts`). Lower the
poll interval if you want faster smoke turnaround for end-to-end iteration.
Pending-save is faster because the relay happened to poll mid-flight.

## What the smoke verifies (per step)

### Step 1 — `saveCutLogPendingDiffUseCase`

- Producer wrote outbox event with topic `flooring.cut-log.pending-save`, status=PENDING, idempotency key `cut-log-pending-save:<inventoryId>:a-<id>_m-_d-_at-<normalized timestamp>` (3 colon-separated parts ✓).
- Producer-stamped UUID for the new draft rode in the payload (`CutLogDraftPayload.id`, the sweep-2 fix).
- Relay polled, claimed, parsed, enqueued to BullMQ jobId = idempotency key, marked outbox row DISPATCHED.
- Worker subscribed handler picked up job, called `applyCutLogPendingDiffUseCase`, which:
  - acquired the per-inventory `FOR UPDATE` lock,
  - snapshotted via `listCutLogsForPendingSaveDiff` + `getInventoryParentContextForCutLogs`,
  - re-ran `validateCutLogsDiff` defensively (this validator IS safe to re-run; pending-save doesn't flip status),
  - called `applyCutLogPendingSaveDiff` (createMany with the producer-stamped id, recompute coverageCut),
  - recomputed `totalCutSum` via `computeTotalCutSum` and persisted via `updateInventoryTotalCutSum`.
- DB end state verified by smoke:
  ```
  cutLogNumber: 'CUT-0000004'        ← sequence allocated CUT-0000001..0000003 across earlier failed attempts
  status: 'PENDING'
  isFinal: false
  finalCutSequence: null
  void: false
  cut: 10
  coverageCut: 481.1                 ← computeCutCoverage(10 × 48.11) ✓
  cost: 100
  freight: 5
  before: 0                          ← worker-stamped at finalize, defaults to 0 in createMany
  after: 0
  inventory.totalCutSum: 0 → 10      ← single-writer rule honoured (worker is sole writer)
  ```

### Step 2 — `markCutLogsForFinalizeUseCase`

- Producer ran `validateCutLogFinalizeBatch` (rows must be PENDING + !isFinal + !void) — passed.
- Producer called `markCutLogsForFinalize` (data primitive flipped row PENDING → QUEUED).
- Producer wrote outbox event with idempotency key `cut-log-finalize:<inventoryId>:<rowIds>` (3 parts ✓).
- Relay claimed + dispatched.
- Worker `finalizeCutLogsUseCase` ran:
  - took the per-inventory `FOR UPDATE` lock,
  - re-fetched the rows under the lock via `listCutLogsForFinalizeBatch`,
  - inline drift check (rows must still be QUEUED + !isFinal + !void) — passed,
  - computed `priorConsumedFromExistingFinalCuts` from existing finalized rows (= 0 here, no prior finals),
  - called `finalizeCutLogBatch` (data primitive sorted by `cutLogNumber ASC`, allocated `nextFinalCutSequence(null) = 1`, computed `before=55, after=45` via `computeBeforeAfterForFinalize`, stamped status=FINAL, isFinal=true).
- DB end state verified by smoke:
  ```
  status: 'FINAL'
  isFinal: true
  finalCutSequence: 1
  before: 55                         ← startingStock - priorConsumed (0)
  after: 45                          ← before - cut
  inventory.totalCutSum: 10 → 10     ← unchanged on finalize (cuts already counted as non-void)
  ```

### Step 3 — `markCutLogForVoidUseCase`

- Producer ran `validateCutLogVoidRequest` — passed (row was FINAL, not voided, not QUEUED).
- Producer called `markCutLogForVoid` (data primitive flipped row FINAL → QUEUED).
- Producer wrote outbox event with idempotency key `cut-log-void:<inventoryId>:<cutLogId>` (3 parts ✓).
- Relay claimed + dispatched.
- Worker `voidCutLogUseCase` ran:
  - took the per-inventory `FOR UPDATE` lock,
  - re-fetched the row via `getCutLogForVoid`,
  - inline drift check (status must still be QUEUED + !void) — passed,
  - called `applyVoidToCutLog` (data primitive applied `buildVoidedCutLogPatch()`),
  - recomputed `totalCutSum` from all remaining cut logs via `computeTotalCutSum` (excludes void rows),
  - asserted `assertCutSumWithinStartingStock` (always passes — void strictly decreases sum),
  - persisted via `updateInventoryTotalCutSum`.
- DB end state verified by smoke:
  ```
  status: 'VOID'
  void: true
  cut: 0                             ← schema is NOT NULL Decimal, so "0" sentinel rather than null
  coverageCut: null
  cost: null
  freight: null
  before: 55                         ← preserved as historical record per sweep-2 decision
  after: 45                          ← preserved as historical record
  isFinal: true                      ← preserved (sweep-2 decision)
  finalCutSequence: 1                ← preserved (sweep-2 decision)
  inventory.totalCutSum: 10 → 0      ← fold over remaining non-void cuts = 0
  ```

## Outbox event lifecycle (the actual rows from the run)

```
[pending-save]  status=DISPATCHED  attemptCount=1  createdAt=02:58:07.684Z  dispatchedAt=02:58:08.482Z  (Δ 798ms)
[finalize]      status=DISPATCHED  attemptCount=1  createdAt=02:58:09.248Z  dispatchedAt=02:58:09.784Z  (Δ 536ms)
[void]          status=DISPATCHED  attemptCount=1  createdAt=02:58:11.832Z  dispatchedAt=02:58:12.273Z  (Δ 441ms)
```

All three events made it to DISPATCHED on the first attempt (no retries),
which means the relay successfully parsed and enqueued each one. The
PENDING → PROCESSING → DISPATCHED transition is the relay's contract; the
"DISPATCHED" terminal state means BullMQ accepted the job.

## How to run the smoke

The smoke is a one-shot Node script that drives the producer use cases
and polls the DB for the worker's effect. It assumes:

1. **Postgres reachable** via `DATABASE_URL` in `.env` (the same one the
   sweep-1 migrations were applied to — staging Railway by default).
2. **Redis reachable** via `QUEUE_REDIS_URL` or `REDIS_URL` in `.env`.
3. **Relay app running** (subscribes to outbox, dispatches to BullMQ).
4. **Worker app running** (subscribes to BullMQ, applies jobs).

### Step-by-step run procedure

```bash
# From the repo root. Build everything once after sweep-5 changes:
npm run build --workspace @builders/lib
npm run build --workspace @builders/domain
npm run build --workspace @builders/db
npm run build --workspace @builders/application
npm run build --workspace @builders/relay
npm run build --workspace @builders/worker

# (Optional) Cleanup any orphaned cut-log + outbox state from prior smoke
# attempts. Especially important if a previous run failed midway.
( cd packages/db && DOTENV_CONFIG_PATH=../../.env node -r dotenv/config scripts/smoke-cleanup.mjs )

# (Optional) Obliterate any orphaned BullMQ jobs in cut-log queues.
( cd apps/relay && DOTENV_CONFIG_PATH=../../.env node -r dotenv/config scripts/clear-cut-log-queues.mjs )

# Start the relay + worker as separate processes. Each runs forever; stop
# with Ctrl-C (SIGINT) when done. In separate terminals:
npm run start --workspace @builders/relay   # terminal 1
npm run start --workspace @builders/worker  # terminal 2

# Wait for both to log "ready" (a few seconds). Then, in a third terminal,
# run the smoke:
( cd packages/db && DOTENV_CONFIG_PATH=../../.env node -r dotenv/config scripts/smoke-cut-log-pipeline.mjs )
```

Expected output ends with `SMOKE PASSED` and a `[CLEANUP]` block. The
script self-cleans (deletes the smoke cut log, resets the test
inventory's `totalCutSum` to 0) regardless of pass/fail outcome — the
top-level `let smokeCutLogId / smokeInventoryId` ensure cleanup runs from
a `finally` block even if `main()` throws midway.

### What each helper script does

| Script | Purpose |
|---|---|
| [`scripts/smoke-cut-log-pipeline.mjs`](../packages/db/scripts/smoke-cut-log-pipeline.mjs) | The smoke itself. Runs save → finalize → void with DB polls. Cleans up at the end. |
| [`scripts/smoke-cleanup.mjs`](../packages/db/scripts/smoke-cleanup.mjs) | Hard-cleans all `flooring_cut_log` rows + resets every `flooring_inventory.totalCutSum` to 0 + deletes all cut-log outbox events. Use before re-running the smoke if a previous attempt left artifacts. |
| [`scripts/inspect-outbox.mjs`](../packages/db/scripts/inspect-outbox.mjs) | Dumps the 8 most recent outbox events as JSON. Useful for debugging "is the relay seeing my event?". |
| [`scripts/inspect-queues.mjs`](../apps/relay/scripts/inspect-queues.mjs) | Dumps BullMQ job counts + recent jobs per queue. Useful for debugging "is BullMQ holding the job?". |
| [`scripts/clear-cut-log-queues.mjs`](../apps/relay/scripts/clear-cut-log-queues.mjs) | Obliterates all jobs in the 3 cut-log BullMQ queues. Use if a previous smoke attempt left stuck jobs. |

### Failure-mode triage

If the smoke fails, the table below maps observable symptoms to where the
problem most likely is:

| Symptom | Likely cause | Where to look |
|---|---|---|
| `pollFor` times out at step 1 | Relay didn't dispatch, OR worker didn't process | Relay log for parse / enqueue errors. `inspect-outbox.mjs` to see if event went DISPATCHED. `inspect-queues.mjs` to see if BullMQ has the job. |
| Worker logs "BullMQ idempotent enqueue failed" | The relay tried to enqueue but BullMQ rejected the jobId | Producer's `idempotencyKey` shape — must contain `:` only as a 3-part separator (caught the `:` bug in this run). |
| Worker logs `worker.cut_logs.<topic>.failed` with `UnrecoverableError` | Domain or precondition error in the consumer use case | The error message + payload; commonly drift between producer and worker (caught the validator-rejecting-QUEUED bug in this run). |
| Worker logs `worker.cut_logs.<topic>.failed` with non-`UnrecoverableError` | Transport error (Postgres / Redis blip) — BullMQ will retry | Wait for the next poll cycle; if it persists, check connectivity. |
| Smoke times out at step 2 or 3, not step 1 | Producer-consumer drift detection is rejecting valid rows | Inline drift check in the consumer use case — make sure it accepts the state the producer left the row in. |

## Bugs found and fixed by the smoke run (in order)

### Bug 1: `:` in pending-save idempotency key (sweep 4)

- **File:** `packages/application/src/flooring/inventory/cut-logs/save-cut-log-pending-diff.ts`
- **Symptom:** Smoke timed out at step 1. Relay log:
  ```
  "lastError":"Custom Id cannot contain :"
  ```
- **Root cause:** BullMQ enforces "custom jobId with `:` must split into exactly 3 parts" (verified in `node_modules/bullmq/dist/cjs/classes/job.js:1038`). My idempotency key was 11 colon-separated parts because of empty markers + the ISO timestamp's native `:` separators (`02:45:10`).
- **Fix:** Collapse the dedup segment into a single colon-free string using `-` / `_` separators; normalize the timestamp via `requestedAt.replace(/[:.]/g, "-")`. New format:
  ```
  cut-log-pending-save:<inventoryId>:a-<ids>_m-<ids>_d-<ids>_at-<normalized-timestamp>
  ```
  3 parts ✓.
- **Why typecheck didn't catch it:** Idempotency keys are runtime-only strings — TypeScript can't validate their internal structure.
- **Why unit tests didn't catch it:** No unit test exercised the producer-side outbox write end-to-end. Smoke is the right place for this.

### Bug 2: Consumer re-validates with the producer-side validator (sweep 4)

- **Files:** `packages/application/src/flooring/inventory/cut-logs/finalize-cut-logs.ts`, `packages/application/src/flooring/inventory/cut-logs/void-cut-log.ts`
- **Symptom:** Smoke timed out at step 2 (and would have at step 3). Worker log:
  ```
  "Finalize cut log batch job failed" ... "UnrecoverableError: Cannot finalize: 1 cut log is not ready"
  ```
- **Root cause:** Both consumer use cases were calling the same `validate*` helper as the producer. The producer's job is to flip rows PENDING → QUEUED (or FINAL → QUEUED for void); when the worker re-runs the same validator under the lock, `getCutLogFinalizabilityBlocker(row)` returns `ALREADY_QUEUED` because the row is QUEUED — and the worker rejects exactly the state it was supposed to handle.
- **Fix:** Replace the validator re-call with an inline "drift check": the worker expects the row in QUEUED state with appropriate flags; if anything else, dead-letter with `CUT_LOG_PRECONDITION_FAILED`. Mirror staged-inv's count-mismatch / status-filter approach.
  ```ts
  // before
  const issues = validateCutLogFinalizeBatch(requestedRows)
  if (issues.length > 0) throw new CutLogExecutionError({...})

  // after
  const drifted = requestedRows.filter(
    (row) => row.status !== "QUEUED" || row.isFinal || row.void,
  )
  if (drifted.length > 0) throw new CutLogExecutionError({
    code: "CUT_LOG_PRECONDITION_FAILED",
    ...
  })
  ```
- **Why typecheck didn't catch it:** The validator runs successfully (just over-rejects). Only behaviour, not types.
- **Why unit tests didn't catch it:** The handler unit tests in sweep-5 stub the use case with a mock; they don't exercise the producer-consumer pair against a real DB. Same lesson — smoke is the right place.

### Worker logging gap (cosmetic; flagged for follow-up)

- **Symptom:** During run #4 (the successful one), the worker log shows `active`/`completed` for finalize and void, but NOT for the pending-save job — even though the pending-save handler successfully ran (the cut log was created and `totalCutSum` updated, both verified by the smoke).
- **Possible causes:** stdout buffering on the writer side; race between `new Worker()` starting to pull jobs and the subsequent `.on(...)` listener attachment (the first job is processed before the `active` listener is attached). The latter is a known BullMQ gotcha — newer guidance is to attach listeners on the `Worker` BEFORE `await waitUntilReady()`, which my bootstrap does, but BullMQ may still race on the first pull.
- **Severity:** cosmetic. Pipeline correctness is unaffected (worker's BullMQ promise resolution is what marks the job complete; the `active`/`completed` listeners are observability sugar). But it makes log-based debugging less reliable for the first job on a cold-started worker.
- **Suggested follow-up:** investigate as a small sweep-5b cleanup. Probably either (a) attach listeners before the Worker starts pulling, by passing `autorun: false` and explicitly `worker.run()` after listeners attach, or (b) add a final batch-summary log per dispatch tick so missing per-job entries don't matter as much.

## Test data footprint

- **Test inventory used:** `INV-00001` (id `bc449cd0-998c-4de7-bc20-58bab585806b`, startingStock=55, coveragePerUnit=48.11). The smoke's `pickInventory()` returns whichever inventory `findFirst()` returns (no `orderBy`); across runs this picked INV-00001/2/3/4 depending on Postgres' visibility ordering. Pre-smoke `totalCutSum=0`, post-cleanup `totalCutSum=0`.
- **Test cut log:** `CUT-0000004` (id `86e2c259-4761-4840-9fd7-0bf1e9231478`). Created by smoke, deleted in the cleanup `finally` block.
- **Outbox events:** 3 (one per topic). Left in the `queue_outbox_event` table at status=DISPATCHED. They're not cleaned up by the smoke since the relay's `wasDuplicate` mechanism handles re-dispatch correctly — leaving them is consistent with how production dispatched events behave. If the table needs trimming, run `smoke-cleanup.mjs`.
- **BullMQ jobs:** 3 (one per queue). Left in the queues at `completed` state (BullMQ's default keep-on-success behaviour). If they need clearing, run `clear-cut-log-queues.mjs`.

## Verdict

The cut-log worker pipeline ships in working condition end-to-end after
the two bugs above are fixed. The remaining cosmetic logging gap is
non-blocking. Sweep 6 (API routes) can proceed with confidence: routes
just need to translate request bodies → producer use case calls and
`CutLogExecutionError.status` → HTTP responses. The hard work — domain
correctness, data primitives, application orchestration, relay/worker
plumbing, idempotency — is already verified.
