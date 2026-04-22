# deleteInventoryUseCase

`deleteInventoryUseCase(id: string, client?) → { deletedId: string }`

## Use case

### What it does
Hard-delete an inventory row. Blocked by domain if any cut logs reference it — cascade is never exposed in the UI because deleting inventory with cut logs would destroy physical-cut history.

### Lock scope
- `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE`

### Transport guard
`assertExpectedUpdatedAt` against inventory snapshot pre-transaction.

### Orchestration
1. Open transaction, lock inventory row.
2. `getInventoryDeleteState(id, tx)` inside the lock:
   ```sql
   SELECT COUNT(*)::int AS cut_log_count
   FROM flooring_cut_log WHERE "inventoryId" = $1;
   ```
3. `isInventoryDeleteBlocked({ cutLogCount })` → on block, throw `InventoryExecutionError({ code: "INVENTORY_IN_USE", status: 409, message: buildInventoryDeleteBlockedMessage(reason) })`.
4. `deleteInventoryById(tx, id)` → `DELETE FROM flooring_inventory WHERE id = $1`. Schema cascade on `FlooringCutLog.inventoryId` is `Cascade`, but the domain block guarantees no cut logs are present by this point, so the cascade never triggers.

### Response
`{ deletedId: id }`

## Domain

### `isInventoryDeleteBlocked({ cutLogCount })`
- `cutLogCount > 0` → `{ blocked: true, reason: "CUT_LOGS_PRESENT" }`.
- Otherwise → `{ blocked: false }`.

Default policy is block; cascade deletion with cut history is never exposed.

### `buildInventoryDeleteBlockedMessage(reason)`
Maps reason enum to a human-readable 409 body.
