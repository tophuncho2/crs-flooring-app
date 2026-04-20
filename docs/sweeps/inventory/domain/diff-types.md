# Inventory Domain — Diff Types

Shapes + validators for the inventory-rows atomic-diff save (used by imports' section save). Under `packages/domain/src/flooring/inventory/diff-types.ts`.

## Shape

```ts
export type InventoryRowDraft = {
  tempId: string
  productId: string
  itemNumber: string
  dyeLot: string | null
  locationId: string | null      // nullable on add; resolved at apply time
  stockCount: string
  cost: string | null
  freight: string | null
  notes: string | null
}

export type InventoryRowUpdate = {
  id: string
  expectedUpdatedAt: string      // per-row optimistic concurrency
  patch: Partial<InventoryRowDraft>
}

export type InventoryRowDelete = {
  id: string
  expectedUpdatedAt: string
}

export type InventoryRowsDiff = {
  added: InventoryRowDraft[]
  modified: InventoryRowUpdate[]
  deleted: InventoryRowDelete[]
}
```

## Validator

### `validateInventoryRowsDiff(diff, existing, warehouseId): void`
Throws `InventoryExecutionError({ code: "INVENTORY_VALIDATION_FAILED", status: 400, ... })` with the full issue list on any failure. Checks:

- **Unique `(locationId, itemNumber)`** across the post-diff set (adds + modifies that change either field, minus deletes). Duplicate pairs → `DUPLICATE_ITEM_NUMBER_PER_LOCATION`.
- **Location-warehouse match**: for every added/modified row whose `locationId` is set, the resolved location's `warehouseId` must equal the passed `warehouseId` argument (the parent import's warehouse). Mismatch → `LOCATION_WAREHOUSE_MISMATCH`.
- **Location existence**: every referenced `locationId` resolves to a real location row. Unknown → `UNKNOWN_LOCATION`.
- **Product existence**: every referenced `productId` resolves. Unknown → `UNKNOWN_PRODUCT`.
- **Stranded modifications / deletes**: every `modified[].id` and `deleted[].id` must be in `existing`. Stranded → `INVENTORY_ROW_NOT_FOUND`.
- **Per-row `expectedUpdatedAt`**: modifies / deletes must match the existing row's current `updatedAt`. Mismatch → `INVENTORY_ROW_UPDATE_CONFLICT`.
- **Structural shape**: numeric fields parse as decimals, strings non-null where required, etc.

## Issue describer

### `describeInventoryRowsDiffIssue(issue): string`
Maps an issue code to a human-readable message for the validation-error UI.

## Validator signature

```ts
export function validateInventoryRowsDiff(
  diff: InventoryRowsDiff,
  existing: InventoryRow[],
  warehouseId: string | null,
): void
```

Passing `warehouseId: null` disables the location-warehouse match check — used when the parent import has no warehouse assigned yet (shouldn't happen in practice; defensive).
