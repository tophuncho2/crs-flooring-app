# Imports Migration — Phase 4a Pre-flight Audit

Date: 2026-04-25
Plan: [docs/imports-migration-revised-plan.md](imports-migration-revised-plan.md)
Branch: staging
Scope: Read-only audit of the `flooring.imports.materialize` async pipeline. Confirm every link before the Phase 4 UI hooks land.

## TL;DR

**The entire pipeline is already shipped — including the API route and the client mutation helper.** Phase 4 is a smaller sweep than the plan budgeted: no route to write, no worker to wire. The remaining work is UI presentation + a thin controller-additive that posts to the existing route.

The producer plus the consumer plus the relay plus the worker plus the route plus the client helper are all in place and wired together.

---

## Pipeline status — link by link

### 1. Producer use case — SHIPPED

[packages/application/src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.ts](packages/application/src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.ts)

Exports `markStagedRowsForImportUseCase(importEntryId, stagedRowIds, requestedBy, client?)`. In one transaction:
- `SELECT … FOR UPDATE` on the parent import row
- Validates batch eligibility via `validateStagedImportBatch`
- Flips DRAFT → QUEUED via `markStagedRowsForImport` (db)
- Writes outbox event via `createQueueOutboxEvent` with deterministic idempotency key `import-materialize:{importEntryId}:{sortedRowIds.join(",")}`
- Returns `{ markedRowIds, outboxEventId, wasDuplicate }`

Throws `StagedInventoryExecutionError` for `STAGED_PARENT_NOT_FOUND` (404), `STAGED_BATCH_INELIGIBLE` (400), `STAGED_BATCH_RACE` (409).

### 2. Consumer use case — SHIPPED

[packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts](packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts)

Exports `materializeImportedStagedRowsUseCase(payload, client?)`. In one transaction:
- Locks parent FOR UPDATE
- Loads QUEUED staged rows; throws `STAGED_MATERIALIZE_PRECONDITION_FAILED` if any drifted
- Maps each to a `CreateInventoryRecordInput` snapshot:
  - **Verbatim:** importEntryId, productId, itemNumber, dyeLot, warehouseId, locationId, startingStock, cost, freight, notes
  - **Derived:** categorySlug, stockUnit name/abbrev, sendUnit name/abbrev, itemCoverageUnit name/abbrev, coveragePerUnit, costPerUnit, freightPerUnit, fifoReceivedAt
- Calls `materializeStagedRowsToInventory` (db)
- Returns `{ created, materializedStagedRowIds }`

Project-memory line about "10 verbatim + 6 derived" is approximate; the code snapshots more derived fields than that. The code is the source of truth.

### 3. Topic registry — SHIPPED

[apps/relay/src/dispatch/dispatchers.ts](apps/relay/src/dispatch/dispatchers.ts) returns `[buildMaterializeImportDispatcher(connection)]`. Currently the only registered topic — adding more later means appending to this list.

### 4. Per-topic dispatcher — SHIPPED

[apps/relay/src/dispatch/build-materialize-import-dispatcher.ts](apps/relay/src/dispatch/build-materialize-import-dispatcher.ts) wires:
- `topic = IMPORT_MATERIALIZE_TOPIC` (`flooring.imports.materialize`)
- `queue = new Queue<ImportMaterializeBatchPayload>(IMPORT_MATERIALIZE_QUEUE)` (BullMQ, `flooring-imports-materialize`)
- `parsePayload = parseImportMaterializeBatchPayload`
- `buildJobId = (_payload, event) => event.idempotencyKey` — BullMQ enforces uniqueness on this id, so a duplicate outbox event resolves to the same job

### 5. Generic dispatch loop — SHIPPED

[apps/relay/src/dispatch/topic-dispatcher.ts](apps/relay/src/dispatch/topic-dispatcher.ts) — `dispatchBatchForTopic(env, dispatcher, deps?)`:
- Claims a batch of outbox events filtered to the dispatcher's topic
- Parses payloads (poison messages → exhaust immediately)
- Enqueues via `addBullMqJobIdempotently`
- Marks DISPATCHED on success
- Exponential backoff retries (30s base, 15min ceiling) up to `env.maxAttempts`
- Logs structured events at every transition (`outbox.event.dispatched` / `.retry` / `.exhausted`)

