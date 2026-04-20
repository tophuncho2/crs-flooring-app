# Imports Domain — Types

Canonical types that will live under `packages/domain/src/flooring/imports/`. Pure TS — no Prisma imports, no I/O.

## `ImportRow` / `ImportForm`
The canonical shape returned from data-layer reads (Row) and accepted by create / update use cases (Form).

- `id: string`
- `importNumber: number` — DB-assigned, never editable from a Form
- `orderNumber: string | null`
- `tag: string | null`
- `transportType: ImportTransportType`
- `status: ImportStatus`
- `warehouseId: string | null`
- `notes: string | null`
- `createdAt: string` / `updatedAt: string` (ISO strings on the wire)
- `inventoryCount: number` — aggregate from data layer; on `ImportRow` only, not `ImportForm`
- `inventoryReceivedCount: number` — same

`ImportDetailRow` extends `ImportRow` with the fully-loaded `inventory: InventoryRow[]` child array.

## Constants

```ts
export const IMPORT_STATUS_VALUES = ["PENDING", "FINAL"] as const
export type ImportStatus = typeof IMPORT_STATUS_VALUES[number]

export const IMPORT_TRANSPORT_TYPE_VALUES = [
  "PURCHASE_ORDER",
  "TRANSFER",
  "RETURN",
  /* full list finalized in Phase B */
] as const
export type ImportTransportType = typeof IMPORT_TRANSPORT_TYPE_VALUES[number]
```

## Helpers

- `EMPTY_IMPORT_FORM: ImportForm` — defaults for `new` page.
- `toImportForm(row: ImportRow): ImportForm` — strip derived fields, produce editable Form.
- `formatImportNumber(n: number): string` — `IMP-{zero-padded-5-digit}`.
- `formatImportStatus(s: ImportStatus): string` — `"Pending Receipt"` / `"Final"` for UI display.
- `formatTransportType(t: ImportTransportType): string` — display label per value.
- `calculateImportSummary(row: ImportDetailRow): ImportSummary` — rollup totals for the detail-page summary card (count of rows, received vs unreceived, total cost, total freight). Migrated from `modules/imports/domain/summary.ts`.

## Notes

- `importNumber` is a UI identifier. Never writable from a Form. Sequence-backed, immutable after creation.
- `status` and `transportType` are **closed-set strings**, not DB enums. Domain guards at write time (`isImportStatus`, `isImportTransportType`); DB column is `text` with no CHECK. Matches the cut-log `status` pattern.
