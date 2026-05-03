# Cut-log finalization: dismantle worker, migrate to sync

## Context

The cut-log finalize flow is currently producer/outbox/relay/worker async:

- Producer use case validates the row and writes a `flooring.work-order.cut-log.finalize` outbox event in the same TX, returns `202 Accepted` with an `outboxEventId`.
- Relay polls the outbox, parses the payload, enqueues a BullMQ job.
- Worker processor consumes the job, locks the parent inventory `FOR UPDATE`, re-validates, then calls the data-layer primitive that stamps `before` / `after` / `finalCutSequence` and flips status to `FINAL`.
- Controller patches the row optimistically (`status = FINAL`, `isFinal = true`) and waits for the next page render to see the real stamped values.

Three confirmed reasons to rip this out:

1. The async pipeline has been a recurring source of debugging pain (most recent: BullMQ rejecting the colon-bearing idempotency key as a job id; the user's `unresolved` commit fixed jobId but finalize still doesn't behave reliably end-to-end). The unit-test coverage mocks the apply step so a broken pipeline still passes the worker handler test.
2. Finalize is a single-row, low-frequency, low-latency operation that is well-bounded inside one TX under one inventory lock. There is no work that *requires* async — no external API call, no long-running computation, no fan-out.
3. The optimistic-patch UI lies to the user — it shows `status = FINAL` immediately even if the worker fails downstream. Sync execution removes the lie: the response carries the truthful stamped row.

Outcome: one synchronous use case under the inventory lock; producer/outbox/relay/worker machinery deleted; UI receives the real stamped row in the response.

## Confirmed decisions

- **Full teardown.** Drop the producer outbox emit, the relay dispatcher + its registration, the worker processor + registration + env vars, the worker test, the diag script, and the domain queue contract (topic + payload schema). No audit-only outbox event.
- **Drop `requestKey`** from the API request, transport, and controller (`${cutLogId}:${Date.now()}`). Idempotency comes from `canFinalizeCutLog` predicate (rejects already-FINAL rows) plus the existing `enforceMutationReceipt` window.
- **Fold `apply-finalize-work-order-cut-log.ts` into the producer file.** `finalize-work-order-cut-log.ts` becomes the single use case.

## Layer-ordered execution

The teardown is reordered so each intermediate step typechecks (producer rewrite first → relay → worker → domain contract). Schema/domain/data don't change.

### Step 1 — Application: rewrite as sync (fold apply into producer)

**Edit:** [packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log.ts](packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log.ts)

Replace body with single-TX sync flow:

1. `findUnique({ select: { inventoryId: true } })` to get the inventory id.
2. `lockInventoryForCutLog(c, inventoryId)` (data-layer primitive in [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts)).
3. Re-read row under the lock with the validation select (`id`, `cutLogNumber`, `workOrderId`, `workOrderItemId`, `status`, `isFinal`, `void`, `cut`).
4. Terminal errors (no `alreadyResolved` no-op paths — those existed only for worker replay):
   - row missing → `WORK_ORDER_CUT_LOG_NOT_FOUND` / 404
   - linkage drift (`workOrderId` mismatch or null `workOrderItemId`) → `WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH` / **400** (match existing producer; sync flow has no race that justifies 409)
   - `canFinalizeCutLog === false` (incl. already FINAL/VOID) → `WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED` / 409. **This is the new home of double-click protection.**
5. `applyFinalizeWorkOrderCutLog(c, { cutLogId })` from `@builders/db` (kept as-is in `write-repository.ts`).
6. `assertBeforeCutAfterInvariant({ before, cut, after })` on the stamped row.
7. Re-read the full normalized row via the existing canonical read so the response matches the create/update `cutLog` shape.
8. Return `{ cutLog: CutLogRecord }`.

**Why no `recomputeAndPersistTotalCutSums`:** `cut` is identical pre/post finalize, so `totalCutSum` is unchanged. The existing apply file already documents this.

**Update types** in same dir: drop `requestKey` and `requestedBy` from `FinalizeWorkOrderCutLogInput`; replace `FinalizeWorkOrderCutLogResult` with `{ cutLog: CutLogRecord }`.

**Drop:** outbox emit, `createQueueOutboxEvent` import, `FINALIZE_WORK_ORDER_CUT_LOG_TOPIC` + `FinalizeWorkOrderCutLogPayloadSchema` imports.

**Delete:** [packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log.ts](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log.ts).

**Update:** [packages/application/src/flooring/work-orders/cut-logs/index.ts](packages/application/src/flooring/work-orders/cut-logs/index.ts) — remove the `apply-finalize-work-order-cut-log.js` export line.

After this step the producer no longer writes outbox rows; relay still polls but finds nothing new; worker still consumes prior backlog (if any).

### Step 2 — Relay teardown

**Delete:** [apps/relay/src/dispatch/build-finalize-work-order-cut-log-dispatcher.ts](apps/relay/src/dispatch/build-finalize-work-order-cut-log-dispatcher.ts)

