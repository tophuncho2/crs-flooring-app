# Execution Log — Work Orders Sweep

Plan: [work-orders-sweep-plan.md](work-orders-sweep-plan.md) — locked.

| Sub-sweep | Status | Commit |
|---|---|---|
| 7a — Schema (WOMI status enum) | ✅ DONE | `67045274` |
| 7b — Domain (primary + MI subdir + cut-log payloads) | ✅ DONE | `1aaa6bab` |
| 7c — Domain (file-gen) | ✅ DONE | `62a94e63`, amended `f42f1ee9` (PDF columns), `2b81ccb9` (inventory cell) |
| 7d — Data | ✅ DONE | `ae9c8ea7` |
| 7e — Application (primary) | ✅ DONE | (pending git commit) |
| 7f — Application (MI + cut-logs) | pending | — |
| 7g — Application (file-gen) | pending | — |
| 7h — Worker/Relay | pending | — |
| 7i — API | pending | — |
| 7j — Engine off-ramp | pending | — |
| 7k — Module dir UI | pending | — |
| 7l — Dashboard pages | pending | — |

---

## 7a — Schema (DONE, committed `67045274`)

| Step | Result |
|---|---|
| Edit `schema.prisma` — add `FlooringWorkOrderItemStatus` enum (IDLE / SAVING_CUTS / FINALIZING / FAILED) after existing `FlooringWorkOrderStatus` | ✅ |
| Edit `FlooringWorkOrderItem` — add `status FlooringWorkOrderItemStatus @default(IDLE)` field | ✅ |
| Author migration `packages/db/prisma/migrations/20260429160000_add_work_order_item_status/migration.sql` (CreateEnum + ALTER TABLE ADD COLUMN with default) | ✅ |
| `npm run db:deploy` (= `npx prisma migrate deploy`) → Railway staging via .env | ✅ exit 0 — applied to `shortline.proxy.rlwy.net:22153` |
| `npm run db:generate` (= `npx prisma generate`) | ✅ exit 0 |
| `npx prisma migrate status` | ✅ exit 0 — "Database schema is up to date!" |
| `npm run build --workspace @builders/db` | ✅ exit 0 |

**Working tree changes (commit 7a):**
- `packages/db/prisma/schema.prisma` — enum + field added
- `packages/db/prisma/migrations/20260429160000_add_work_order_item_status/migration.sql` — new
- Generated dist artifacts under `packages/db/dist/` (per repo convention from `21aea69`)

**Open issues:** none.

---

---

## 7b — Domain primary + material-items + cut-log payloads (DONE, committed `1aaa6bab`)

| Step | Result |
|---|---|
| Rewrite `types.ts` — surface `status`, sync snapshots, joined property fields on detail; drop `propertyInstructions` (live-derived); WorkOrderForm excludes status | ✅ |
| Rewrite `normalizers.ts` — map joined property fields + sync snapshots | ✅ |
| Rewrite `form-rules.ts` — require propertyId AND warehouseId | ✅ |
| Update `error-messages.ts` — add warehouse-locked + cut-log-write-failed + file-gen-failed | ✅ |
| New `errors.ts` — `WorkOrderDomainError` class + 4 error codes | ✅ |
| New `lock-rules.ts` — `assertWorkOrderWarehouseChangeAllowed` throws `WORK_ORDER_WAREHOUSE_LOCKED` | ✅ |
| New `material-items/{types,rules,normalizers,diff-rules,status-rules,index}.ts` (6 files) | ✅ |
| New queue payload `save-work-order-item-pending-cut-log-diff.ts` (per-WOMI; cost+freight absent) | ✅ |
| New queue payload `finalize-work-order-cut-log-batch.ts` (WO-scoped batch) | ✅ |
| Update `index.ts` (WO + queue re-exports) | ✅ |
| `npm run typecheck --workspace @builders/domain` | ✅ exit 0 |
| `npm run build --workspace @builders/domain` | ✅ exit 0 |

**Expected DB layer errors remaining (deferred to 7d rewrite):** 4 errors in `packages/db/src/flooring/work-orders/{read-repository,write-repository}.ts` — selects don't include the new fields the rewritten normalizers require. Will be cleared by 7d.

**Open issues:** none.

---

## 7c — Domain file generation (DONE, committed `62a94e63` + amendments)

| Step | Result |
|---|---|
| New `flooring/work-orders/file-generation/types.ts` — `WorkOrderFileGenerationInput` joined input shape (WO row + property + WOMIs + cut logs grouped per WOMI) + `WorkOrderFileMaterialItemProjection` + `WorkOrderFileCutLogProjection` | ✅ |
| New `flooring/work-orders/file-generation/build-work-order-pdf-html.ts` — pure projection from input → printable HTML; no I/O; inline-styled so the rendered PDF doesn't depend on external CSS; every dynamic value escapes via `escapeHtml` | ✅ |
| New `flooring/work-orders/file-generation/index.ts` — re-exports | ✅ |
| New queue payload `queue/generate-work-order-file.ts` — topic `flooring.work-order.file-generation.requested`; payload `{ version, topic, workOrderId, fileId, requestedBy, requestedAt }`; mirrors `void-cut-log.ts` shape | ✅ |
| Update `flooring/work-orders/index.ts` — re-export `file-generation/` | ✅ |
| Update `domain/src/index.ts` — re-export `queue/generate-work-order-file.js` | ✅ |
| `npm run typecheck --workspace @builders/domain` | ✅ exit 0 |
| `npm run build --workspace @builders/domain` | ✅ exit 0 |

