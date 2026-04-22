# Imports — Data Layer (non-schema)

Everything the `packages/db/src/flooring/imports/` layer exposes that isn't a Prisma model or enum — read-path patterns, aggregate queries, write primitives, transactional composition rules.

## Computed fields on the import record

There are **no scalar computed fields on the import entry itself**. Every user-facing field on `ImportDetailRecord` either lives on the Prisma column or is loaded from a child relation. The data layer does surface two counts on list rows:

| Surface field | Formula | Where computed |
|---|---|---|
| `ImportRecord.inventoryCount` | `COUNT(*)` over child `flooring_inventory` | Aggregate in the list-SQL, `LEFT JOIN … GROUP BY` |
| `ImportRecord.inventoryReceivedCount` | `COUNT(*) FILTER (WHERE "isImported" = true)` | Same list-SQL |

Detail reads relation-load the full child set; list reads compute the counts as scalars.

## Read-path patterns

### `listImports(filter?, tx?)` → `ImportRecord[]`
Returns every import with aggregate child-counts, sorted by `createdAt DESC`.

```sql
SELECT e.*,
       COALESCE(COUNT(i.id),                                            0)::int AS inventory_count,
       COALESCE(COUNT(i.id) FILTER (WHERE i."isImported" = true),       0)::int AS inventory_received_count,
       COALESCE(COUNT(cl.id),                                           0)::int AS cut_log_reference_count
FROM flooring_import_entry e
LEFT JOIN flooring_inventory  i  ON i."importEntryId" = e.id
LEFT JOIN flooring_cut_log    cl ON cl."inventoryId"  = i.id
GROUP BY e.id
ORDER BY e."createdAt" DESC;
```

One query, Postgres does the sums. Normalizer maps row → `ImportRecord`.

### `getImportById(id, tx?)` → `ImportRecord | null`
Single row with the same aggregate scalars as list. Used by primary-section update / delete snapshots.

### `getImportDetailById(id, tx?)` → `ImportDetailRecord | null`
Relation-load: import row + full child `flooring_inventory[]` array (including each inventory row's own relation-loads via the inventory module's detail normalizer). Used as the response re-read after any mutation.

### `getImportDeleteState(id, tx)` → `{ status: string; hasInventory: boolean } | null`
O(1) short-circuit for the delete-block check. Always called inside the use case's `FOR UPDATE` lock.

```sql
SELECT e.status,
       EXISTS (SELECT 1 FROM flooring_inventory WHERE "importEntryId" = e.id) AS has_inventory
FROM flooring_import_entry e WHERE e.id = $1;
```

### `listImportOptions(tx?)` → `{ warehouses: WarehouseOption[] }`
Form-option loader for the create / edit screens. Wraps `listWarehouses` with a narrowed select.

## Write primitives

Each accepts an optional `tx` so use cases can compose within a single transaction.

| Function | Behavior |
|---|---|
| `createImport(tx, input)` | `INSERT INTO flooring_import_entry (...)`. `importNumber` auto-assigned by the `flooring_import_number_seq` sequence. |
| `updateImport(tx, id, input)` | `UPDATE flooring_import_entry SET ... WHERE id = $1`. `importNumber` never updated. |
| `deleteImportById(tx, id)` | `DELETE FROM flooring_import_entry WHERE id = $1`. Schema FK `onDelete: Restrict` on `FlooringInventory.importEntryId` raises `P2003` if any child rows exist — physical backstop for the domain's `isImportDeleteBlocked` rule. |
| `applyImportInventoryRowsDiff(tx, input)` → `{ rows, tempIdMap }` | Atomic section save. One transaction, three ordered phases: (1) `DELETE FROM flooring_inventory WHERE id = ANY($deletedIds)`, (2) batched `INSERT` for added rows (single multi-value insert), (3) per-row `UPDATE` for modified rows. Returns the post-state inventory list + the tempId → uuid map. |

## Transactional composition

All write primitives require a `tx` (except in trivial paths where an ambient `prisma` client is acceptable). Use cases open `withDatabaseTransaction` at the top and pass `tx` through. No primitive opens its own transaction.

## Lock acquisition helpers

The repo does not export a named lock helper for imports — use cases issue the `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` inline via `$queryRaw`. If a second consumer emerges, extract a `lockImportRow(tx, id)` helper alongside the other repo primitives.
