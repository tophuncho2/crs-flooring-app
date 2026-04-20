# deleteImportUseCase

`deleteImportUseCase(id: string, client?) → { deletedId: string }`

## What it does
Hard-delete an import entry. Workflow-immutability and inventory-presence rules enforced by the domain; schema FK `onDelete: Restrict` is the physical backstop. Never cascades to children.

## Lock scope
- `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` — the parent.

## Transport guard (pre-transaction)
`assertExpectedUpdatedAt` against import snapshot.

## Domain rules orchestrated

### `assertNoImportInventoryCascade` — schema-backed invariant
**What it asserts**: deleting an import never deletes, detaches, or reassigns any `FlooringInventory` row. Inventory has an independent lifecycle; an import delete either succeeds against a row with zero children or fails — it never *affects* children.

**Why it exists in the domain layer**: without this invariant, the `isImportDeleteBlocked` check below is pointless — the app could "succeed" in deleting an import by quietly wiping its inventory, which would destroy physical-receiving history. The domain asserts the invariant so every use case that reasons about import deletion knows children are untouched.

**Enforcement**: schema FK `FlooringInventory.importEntry @relation(onDelete: Restrict)`. No SQL comes from the use case; Postgres is the physical enforcer. If a future migration were to loosen this to `Cascade` or `SetNull`, this invariant would break and `isImportDeleteBlocked` would lose its meaning.

**Data-layer action**: none from the use case. Schema contract runs at DB-level on the final `DELETE`.

### `isImportDeleteBlocked({ status, hasInventory })` — presence-not-received
**What it enforces**: blocks deletion on either of:

- `status === "FINAL"` → `{ blocked: true, reason: "STATUS_FINAL" }`. Workflow rule. An import in FINAL state is archival; deletion requires an explicit supervisor path (out of scope for this sweep). Applies even if `hasInventory === false`.
- `hasInventory === true` → `{ blocked: true, reason: "INVENTORY_PRESENT" }`. **Rule is presence, not received-status** — a row with `isImported = false` blocks deletion just the same as `isImported = true`. Cut-log-reference checks are subsumed: if no inventory exists, there can't be cut logs against it.

Returns `{ blocked: false }` otherwise.

**Relationship to the cascade invariant**: this rule and `assertNoImportInventoryCascade` are a pair. The cascade invariant says "import delete never touches inventory"; this rule says "therefore, import delete is only permitted when inventory is already absent." One without the other is incoherent.

**Data-layer action**: `getImportDeleteState(id, tx)` — one short-circuiting query inside the lock:
```sql
SELECT
  e.status,
  EXISTS (
    SELECT 1 FROM flooring_inventory WHERE "importEntryId" = e.id
  ) AS has_inventory
FROM flooring_import_entry e
WHERE e.id = $1;
```
`EXISTS` stops at the first matching row, so the check is O(1) against the `flooring_inventory_importEntryId_idx` index regardless of how many child rows actually exist.

### `buildImportDeleteBlockedMessage(reason)`
**What it enforces**: maps the reason enum to a human-readable 409 response body.

- `"STATUS_FINAL"` → `"This import is finalized and cannot be deleted."`
- `"INVENTORY_PRESENT"` → `"This import has inventory rows attached. Remove or reassign them before deleting the import."`

**Data-layer action**: none.

## Transaction flow
1. Open transaction, lock import row.
2. `getImportDeleteState(id, tx)` inside the lock.
3. `isImportDeleteBlocked(state)` → on block, throw `ImportExecutionError({ code: "IMPORT_IN_USE", status: 409, message: buildImportDeleteBlockedMessage(reason) })`.
4. `deleteImportById(tx, id)` → `DELETE FROM flooring_import_entry WHERE id = $1`.
   - `assertNoImportInventoryCascade` is physically honored: Postgres either removes the import row cleanly (no children) or refuses with `foreign_key_violation` (`P2003`). Inventory rows are **never** touched by this DELETE.
   - Belt + suspenders: if the domain check somehow missed a case, `P2003` rolls the transaction back and the use case translates it to the same typed `IMPORT_IN_USE` error — the client sees one consistent 409 regardless of which layer caught it.

## Response
`{ deletedId: id }` (or `204 No Content` depending on route style).

## Relationship to inventory delete
If a user wants to delete an import that has inventory attached, the flow is:

1. Remove the inventory rows first — either one-by-one via `deleteInventoryUseCase` (which has its own cut-log block) or in bulk via `saveImportInventoryRowsUseCase` with a `deleted: [...]` diff (only allowed while the import's `status !== "FINAL"`).
2. Then call `deleteImportUseCase` on the now-childless import.

The two use cases are independently audited, independently locked, and independently reversible. There is no "cascade delete import + its inventory" operation — by design.
