# Inventory — Data Layer (non-schema)

Everything the `packages/db/src/flooring/inventory/` layer exposes that isn't a Prisma model or enum — computed fields, read-path patterns, aggregate queries, write primitives, transactional composition rules.

## Computed fields on the inventory record

These are **not stored**. They are derived by read-repo normalizers at query time from the inventory row's `stockCount`, its child `FlooringCutLog[]`, and (for `coverageAvailable`) the product's `coveragePerUnit`.

| Surface field | Formula | Unit |
|---|---|---|
| `InventoryRecord.stockAvailable` | `stockCount − SUM(cutLogs.cut)` | category `stockUnit` |
| `InventoryRecord.awaitingCut` | `SUM(cutLogs.cut) FILTER (WHERE status = 'PENDING')` | category `stockUnit` |
| `InventoryRecord.coverageAvailable` | `convertStockToSend(stockAvailable, product.coveragePerUnit)` (category-aware rounding) | category `coverageAvailableUnit` |
| `InventoryRecord.locationCode` | `"W{warehouse.number}-S{section.number}-R{location.rafter}-L{location.level}"` | display string |

**Invariant**: `stockAvailable ≥ 0` at all times. Any write that would violate this is rejected at the domain layer with `CUT_LOG_EXCEEDS_STARTING_BALANCE`.

**Status-indifference of `stockAvailable`**: counts cuts regardless of status. A `PENDING` cut is a physical cut; flipping it to `FINAL` doesn't change the available stock, only `awaitingCut`.

## Read-path patterns

### `listInventory(filter?, tx?)` → `InventoryRecord[]`
List views use **aggregates in SQL** for the cut-log rollups — not relation loading. One query for the whole page.

```sql
SELECT i.*,
       p."coveragePerUnit"                                                         AS product_coverage_per_unit,
       c."coverageAvailableUnitId"                                                  AS category_coverage_unit_id,
       w."number"                                                                   AS warehouse_number,
       s."number"                                                                   AS section_number,
       l."rafter"                                                                   AS location_rafter,
       l."level"                                                                    AS location_level,
       COALESCE(SUM(cl."cut"),                                              0) AS cut_logs_cut_total,
       COALESCE(SUM(cl."cut") FILTER (WHERE cl."status" = 'PENDING'),       0) AS cut_logs_pending_total
FROM flooring_inventory i
LEFT JOIN flooring_product   p ON p.id = i."productId"
LEFT JOIN flooring_category  c ON c.id = p."categoryId"
LEFT JOIN flooring_warehouse w ON w.id = i."warehouseId"
LEFT JOIN flooring_location  l ON l.id = i."locationId"
LEFT JOIN flooring_section   s ON s.id = l."sectionId"
LEFT JOIN flooring_cut_log   cl ON cl."inventoryId" = i.id
WHERE …
GROUP BY i.id, p.id, c.id, w.id, s.id, l.id
ORDER BY i."fifoReceivedAt" ASC, i."itemNumber" ASC;
```

Normalizer accepts the scalars (`cut_logs_cut_total`, `cut_logs_pending_total`) and computes `stockAvailable`, `awaitingCut`, `coverageAvailable`, `locationCode` before returning the record. O(rows) work, no N+1.

### `getInventoryById(id, tx?)` → `InventoryRecord | null`
Single-row form of the list query — same aggregates, `WHERE i.id = $1`.

### `getInventoryDetailById(id, tx?)` → `InventoryDetailRecord | null`
Detail view: relation-loads the full `cutLogs` array (bounded small set per row — the detail-page cut-log grid needs individual rows for display anyway). The same scalar aggregates are also included so the top-of-page summary reads don't have to walk the array.

### `getInventoryDeleteState(id, tx)` → `{ cutLogCount: number } | null`
Scalar count used by the delete-block check. Always called inside the use case's `FOR UPDATE` lock.

```sql
SELECT COUNT(*)::int AS cut_log_count
FROM flooring_cut_log WHERE "inventoryId" = $1;
```

### `listInventoryOptions(tx?)` → `{ products, warehouses, locations }`
Form-option loader for create / edit. `locations` is unfiltered; the UI filters client-side by the chosen warehouse. (Server-side filtered variant `listLocationsByWarehouse` also exported, used by the cascading dropdown.)

## Write primitives

| Function | Behavior |
|---|---|
| `createInventory(tx, input)` | `INSERT INTO flooring_inventory (...)`. `isImported` defaults to `false`. `fifoReceivedAt` defaults to `now()` for standalone creates; use case overrides to `importEntry.createdAt` when the row is added via an import diff. |
| `updateInventory(tx, id, input)` | `UPDATE flooring_inventory SET ... WHERE id = $1`. |
| `deleteInventoryById(tx, id)` | `DELETE FROM flooring_inventory WHERE id = $1`. Schema cascade on `FlooringCutLog.inventoryId` is `Cascade`, but the domain's `isInventoryDeleteBlocked` guarantees no cut logs are present by this point, so cascade never triggers in practice. |
| `applyInventoryCutLogsDiff(tx, input)` → `{ logs, tempIdMap }` | Atomic section save for the inventory's cut-logs child section. Three ordered phases: (1) `DELETE FROM flooring_cut_log WHERE id = ANY($deletedIds)`, (2) batched `INSERT` for added rows with `status` default `'PENDING'`, (3) per-row `UPDATE` for modified rows. |

## Transactional composition

All write primitives require `tx`. Use cases open `withDatabaseTransaction` at the top; every primitive composes under that single transaction. No primitive opens its own.

## Lock helpers

`lockInventoryRow(tx, id)` — issues `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE`. Used by `saveInventoryCutLogsUseCase` (single-row lock) and by `saveWorkOrderMaterialItemsUseCase` (multi-row lock via `WHERE id = ANY($1) ORDER BY id FOR UPDATE` — an array variant of the same helper is exported).
