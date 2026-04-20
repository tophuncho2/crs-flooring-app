# deleteInventoryUseCase

`deleteInventoryUseCase(id: string, client?) → { deletedId: string }`

## What it does
Hard-delete an inventory row. Blocked by domain if any cut logs reference it (default policy — cascade is never exposed in the UI; deleting inventory with cut logs would destroy physical history).

## Lock scope
- `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE`

## Transport guard (pre-transaction)
`assertExpectedUpdatedAt` against inventory snapshot.

## Domain rules orchestrated

### `isInventoryDeleteBlocked({ cutLogCount })`
Returns `{ blocked: true, reason: "CUT_LOGS_PRESENT" }` if any cut logs reference this inventory row.

**Data-layer action**: `getInventoryDeleteState(id, tx)` — single scalar inside the lock:
```sql
SELECT COUNT(*)::int AS cut_log_count
FROM flooring_cut_log WHERE "inventoryId" = $1;
```

### `buildInventoryDeleteBlockedMessage(reason)`
Maps reason to human-readable 409 body text.

**Data-layer action**: none.

## Transaction flow
1. Open transaction, lock inventory row.
2. `getInventoryDeleteState(id, tx)` inside the lock.
3. Domain block → throw `InventoryExecutionError({ code: "INVENTORY_IN_USE", status: 409, ... })` if blocked.
4. `deleteInventoryById(tx, id)` → `DELETE FROM flooring_inventory WHERE id = $1`. Schema cascade on `FlooringCutLog.inventoryId` is `Cascade`, but the domain block guarantees no cut logs are present by this point, so cascade never triggers in practice.

## Response
`{ deletedId: id }`
