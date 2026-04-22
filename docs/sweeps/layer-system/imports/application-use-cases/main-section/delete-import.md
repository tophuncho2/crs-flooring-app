# deleteImportUseCase

`deleteImportUseCase(id: string, client?) → { deletedId: string }`

## Use case

### What it does
Hard-delete an import entry. Deleting an import **never cascades to inventory rows**; schema FK `onDelete: Restrict` on `FlooringInventory.importEntryId` enforces that physically. An import with any attached inventory row (regardless of `isImported` value or cut-log state) is undeletable. An import with `status === "FINAL"` is also undeletable, regardless of child-row presence.

### Lock scope
- `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` — the parent.

### Transport guard
`assertExpectedUpdatedAt` against import snapshot pre-transaction.

### Orchestration
1. Open transaction, lock import row.
2. `getImportDeleteState(id, tx)` inside the lock — O(1) short-circuit:
   ```sql
   SELECT e.status,
          EXISTS (SELECT 1 FROM flooring_inventory WHERE "importEntryId" = e.id) AS has_inventory
   FROM flooring_import_entry e WHERE e.id = $1;
   ```
   `EXISTS` stops at the first matching row, constant-time against the `flooring_inventory_importEntryId_idx` index.
3. Run `isImportDeleteBlocked({ status, hasInventory })`. On block, throw `ImportExecutionError({ code: "IMPORT_IN_USE", status: 409, message: buildImportDeleteBlockedMessage(reason) })`.
4. `deleteImportById(tx, id)` → `DELETE FROM flooring_import_entry WHERE id = $1`.
   - `assertNoImportInventoryCascade` is physically honored: Postgres either removes the import cleanly (no children) or refuses with `foreign_key_violation` (`P2003`). Inventory rows are **never touched** by this DELETE.
   - Belt + suspenders: if the domain check somehow missed a case, `P2003` rolls the transaction back and the use case translates to the same typed `IMPORT_IN_USE` error — the client sees one consistent 409 regardless of which layer caught it.

### Response
`{ deletedId: id }` (or `204 No Content` depending on route style).

### Relationship to inventory delete
If a user wants to delete an import that has inventory attached:
1. Remove the inventory rows first — either one-by-one via `deleteInventoryUseCase` (which has its own cut-log block) or in bulk via `saveImportInventoryRowsUseCase` with a `deleted: [...]` diff (allowed only while the import's `status !== "FINAL"`).
2. Then call `deleteImportUseCase` on the now-childless import.

The two use cases are independently audited, independently locked, and independently reversible. There is no "cascade delete import + its inventory" operation — by design.

## Domain

### `assertNoImportInventoryCascade` — schema-backed invariant
Asserts that an import delete never deletes, detaches, or reassigns any `FlooringInventory` row. Inventory has an independent lifecycle; an import delete either succeeds against a childless row or fails — it never *affects* children.

Enforcement is schema-level: FK `FlooringInventory.importEntry @relation(onDelete: Restrict)`. No SQL from application code.

Pairs with `isImportDeleteBlocked`: without this invariant, the delete-block rule has no point. Together they form a single coherent policy — "import delete never touches inventory, therefore import delete is only permitted when inventory is already absent."

### `isImportDeleteBlocked({ status, hasInventory })`
Returns `{ blocked: true, reason }` on either of:
- `status === "FINAL"` → reason `"STATUS_FINAL"`. Workflow rule; applies even if `hasInventory === false`.
- `hasInventory === true` → reason `"INVENTORY_PRESENT"`. Rule is **presence, not received-status**: a row with `isImported = false` blocks deletion the same as `isImported = true`. Cut-log references are subsumed — no inventory means no cut logs against it.

Otherwise returns `{ blocked: false }`.

### `buildImportDeleteBlockedMessage(reason)`
Maps the reason enum to a human-readable 409 body:
- `"STATUS_FINAL"` → `"This import is finalized and cannot be deleted."`
- `"INVENTORY_PRESENT"` → `"This import has inventory rows attached. Remove or reassign them before deleting the import."`
