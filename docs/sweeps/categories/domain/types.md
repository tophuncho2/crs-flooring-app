# Categories Domain — Types

## Canonical

- `UnitOfMeasureRecord` — `{ id, slug, name, abbreviation }`. Seeded.
- `CategoryRecord` — `{ id, slug, name, stockUnit, sendUnit, coverageAvailableUnit, itemCoverageUnit, serviceUnit }`. Seeded. Each unit slot is `UnitOfMeasureRecord | null` (nullable to tolerate partially-configured categories; lookups assert presence at call sites that require them).

## UoM role semantics

| Role | What it governs | Where it surfaces |
|---|---|---|
| `stockUnit` | Unit of `FlooringInventory.stockCount`, cut-log `before` / `after` / `cut`, and all per-row inventory math. | Inventory row, cut-log grid. |
| `sendUnit` | Unit of work-order material-item `quantity`. What the customer orders. | Work-order record view. |
| `coverageAvailableUnit` | Unit of computed `coverageAvailable` on an inventory row. | Inventory list + record view. |
| `itemCoverageUnit` | Unit of `product.coveragePerUnit` (e.g., sqft per box). Must match `coverageAvailableUnit` for the conversion to line up. | Product record view. |
| `serviceUnit` | Unit of service-item pricing. | Work-order record view (service items section). |

## Inheritance chain

`FlooringCategory → FlooringProduct → FlooringInventory` and `FlooringCategory → FlooringProduct → FlooringWorkOrderItem`. Every consumer reads the UoMs through this chain — never re-declares or stores them locally.