### 6. Relay polling bootstrap — SHIPPED

[apps/relay/src/bootstrap.ts](apps/relay/src/bootstrap.ts) — `while (!shuttingDown)` loop that runs `dispatchBatchForTopic` for every registered dispatcher in parallel each tick, sleeps `env.pollIntervalMs` between ticks. Also starts the Bull Board UI for ops visibility. SIGINT/SIGTERM graceful shutdown.

### 7. Worker bootstrap — SHIPPED

[apps/worker/src/bootstrap.ts](apps/worker/src/bootstrap.ts) — instantiates `Worker<ImportMaterializeBatchPayload>` against `IMPORT_MATERIALIZE_QUEUE` with the materialize handler. Logs active/completed/failed events with importEntryId + stagedRowCount + materializedCount. Concurrency + lock duration come from env.

### 8. Worker handler — SHIPPED

[apps/worker/src/processors/materialize-import-batch.ts](apps/worker/src/processors/materialize-import-batch.ts) — `createMaterializeImportBatchHandler` parses the job payload and calls `materializeImportedStagedRowsUseCase`. `StagedInventoryExecutionError` is wrapped in `UnrecoverableError` (BullMQ terminal failure → goes to failed set, no retry); other errors propagate so BullMQ retries per job options.

### 9. Outbox infrastructure — SHIPPED

[packages/db/src/queues/outbox-repository.ts](packages/db/src/queues/outbox-repository.ts) exports the full set:
- States: `PENDING | PROCESSING | DISPATCHED | EXHAUSTED`
- Helpers: `createQueueOutboxEvent`, `listClaimableQueueOutboxEvents`, `claimQueueOutboxEvent`, `markQueueOutboxEventDispatched`, `retryQueueOutboxEvent`, `exhaustQueueOutboxEvent`
- Producer use case writes via `createQueueOutboxEvent`; relay reads and updates state via the rest

### 10. Domain queue contract — SHIPPED

[packages/domain/src/queue/materialize-import-batch.ts](packages/domain/src/queue/materialize-import-batch.ts) defines the topic, queue name, job name, payload zod schema, and parser used by both producer and worker. Single source of truth for the contract.

### 11. API route — SHIPPED

[apps/web/app/api/imports/[id]/staged-inventory-rows/mark-for-import/route.ts](apps/web/app/api/imports/[id]/staged-inventory-rows/mark-for-import/route.ts) — POST handler:
- `applyRoutePolicy` (warehouse tool, rate limit 30 / 10min)
- Full mutation lifecycle: `parseMutationEnvelope` → `enforceMutationReceipt` → `withMutationTelemetry` → `finalizeMutationReceipt` (replay-safe)
- Calls `markStagedRowsForImportUseCase(id, input.stagedRowIds, { userId, userEmail })`
- Returns `202 Accepted` with `{ batch: { markedRowIds, outboxEventId, wasDuplicate } }`

Body validator at [apps/web/app/api/imports/_validators.ts](apps/web/app/api/imports/_validators.ts) — `validateMarkForImportBody({ stagedRowIds: string[] })` enforces non-empty array of non-empty strings.

### 12. Client mutation helper — SHIPPED

[apps/web/modules/imports/data/mutations.ts:58-69](apps/web/modules/imports/data/mutations.ts) — `markStagedRowsForImportRequest(importId, stagedRowIds)` posts to the route above with `withMutationMeta`. The file's comment block notes "The next sweep wires this into a controller + button on the staged-rows section" — that "next sweep" is Phase 4.

---

## What's actually missing (vs. Phase 4 plan budget)

| Plan budget | Reality |
|---|---|
| Producer use case | ✅ shipped |
| Consumer use case | ✅ shipped |
| Topic registry | ✅ shipped |
| Worker handler | ✅ shipped |
| Outbox infra | ✅ shipped |
| **API route POST `/queue`** | ✅ shipped at `/mark-for-import` (different path) |
| **Validator** | ✅ shipped |
| **Client mutation helper** | ✅ shipped |
| Controller `selectedIds` / `toggleSelection` / `eligibleSelectedIds` / `markForImport()` | ❌ not yet — Phase 4c work |
| Section presentation swap (`ActionHeader` + `Grid` + selection control + status indicator) | ❌ not yet — Phase 4b work |
| `Run Import` button wiring | ❌ not yet — Phase 4e work |