**Design notes:**

- `WorkOrderFileGenerationInput` carries `customAddress`, joined `property.streetAddress/city/state/postalCode`, joined `property.instructions`. Builder uses `customAddress` if present, else falls back to formatted property address.
- HTML body emits sections only when content exists (instructions, description, notes, cut-log sub-tables) so empty PDFs stay tight.
- Cut log row uses CSS class per status (`cut-log-pending` / `cut-log-final` / `cut-log-void`) — voids render struck-through and grey.
- Per locked decision #4: PDF is the snapshot. No JSONB or snapshot tables. Worker reads live joined data at render time via `getWorkOrderForFileGeneration` (authored in 7d).

**Open issues:** none.

---

## 7d — Data layer (DONE, committed `ae9c8ea7`)

### Pre-flight audit confirmed

- Zero external consumers of the existing WO data exports (verified via grep across `packages/` + `apps/`). Safe full rewrite.
- Two dead `propertyInstructions` references in pre-rewrite `shared.ts:32` + `write-repository.ts:16/31/41`. Cleared by the rewrite.
- Subdirs `material-items/`, `files/`, `cut-logs/` did not exist — clean slate.

### Files rewritten (3)

| File | Changes |
|---|---|
| `packages/db/src/flooring/work-orders/shared.ts` | Split `workOrderListSelect` (lightweight `property: { name }`) and `workOrderDetailSelect` (full property join with address + instructions). Both surface `status`, `description`, `scheduledFor`. Detail also pulls sync snapshot columns. Drops `propertyInstructions`. |
| `read-repository.ts` | `listWorkOrders`, `listWorkOrderOptions`, `getWorkOrderById` (list shape — existence + lock context), `getWorkOrderDetailById` (full detail), `countWorkOrders`, `countWorkOrderCutLogs` (warehouse-change-lock predicate input), and the big one — `getWorkOrderForFileGeneration` projecting directly to `WorkOrderFileGenerationInput` with joined inventory location codes via `formatFullLocationCode`. |
| `write-repository.ts` | `CreateWorkOrderRecordInput` omits `status` + sync snapshots (worker-controlled). `Update` is `Partial<Create>`. New `markWorkOrderStatus` for the file-gen lifecycle. |

### Files created (8)

