# Inventory Domain — Types

Canonical types that will live under `packages/domain/src/flooring/inventory/`. Pure TS — no Prisma imports.

## `InventoryRow` / `InventoryForm`
Canonical shape for list / record / create / update.

- `id: string`
- `importEntryId: string | null`
- `productId: string`
- `itemNumber: string`
- `dyeLot: string | null`
- `warehouseId: string | null` — **source of truth** (added in Phase A)
- `locationId: string | null`
- `stockCount: string` — decimal as string; stock-unit-denominated starting balance
- `isImported: boolean` — received-into-warehouse flag (added in Phase A)
- `cost: string | null`
- `freight: string | null`
- `notes: string | null`
- `fifoReceivedAt: string`
- `createdAt: string` / `updatedAt: string`

**Not present**: `reservedStockCount` (dropped in Phase A). Replaced by computed `awaitingCut`.

### Computed fields on `InventoryRow` (not stored)
Applied by the data-layer normalizer. Documented in `../data/computed-fields.md`; enumerated here for reference:
- `stockAvailable` — stock-unit
- `awaitingCut` — stock-unit, filtered by cut-log status `PENDING`
- `coverageAvailable` — coverage-unit, category-aware conversion
- `locationCode` — display string `"W{n}-S{n}-R{n}-L{n}"`

`InventoryDetailRow` extends `InventoryRow` with full relation loads (product + category, warehouse, location + section, `cutLogs: CutLogRow[]`).

## Helpers

- `EMPTY_INVENTORY_FORM: InventoryForm`
- `toInventoryForm(row: InventoryRow): InventoryForm`
- `calculateInventoryCostSummary(row: InventoryDetailRow): InventoryCostSummary` — aggregate of cost + freight + totals for the detail-page summary. Migrated from the products sweep; unchanged.