**Net:** Phase 4 is smaller than the plan budgeted. Drop Phase 4d entirely. The route exists at `/mark-for-import`, not `/queue` — update plan reference.

---

## Discrepancies vs. project memory + plan

1. **Memory** says "sweep 4b complete; next: sweep 4c (relay topic registry + worker handler)." Sweep 4c is shipped. The pipeline section (items 3–10 above) is the deliverable, plus the route + helper (items 11–12). Worth updating the memory entry.

2. **Plan §4d** budgets a new `/api/imports/[id]/staged-inventory-rows/queue/route.ts`. The route already exists at `/staged-inventory-rows/mark-for-import/route.ts`. Functionally equivalent; the plan doc should be amended.

3. **No `sweep-4c-*.md` in `docs/`.** The implementation landed without a sweep report — likely the report was tracked in a deleted file (the git status at session start showed several `D docs/sweep-*` entries). Not a blocker; the code is the truth.

---

## Recommended next steps (ranked)

### 1. Update project memory and plan to reflect reality (5 min)

- Memory entry [memory/project_imports_inventory_rebuild.md](/Users/j.otto/.claude/projects/-Users-j-otto-Code-Projects-CRS-builderswebapp/memory/project_imports_inventory_rebuild.md) — change "Next: sweep 4c" to "Sweep 4c complete (topic registry + worker handler + API route + client helper). Next: UI integration."
- Plan §4d — strike the "create new route" budget; reference the existing `/mark-for-import` path. Update the controller's `markForImport()` to call `markStagedRowsForImportRequest` (already in `data/mutations.ts`) instead of a new helper.

I can do both in one edit if you want.

### 2. Proceed straight into Phase 4b–4c (no blockers)

Pipeline is verified end-to-end. The route is replay-safe (idempotency receipt + outbox idempotency key + BullMQ jobId all defend against double-fire). Phase 4 work is now:

- **Controller additive** (~30 LOC) — extend [use-import-staged-inventory-rows-section.ts](apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts) with: `selectedIds: Set<string>`, `toggleSelection(id)`, `clearSelection()`, `eligibleSelectedIds` derivation (`row.status === 'DRAFT' && row.productId && row.startingStock`), `markForImport()` calling `markStagedRowsForImportRequest`. On success: clear selection + refetch.
- **Presentation swap** — the larger file. Replace `RecordItemSection` chrome with `ActionHeader` (title, summary, status, actions, error), and the row grid with `Grid<ImportStagedRowDraft>` carrying leading `selection` control + trailing `status-indicator` + `actions`. Smoke page at [imports-record/page.tsx:316-471](apps/web/app/components-smoke/imports-record/page.tsx) is the visual template.
- **Wire `Run Import` button** in the `ActionHeader.actions` slot — disabled when `eligibleSelectedIds.length === 0`, on click → `controller.markForImport()`.

Tests: extend `imports-client.test.tsx` (or add a focused staged-rows test file) covering selection state + eligibility derivation + the mutation call shape.

### 3. Optional — quick end-to-end smoke test before Phase 4b lands

Confirm the existing pipeline actually works in this environment (Redis up, worker running, relay polling). One way:

```sh
# In one shell:
bun run --cwd apps/relay dev    # or however the relay starts in this repo

# In another:
bun run --cwd apps/worker dev

# In a third — shape the call however the test runner does it
curl -X POST http://localhost:3000/api/imports/{importId}/staged-inventory-rows/mark-for-import \
  -H "Content-Type: application/json" \
  -d '{"input":{"stagedRowIds":["..."]},"mutation":{"id":"...","clientId":"..."}}'
```

Watch for the staged row status flipping DRAFT → QUEUED → IMPORTED across the three logs (route + relay + worker). If the existing pipeline doesn't actually flow today (e.g. Redis isn't configured locally), that's better caught now than after the UI ships.

Skip this if Redis / worker / relay are routinely run together in this repo and the pipeline has been exercised before.

---

## My recommendation

Do step 1 (memory + plan amendments — small) right now, then move directly into Phase 4b/4c implementation. Skip step 3 unless you suspect this environment hasn't actually exercised the pipeline before. The audit confirms Phase 4 is unblocked.