| Path | Exports |
|---|---|
| `material-items/read-repository.ts` | `listWorkOrderMaterialItems`, `countCutLogsByWorkOrderItemIds`, `listEligibleInventoryForWorkOrderItem` (warehouse + product match + remaining stock > 0, formatted location code). |
| `material-items/write-repository.ts` | `WriteWorkOrderMaterialItemInput`, CRUD record functions, `applyWorkOrderMaterialItemsDiff` — **nulls cut-log links (both columns) inside the TX before deleting any WOMI row** to keep `assertCutLogLinkageSymmetry` satisfied; `markWorkOrderItemStatus`. |
| `material-items/index.ts` | Re-exports. |
| `files/read-repository.ts` | `listWorkOrderFiles`, `getWorkOrderFileById`. |
| `files/write-repository.ts` | `createWorkOrderFile` (max+1 fileNumber, status=QUEUED), `markWorkOrderFileWorking/Completed/Failed`, `deleteWorkOrderFile`. |
| `files/index.ts` | Re-exports. |
| `cut-logs/read-repository.ts` | `listCutLogsForWorkOrderItem`, `getInventoriesForCutLogDiff`, `getInventoriesForCutLogIds`, `listCutLogsForInventoryIds`. |
| `cut-logs/write-repository.ts` | **`lockInventoriesForCutLogBatch`** (first multi-inventory locker in the codebase — sorts ascending, single `SELECT FOR UPDATE` over `id = ANY($1::uuid[])`), `applyWorkOrderItemCutLogPendingDiff` (stamps both link columns; computes per-inventory before/after under lock; cost+freight always null), `applyFinalizeWorkOrderCutLogBatch` (per-inventory `finalCutSequence` from max+1), `recomputeAndPersistTotalCutSums` (uses domain's pure `computeTotalCutSum`). |
| `cut-logs/index.ts` | Re-exports. |
| `flooring/work-orders/index.ts` | Re-exports the 3 new subdirs. |

### Verification gates

| Gate | Result |
|---|---|
| `npm run typecheck --workspace @builders/db` | ✅ exit 0 |
| `npm run build --workspace @builders/db` | ✅ exit 0 |
| `npm run typecheck --workspace @builders/application` | ✅ exit 0 (no regressions; application doesn't reference WO yet — that's 7e/7f/7g) |

### Notable design points

1. **Multi-inventory locking**: `lockInventoriesForCutLogBatch` deduplicates + sorts the id set before the FOR UPDATE. Deterministic ordering eliminates deadlock risk between concurrent WOMI cut-log writes that touch overlapping inventories.
2. **before/after computation**: For a pending diff that adds N drafts to inventory I, we read I's current `(startingStock, totalCutSum)` once inside the locked TX, then compute each draft's `before` = previous remaining and `after` = `before - cut`, threading the running remaining through the drafts in order. Application layer revalidates via `assertCutSumWithinStartingStock` after `recomputeAndPersistTotalCutSums` returns.
3. **WOMI delete via section save unlinks cut logs**: `applyWorkOrderMaterialItemsDiff` runs `flooringCutLog.updateMany({ where: { workOrderItemId IN deletedIds }, data: { workOrderId: null, workOrderItemId: null } })` before the WOMI deleteMany, all in the same TX. Symmetry preserved.
4. **`getWorkOrderForFileGeneration` returns the domain projection directly**: Keeps the file-gen worker's call shape minimal — read once, hand to `buildWorkOrderPdfHtml`. Data-layer carve-out for pure domain helpers (per CLAUDE.md) covers this — `formatFullLocationCode` is a pure formatter.
5. **No application-layer business logic leaked into data**: All status flips are thin row updates. Transition validity (`assertWorkOrderItemStatusTransition`) is the application layer's call.

**Open issues:** none.

---

## 7e — Application primary use cases (DONE, awaiting commit)

Created the WO application directory at `packages/application/src/flooring/work-orders/`. API + validators are NOT touched in this layer per user direction; that's 7i.

### Files created (6)

| File | Purpose |
|---|---|
| `errors.ts` | `WorkOrderExecutionError` class + 6 codes (validation, not-found, warehouse-locked, item-status-transition, cut-log-write-failed, file-gen-failed). Mirrors `TemplateExecutionError`'s shape. |
| `types.ts` | `CreateWorkOrderUseCaseInput = CreateWorkOrderRecordInput` (alias). `UpdateWorkOrderUseCaseInput = UpdateWorkOrderRecordInput`. `WorkOrderUseCaseResult = WorkOrderDetail`. |
| `create-work-order.ts` | Opens TX, validates required fields (propertyId + warehouseId), delegates to `createWorkOrderRecord`. |
| `update-work-order.ts` | Opens TX. Trims propertyId / warehouseId if patched. **Warehouse change lock**: if `input.warehouseId` is in patch, reads current via `getWorkOrderById`, calls `countWorkOrderCutLogs`, runs `assertWorkOrderWarehouseChangeAllowed`. Catches `WorkOrderDomainError("WORK_ORDER_WAREHOUSE_LOCKED")` and converts to `WorkOrderExecutionError` status 409. P2025 → 404. |
| `delete-work-order.ts` | Opens TX, calls `deleteWorkOrderRecordById`. Schema cascade unlinks cut logs (WO `onDelete: Cascade` to WOMI; WOMI `onDelete: SetNull` to cut log; WO `onDelete: SetNull` to cut log) — both link columns end up null together so `assertCutLogLinkageSymmetry` is satisfied without app-side null updates. P2025 → 404. |
| `index.ts` | Re-exports. |

`packages/application/src/index.ts` adds the workspace re-export between warehouses and management-companies entries.

### Verification gates

| Gate | Result |
|---|---|
| `npm run typecheck --workspace @builders/application` | ✅ exit 0 |
| `npm run build --workspace @builders/application` | ✅ exit 0 |

### Notable design points

1. **No HTTP concerns**: zero Request/Response/status imports. Status codes are carried as numbers on `WorkOrderExecutionError.status` for the API layer (7i) to translate.
2. **Transactions**: every use case wraps via `withDatabaseTransaction(...)`. The `client?` parameter allows callers (typically other use cases) to share an existing TX.
3. **Domain rule routing**: `assertWorkOrderWarehouseChangeAllowed` is the only domain throw in the primary flow. Caught + rethrown as the application error. Validation strings imported from `@builders/domain` (single source of truth).
4. **Delete is unblocked**: per the locked sweep decision, WO deletion no longer asserts a cut-log count; the schema's SetNull cascade is the unlink mechanism. Comment in the use case documents the chain.

**Open issues:** none.

---

## Notes

- Per CLAUDE.md: schema lands alone in its own commit; subsequent sub-sweeps may bundle related changes per layer.
- Plan + this execution file live at `a-branch/` per project convention.
- 7b's gate per the plan was domain typecheck only (data + application + web are deferred to their own sub-sweeps); the 4 DB errors above are the expected leftover surface.
