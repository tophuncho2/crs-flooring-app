# Imports Domain — Rules

Pure predicate / invariant functions under `packages/domain/src/flooring/imports/import-rules.ts`. No I/O. Every rule is a reference-equality function you can call from any use case.

## `isImportStatus(value: unknown): value is ImportStatus`
Enum guard — returns `true` iff value is in `IMPORT_STATUS_VALUES`.

## `isImportTransportType(value: unknown): value is ImportTransportType`
Enum guard — returns `true` iff value is in `IMPORT_TRANSPORT_TYPE_VALUES`.

## `assertNoImportInventoryCascade` — schema-backed invariant
Asserts that an import delete never deletes, detaches, or reassigns any `FlooringInventory` row. Inventory has an independent lifecycle; an import delete either succeeds against a childless row or fails — it never *affects* children.

**Enforcement**: schema FK `FlooringInventory.importEntry @relation(onDelete: Restrict)`. No SQL comes from application code. A future migration that loosens this to `Cascade` or `SetNull` would break the invariant and render `isImportDeleteBlocked` meaningless.

**Why it lives here**: the pairing with `isImportDeleteBlocked` only makes sense if deleting an import is known to never touch children. Without this assertion the delete-block check has no purpose.

## `isImportDeleteBlocked({ status, hasInventory }): { blocked: boolean, reason?: ImportDeleteBlockedReason }`
Returns the block decision based on two inputs:

- `status === "FINAL"` → `{ blocked: true, reason: "STATUS_FINAL" }`. Workflow rule; applies even if `hasInventory === false`.
- `hasInventory === true` → `{ blocked: true, reason: "INVENTORY_PRESENT" }`. **Rule is presence, not received-status.** A row with `isImported = false` blocks the delete the same as `isImported = true`. Cut-log references are subsumed — if `hasInventory === false`, there are no inventory rows for cut logs to attach to.
- Otherwise → `{ blocked: false }`.

Pairs with `assertNoImportInventoryCascade`: the cascade-absence invariant says "import delete never touches inventory"; this rule says "therefore, deletion is only permitted when inventory is already absent." The pair is incoherent without both halves.

## `buildImportDeleteBlockedMessage(reason: ImportDeleteBlockedReason): string`
Maps reason enum to a human-readable 409 body:

- `"STATUS_FINAL"` → `"This import is finalized and cannot be deleted."`
- `"INVENTORY_PRESENT"` → `"This import has inventory rows attached. Remove or reassign them before deleting the import."`

## FIFO-anchor rule
Invariant, not a function: every inventory row added via an import diff has its `fifoReceivedAt` set to `importEntry.createdAt` — **never `now()`**, even for rows added hours or days after the import was created. The import is the FIFO anchor; later-added rows inherit the anchor.

Enforced in `saveImportInventoryRowsUseCase` (use case reads `importEntry.createdAt` during snapshot load and copies it into every added row's INSERT payload).

## Warehouse source-of-truth rule
For inventory rows added via an import diff: `inventory.warehouseId = resolvedLocation.warehouseId`. The import UI does not surface a per-row warehouse selector; warehouse is inherited from the chosen location's warehouse, which must match the import's warehouse (location-warehouse consistency is validated separately).

Enforced in `saveImportInventoryRowsUseCase`.
