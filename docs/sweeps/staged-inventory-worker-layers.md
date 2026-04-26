# Staged Inventory Workers — Layer Checklist

## 1. Domain
- [ ] `packages/domain/src/flooring/imports/staged-inventory-rows/import-batch-rules.ts` — `validateStagedImportBatch`
- [ ] `packages/domain/src/flooring/imports/staged-inventory-rows/editability.ts` — importability checks
- [ ] `packages/domain/src/flooring/imports/staged-inventory-rows/types.ts` — `StagedInventoryRow`, `StagedImportBatchValidationIssue`
- [ ] `packages/domain/src/queue/materialize-import-batch.ts` — `ImportMaterializeBatchPayload`, topic/queue/job constants

## 2. Data
- [ ] `packages/db/src/flooring/imports/staged-inventory-rows/write-repository.ts` — `markStagedRowsForImport`
- [ ] `packages/db/src/flooring/imports/staged-inventory-rows/read-repository.ts` — `listStagedInventoryByImport`, `listStagedInventoryForMaterialization`
- [ ] `packages/db/src/flooring/inventory/write-repository.ts` — `materializeStagedRowsToInventory`
- [ ] `packages/db/src/queues/outbox-repository.ts` — `createQueueOutboxEvent`
- [ ] `packages/db/prisma/schema.prisma` — `FlooringImportStagedInventoryRow`, `FlooringInventory`, `QueueOutboxEvent`

## 3. Use Case
- [ ] `packages/application/src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.ts` — `markStagedRowsForImportUseCase`
- [ ] `packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts` — `materializeImportedStagedRowsUseCase`

## 4. Outbox / Relay / Worker
- [ ] `apps/relay/src/dispatch/build-materialize-import-dispatcher.ts` — `buildMaterializeImportDispatcher`
- [ ] `apps/relay/src/dispatch/topic-dispatcher.ts` — generic outbox→queue bridge
- [ ] `apps/worker/src/processors/materialize-import-batch.ts` — `createMaterializeImportBatchHandler`, `processMaterializeImportBatchJob`

## 5. API
- [ ] `apps/web/app/api/imports/[id]/staged-inventory-rows/mark-for-import/route.ts` — `POST`
- [ ] `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts` — frontend controller

---

## "Run Import" Click — Layers Hit (in order)

1. **API** — `POST /api/imports/[id]/staged-inventory-rows/mark-for-import`
2. **Use Case** — `markStagedRowsForImportUseCase` (locks import, orchestrates txn)
3. **Domain** — `validateStagedImportBatch` (batch rule check)
4. **Data** — `markStagedRowsForImport` (rows: DRAFT → QUEUED)
5. **Outbox (write)** — `createQueueOutboxEvent` with `ImportMaterializeBatchPayload`
6. **Relay** — `buildMaterializeImportDispatcher` claims event, enqueues BullMQ job on `flooring-imports-materialize`
7. **Worker** — `processMaterializeImportBatchJob` consumes job
8. **Use Case** — `materializeImportedStagedRowsUseCase` (idempotency guard, cost/freight per unit, build inventory inputs)
9. **Data** — `materializeStagedRowsToInventory` (INSERT inventory + UPDATE staged rows: QUEUED → IMPORTED, atomic)