**Edit:** [apps/relay/src/dispatch/dispatchers.ts](apps/relay/src/dispatch/dispatchers.ts) — drop the import and the `buildFinalizeWorkOrderCutLogDispatcher(connection),` entry. The two sibling dispatchers (`materialize-import`, `work-order-file-generation`) stay.

### Step 3 — Worker teardown

**Delete:**
- [apps/worker/src/processors/finalize-work-order-cut-log.ts](apps/worker/src/processors/finalize-work-order-cut-log.ts)
- [apps/worker/tests/finalize-work-order-cut-log.test.ts](apps/worker/tests/finalize-work-order-cut-log.test.ts)
- [apps/worker/diag-inspect.mjs](apps/worker/diag-inspect.mjs) (one-shot debug script; verify nothing in `package.json` scripts references it)

**Edit:** [apps/worker/src/bootstrap.ts](apps/worker/src/bootstrap.ts)
- Drop `FINALIZE_WORK_ORDER_CUT_LOG_QUEUE` / `FinalizeWorkOrderCutLogPayload` from the `@builders/domain` import.
- Drop `createFinalizeWorkOrderCutLogHandler` import.
- Delete the entire "Work order finalize cut-log (single-row)" worker setup block (~lines 99–176).
- Remove the two `woFinalizeCutLog*.waitUntilReady()` lines in the `Promise.all([...])`.
- Remove `void woFinalizeCutLogWorker.run()`.
- Remove `FINALIZE_WORK_ORDER_CUT_LOG_QUEUE` from the worker-ready log's `queues` array; drop `workOrderFinalizeCutLog:` entries from `concurrency` + `lockDurationMs` log fields.
- Remove the two `woFinalizeCutLog*.close()` lines from the shutdown handler.

Sibling workers (`materializeWorker`, `woFileGenWorker`) reuse the same shared imports (`getDatabaseEnvironment`, `Worker`, `QueueEvents`, etc.) — unaffected.

**Edit:** [apps/worker/src/env.ts](apps/worker/src/env.ts) — drop `WORK_ORDER_FINALIZE_CUT_LOG_WORKER_CONCURRENCY` and `WORK_ORDER_FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS` from the schema, type, and `getWorkerEnvironment` parser.

### Step 4 — Domain queue contract delete

**Delete:** [packages/domain/src/queue/finalize-work-order-cut-log.ts](packages/domain/src/queue/finalize-work-order-cut-log.ts)

**Edit:** [packages/domain/src/index.ts](packages/domain/src/index.ts) — remove the `export * from "./queue/finalize-work-order-cut-log.js"` line.

After steps 1–3 nothing else imports `FINALIZE_WORK_ORDER_CUT_LOG_TOPIC`, `_QUEUE`, `_JOB_NAME`, `FinalizeWorkOrderCutLogPayloadSchema`, `parseFinalizeWorkOrderCutLogPayload`, or `FinalizeWorkOrderCutLogPayload` (sessions/archived docs are not compiled).

### Step 5 — Validator

**Edit:** [apps/web/app/api/work-orders/_validators.ts](apps/web/app/api/work-orders/_validators.ts) (lines 272–284)

- `ValidatedFinalizeWorkOrderCutLogInput` → `{ cutLogId: string }`.
- `validateFinalizeWorkOrderCutLogInput` → drop the `requireString(body.requestKey, ...)` line.

### Step 6 — API route

**Edit:** [apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts](apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts)

- Drop the `requestedBy` line.
- Use case call: `finalizeWorkOrderCutLogUseCase({ workOrderId, cutLogId: input.cutLogId })`.
- Response body: `result` (which is `{ cutLog }`).
- Status: **200** in `finalizeMutationReceipt` and `routeJson` (drop the explicit `{ status: 202 }`).
- Update the docblock to describe the sync flow.
- Update telemetry message from `"Work-order cut-log finalize queued"` → `"Work-order cut-log finalized"` (action name stays the same — same scope used by `enforceMutationReceipt`).

`WorkOrderCutLogExecutionError` → `routeError` mapping is already clean: `normalizePrismaError` in `api-helpers.ts` surfaces any error with numeric `status` 400–499 cleanly. No new error mapping.

### Step 7 — Transport

**Edit:** [apps/web/modules/work-orders/data/mutations.ts](apps/web/modules/work-orders/data/mutations.ts) (lines 165–190)

- `FinalizeCutLogResponse` → `{ cutLog: CutLogRow }`.
- `finalizeWorkOrderCutLogRequest` → drop `requestKey` from args; body is `withMutationMeta({ cutLogId: args.cutLogId })`.

### Step 8 — Controller

**Edit:** [apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts](apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts) (lines 266–288)

- `finalizeMutation.mutationFn`: drop `requestKey`. Call becomes `finalizeWorkOrderCutLogRequest({ workOrderId, cutLogId: input.cutLog.id })`.
- `onSuccess`: replace the optimistic-patch construction with `publish({ kind: "upsert", workOrderItemId: variables.workOrderItemId, cutLog: response.cutLog })`. Rename `_response` → `response`. `setOpen(null)` stays.
- Keep the `isDirty` guard on Finalize (line 321): the "unsaved edits would be discarded" semantics are independent of sync vs async.

