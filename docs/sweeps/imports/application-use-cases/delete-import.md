# deleteImportUseCase

`deleteImportUseCase(id: string, client?) → { deletedId: string }`

## What it does
Hard-delete an import entry. Blocked by domain if any of: `status === "FINAL"`, any child inventory row has `isImported = true`, or any cut log references any child inventory row. FK `onDelete: Restrict` on `FlooringInventory.importEntryId` is the last-ditch DB backstop.

## Lock scope
- `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` — the parent.

## Transport guard (pre-transaction)
`assertExpectedUpdatedAt` against import snapshot.

## Domain rules orchestrated

### `isImportDeleteBlocked({ status, inventoryReceivedCount, cutLogReferenceCount })`
Returns `{ blocked: boolean, reason?: "STATUS_FINAL" | "INVENTORY_RECEIVED" | "CUT_LOGS_PRESENT" }`.

**Data-layer action**: `getImportDeleteState(id, tx)` — single aggregate query inside the lock:
```sql
SELECT
  e.status,
  COALESCE(inv_recv.c, 0) AS inventory_received_count,
  COALESCE(cl_ref.c,    0) AS cut_log_reference_count
FROM flooring_import_entry e
LEFT JOIN (
  SELECT "importEntryId" AS id, COUNT(*)::int AS c
  FROM flooring_inventory WHERE "isImported" = true GROUP BY "importEntryId"
) inv_recv ON inv_recv.id = e.id
LEFT JOIN (
  SELECT i."importEntryId" AS id, COUNT(*)::int AS c
  FROM flooring_cut_log cl JOIN flooring_inventory i ON i.id = cl."inventoryId"
  GROUP BY i."importEntryId"
) cl_ref ON cl_ref.id = e.id
WHERE e.id = $1;
```

### `buildImportDeleteBlockedMessage(reason)`
Maps reason enum to a human-readable 409 body message.

**Data-layer action**: none.

## Transaction flow
1. Open transaction, lock import row.
2. `getImportDeleteState(id, tx)` inside the lock.
3. `isImportDeleteBlocked(state)` → on block, throw `ImportExecutionError({ code: "IMPORT_IN_USE", status: 409, message: buildImportDeleteBlockedMessage(reason) })`.
4. `deleteImportById(tx, id)` → `DELETE FROM flooring_import_entry WHERE id = $1`. DB-level `onDelete: Restrict` on any surviving child fires as a last resort if domain missed something.

## Response
`{ deletedId: id }` (or `204 No Content` depending on route style).
