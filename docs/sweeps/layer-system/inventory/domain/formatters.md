# Inventory Domain — Formatters

Display-string helpers under `packages/domain/src/flooring/inventory/formatters.ts`. Pure functions from domain values to human-facing strings.

## `formatFullLocationCode({ warehouseNumber, sectionNumber, rafter, level }): string`
Composite physical-location code shown in tables and badges.

Shape: `"W{warehouseNumber}-S{sectionNumber}-R{rafter}-L{level}"`.
Example: `"W1-S3-R7-L2"`.

Used by inventory list, inventory detail, any cut-log row that surfaces the physical location, and the work-order material-items grid when showing the inventory row a cut log draws from.

## `formatInventoryImportNumber(importNumber: number): string`
Shape: `"IMP-{zero-padded-5-digit}"`. Shared with the imports module's `formatImportNumber` — same rule, exposed here for cross-section display on the inventory record view's "source import" link.

## `formatInventoryQuantity(value: string | number, stockUnitAbbreviation: string): string`
Renders a decimal-string stock count with the category's stock-unit abbreviation. Example: `"42 bx"` for 42 boxes.

## `formatInventoryStatus(isImported: boolean): string`
- `true` → `"Received"`
- `false` → `"Pending"`

Used on the inventory list and on the `isImported` toggle in the record view.

## `formatTransportType(t: ImportTransportType): string`
Shared with the imports module's formatter (moved here so inventory list rows can show the parent import's transport type without importing the imports module). Domain-to-display mapping — no behavior.
