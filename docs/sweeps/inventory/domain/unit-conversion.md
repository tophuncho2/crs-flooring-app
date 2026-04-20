# Inventory Domain — Unit Conversion

Category-aware math under `packages/domain/src/flooring/inventory/unit-conversion.ts`. Pure functions; no I/O.

## Category unit rule

Each product category declares how its stock unit relates to its send unit, and whether the stock unit can split (decimals allowed) or must be whole.

```ts
export type CategoryUnitRule = {
  canSplit: boolean
  rounding: "up" | "down" | "nearest" | "exact"
}

export const CATEGORY_UNIT_RULES: Record<string, CategoryUnitRule> = {
  "vinyl-plank": { canSplit: false, rounding: "up" }, // boxes — whole, round up
  // additional categories land as they're seeded
}

export const DEFAULT_CATEGORY_UNIT_RULE: CategoryUnitRule = {
  canSplit: true,
  rounding: "exact",
}
```

Unknown category slug falls back to the default rule (decimals allowed, no rounding). This keeps the domain safe for reference-data additions before their rule is written.

## Helpers

### `convertStockToSend({ amountInStockUnit, coveragePerUnit }): number`
Pure multiplication: `amountInStockUnit × coveragePerUnit`. No rounding. Used wherever a stock-unit value needs to be compared against a send-unit value (e.g., work-order fulfillment checks where partial-box cut totals are valid inputs).

### `computeCoverageAvailable({ stockAvailable, coveragePerUnit }): number`
Same arithmetic as `convertStockToSend`, semantically scoped to "available physical stock converted to coverage unit." Kept as a separately-named helper for call-site clarity.

### `computeStockRequiredForQuantity({ quantityInSendUnit, coveragePerUnit, categorySlug }): number`
Inverse: `quantityInSendUnit / coveragePerUnit`, with category-aware rounding applied.

- For `vinyl-plank`: `Math.ceil(raw)` — you can't ship a partial box, and under-cutting a job isn't acceptable, so round up.
- For categories with `canSplit: true, rounding: "exact"`: return `raw` unrounded.
- Other rounding modes applied per the matching `CategoryUnitRule`.

Used by the work-order material-items UI to suggest "you need N boxes to cover X sqft."

### `isItemFulfilled({ quantityInSendUnit, cutLogsCutTotal, coveragePerUnit }): boolean`
`cutLogsCutTotal × coveragePerUnit >= quantityInSendUnit`. **Overage allowed** (`>` is valid — a cut bigger than requested is never rejected).

Used as the core predicate for `computeItemFulfillmentStatus` in the work-orders domain. Lives here because the math is inventory/category-shaped — work-orders just wraps it with SHORTAGE / SUFFICIENT labels.