## Verification

1. Typecheck: `npm run -w packages/application typecheck` then root typecheck (Turbo will hit `@builders/domain`, `apps/web`, `apps/worker`, `apps/relay`).
2. `npm run -w apps/worker test` — finalize test gone; sibling tests unaffected.
3. `npm run -w packages/application test` if any finalize specs exist (`find packages/application -name "*finalize*test*"` to confirm).
4. `npm run -w apps/relay test` — `topic-dispatcher.test.ts` is generic, should still pass.
5. **Manual smoke test:** open work-order record view → expand a material item with a PENDING cut log → click Finalize → confirm:
   - Network response is **200** (not 202) with body `{ cutLog: { ..., status: "FINAL", before, after, finalCutSequence } }`.
   - Side panel closes.
   - Row in the section reflects FINAL with the real `before` / `after` / `finalCutSequence` (not the optimistic guess).
6. `SELECT COUNT(*) FROM flooring_outbox_event WHERE topic = 'flooring.work-order.cut-log.finalize' AND created_at > now() - interval '5 minutes';` returns 0 after smoke.
7. Double-click guard: open the same row in two tabs, finalize in both — second call returns 409 with `payload.code = "WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED"`. Confirms `canFinalizeCutLog` carries the idempotency role formerly held by `requestKey`.

## Deploy-time backlog cleanup (one-shot, not a code step)

After deploy, any `flooring_outbox_event` rows still PENDING/PROCESSING for `topic = 'flooring.work-order.cut-log.finalize'` are orphaned (no relay polls, no worker drains). Run once against the live DB:

```sql
UPDATE flooring_outbox_event
SET status = 'EXHAUSTED', exhausted_at = now()
WHERE topic = 'flooring.work-order.cut-log.finalize'
  AND status IN ('PENDING', 'PROCESSING');
```

(Confirm column names against the actual outbox schema before running.) The Redis BullMQ queue `flooring-work-order-cut-log-finalize` can be deleted post-deploy — BullMQ tolerates orphan queues, this is cosmetic.

## Concerns / out-of-scope flags

1. **Rate limit.** Finalize is currently `30 / 10min`. Sync execution is one short TX under one row lock — you may want to raise this. **Out of scope; flagging only.**
2. **`enforceMutationReceipt` window.** Receipt key includes route + body hash, so a fast double-click within the window gets the cached 409 echo and a slower duplicate gets a fresh 409. Both paths are clean.
3. **`WorkOrderCutLogErrorCode` union.** `WORK_ORDER_CUT_LOG_NOT_PENDING` and `WORK_ORDER_CUT_LOG_STALE` are unused by the new finalize but used by update/delete. Don't prune the union.
4. **Re-read at the end of step 1.** One extra round-trip vs constructing the response from in-memory data. Recommendation: do the re-read — single source of truth for row shape, matches create/update.
5. **`diag-inspect.mjs`.** Quick `grep -rn diag-inspect` before deletion to confirm no `package.json` script references it.

## Critical files

- [packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log.ts](packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log.ts) — rewrite
- [packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log.ts](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log.ts) — delete
- [packages/application/src/flooring/work-orders/cut-logs/index.ts](packages/application/src/flooring/work-orders/cut-logs/index.ts)
- [packages/application/src/flooring/work-orders/cut-logs/types.ts](packages/application/src/flooring/work-orders/cut-logs/types.ts)
- [packages/domain/src/queue/finalize-work-order-cut-log.ts](packages/domain/src/queue/finalize-work-order-cut-log.ts) — delete
- [packages/domain/src/index.ts](packages/domain/src/index.ts)
- [apps/relay/src/dispatch/build-finalize-work-order-cut-log-dispatcher.ts](apps/relay/src/dispatch/build-finalize-work-order-cut-log-dispatcher.ts) — delete
- [apps/relay/src/dispatch/dispatchers.ts](apps/relay/src/dispatch/dispatchers.ts)
- [apps/worker/src/processors/finalize-work-order-cut-log.ts](apps/worker/src/processors/finalize-work-order-cut-log.ts) — delete
- [apps/worker/tests/finalize-work-order-cut-log.test.ts](apps/worker/tests/finalize-work-order-cut-log.test.ts) — delete
- [apps/worker/diag-inspect.mjs](apps/worker/diag-inspect.mjs) — delete
- [apps/worker/src/bootstrap.ts](apps/worker/src/bootstrap.ts)
- [apps/worker/src/env.ts](apps/worker/src/env.ts)
- [apps/web/app/api/work-orders/_validators.ts](apps/web/app/api/work-orders/_validators.ts)
- [apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts](apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts)
- [apps/web/modules/work-orders/data/mutations.ts](apps/web/modules/work-orders/data/mutations.ts)
- [apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts](apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts)
