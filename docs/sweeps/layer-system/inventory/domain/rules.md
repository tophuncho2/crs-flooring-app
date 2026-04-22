# Inventory Domain — Rules

Pure predicate / invariant functions under `packages/domain/src/flooring/inventory/inventory-rules.ts`.

## `isInventoryDeleteBlocked({ cutLogCount }): { blocked: boolean, reason?: InventoryDeleteBlockedReason }`
- `cutLogCount > 0` → `{ blocked: true, reason: "CUT_LOGS_PRESENT" }`.
- Otherwise → `{ blocked: false }`.

Default policy is block; cascade deletion of an inventory row with cut history is never exposed. Physical receiving history is preserved by forcing users to zero the cut logs first.

## `buildInventoryDeleteBlockedMessage(reason): string`
Maps reason enum to a human-readable 409 body message.

## `assertLocationBelongsToWarehouse(location, warehouseId)`
Invariant: if both `warehouseId` and `locationId` are set on an inventory row, the location's own `warehouseId` must match the row's. Applied at create / update time by resolving the location row and comparing.

Throws `InventoryExecutionError({ code: "INVENTORY_LOCATION_WAREHOUSE_MISMATCH", status: 400 })` on mismatch.

## `computeStockAvailable({ stockCount, cutLogs })` — invariant + derivation
Returns `stockCount − SUM(cutLogs.cut)` (cuts counted regardless of status). **Asserts `result >= 0`** — any diff that would drive it negative is rejected by the use case with `CUT_LOG_EXCEEDS_STARTING_BALANCE`.

Also exported as a pure value (no assertion) via `computeStockAvailableValue` when callers just want the number without the check.

## `computeAwaitingCut(cutLogs): number`
`SUM(cutLogs.cut) FILTER (WHERE status === "PENDING")`. Pure value; no invariant.

## `canAddCutLog(inventory): boolean`
Gate for cut-log creation. Returns `inventory.isImported === true`. Both parent paths (`saveInventoryCutLogsUseCase`, `saveWorkOrderMaterialItemsUseCase`) call this on every added cut log; throws `CUT_LOG_INVENTORY_NOT_IMPORTED` if false.

Existing cut logs on a row whose `isImported` later flips back to `false` are **preserved** — only new creation is gated. The rule evaluates at write time, not retroactively.

## `stockCount >= 0`
Trivial but enforced: validator rejects negative starting balance at create / update.

## Stock-count reduction guard (in `updateInventoryUseCase`)
Not a standalone function; a composed check. If the update's new `stockCount` is less than current, the use case must verify `newStockCount >= SUM(cutLogs.cut)`. Same invariant as `computeStockAvailable`, evaluated against the proposed new balance. Throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` if the reduction would violate it.
