# Categories Domain — Unit Conversion (canonical)

**Home** of every stock-unit ↔ send-unit ↔ coverage-unit conversion in the system. Pure. No I/O.

**File path** at implementation time: `packages/domain/src/flooring/categories/unit-conversion.ts`.

Consumers: inventory read-repo normalizers (compute `physicalStock`, `availableCoverage`, `awaitingCutBalance`, `totalCutBalance`), work-order read-repo normalizers (compute material-item `fulfillmentStatus`), cut-log cost helpers, UI display formatters. **None of these consumers re-implement the math.**

## Per-category rule

```ts
export type CategoryUnitRule = {
  canSplit: boolean              // can the stock unit take decimals? (boxes: no; sqft of carpet: yes)
  rounding: "up" | "down" | "nearest" | "exact"
}

export const CATEGORY_UNIT_RULES: Record<string, CategoryUnitRule> = {
  "vinyl-plank": { canSplit: false, rounding: "up" },   // whole boxes, round up
  // additional seeded categories added as they land.
}

export const DEFAULT_CATEGORY_UNIT_RULE: CategoryUnitRule = { canSplit: true, rounding: "exact" }
```

`getCategoryUnitRule(slug)` returns the per-slug rule or `DEFAULT_CATEGORY_UNIT_RULE`.

## Canonical helpers

All inputs/outputs are numbers in their declared unit. No Decimal math here — the DB layer is responsible for Decimal↔number conversion at the boundary.

### Stock-unit math (no conversion)

- `computePhysicalStock({ stockCount, cutLogsCutTotal }) → number`
  - `stockCount − cutLogsCutTotal`, in stockUnit.
  - Asserts `>= 0`. Throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` if violated (validators call this before apply).
  - "Starting Stock − all cuts, regardless of status".

- `computeAwaitingCutBalance({ cutLogsPendingTotal }) → number`
  - `cutLogsPendingTotal`, in stockUnit.
  - "How much of the total cuts are still PENDING (reserved, not yet finalized)".

- `computeTotalCutBalance({ cutLogsFinalTotal }) → number`
  - `cutLogsFinalTotal`, in stockUnit.
  - "How much has actually been cut off the starting balance (FINAL status)".

Invariant check across the three: `physicalStock + awaitingCutBalance + totalCutBalance === stockCount` is **not** the relation — `physicalStock = stockCount − (awaitingCutBalance + totalCutBalance)`. `physicalStock` already nets both pending and final cuts.

### Conversion (stock ↔ coverage / send)

- `computeAvailableCoverage({ physicalStock, coveragePerUnit }) → number`
  - `physicalStock × coveragePerUnit`, in coverageAvailableUnit.
  - Source of truth for the inventory row's "Available Coverage" display AND for material-item fulfillment checks (via `convertStockToSend`).
  - Example: `1 box × 23.77 sqft/box = 23.77 sqft`.

- `convertStockToSend({ amountInStockUnit, coveragePerUnit }) → number`
  - `amountInStockUnit × coveragePerUnit`, in sendUnit.
  - Pure multiplication, no rounding. Used by fulfillment to turn a cut-log total into sendUnit for comparison against material-item quantity.
  - Semantic distinction from `computeAvailableCoverage`: same arithmetic, but `computeAvailableCoverage` is scoped to physical-stock display; `convertStockToSend` is scoped to cut-log-total → fulfillment comparison. Kept as two functions so call sites read clearly.

- `computeStockRequiredForQuantity({ quantityInSendUnit, coveragePerUnit, categorySlug }) → number`
  - `quantityInSendUnit / coveragePerUnit`, rounded per `getCategoryUnitRule(categorySlug)`.
  - For vinyl-plank: `ceil(quantity / coveragePerUnit)` → whole boxes.
  - For split-allowed categories: exact decimal.
  - Used by the work-order material-item UI to suggest "you need N boxes to cover M sqft".

### Fulfillment (material-item rule)

- `isItemFulfilled({ quantityInSendUnit, cutLogsCutTotalInStockUnit, coveragePerUnit }) → boolean`
  - `convertStockToSend({ amount: cutLogsCutTotalInStockUnit, coveragePerUnit }) >= quantityInSendUnit`.
  - **Overage is allowed.** A cut larger than requested is valid (e.g., ordered 100 sqft, cuts supply 118.85 sqft → SUFFICIENT).

- `computeItemFulfillmentStatus(input) → "SHORTAGE" | "SUFFICIENT"`
  - Wraps `isItemFulfilled`. Returns `"SUFFICIENT"` when true, `"SHORTAGE"` otherwise.

- `computeWorkOrderFulfillmentStatus(items) → "SHORTAGE" | "SUFFICIENT"`
  - All-or-nothing aggregate over items' `fulfillmentStatus`. Any `"SHORTAGE"` → `"SHORTAGE"`. Zero items → `"SHORTAGE"`.

- `formatFulfillmentStatus(status) → "Short" | "Assigned"` — UI labels.

**Fulfillment is computed only, never stored.** Read-repo normalizers run the computation on every read, pulling cut-log totals through a shared select payload.

## Worked example (vinyl-plank)

- Inventory row: `stockCount = 10 boxes`, product `coveragePerUnit = 23.77 sqft/box`.
- Cut logs against this row: 3 FINAL (each `cut = 1`), 2 PENDING (each `cut = 1`). Totals: `cutLogsCutTotal = 5`, `cutLogsFinalTotal = 3`, `cutLogsPendingTotal = 2`.
- `physicalStock = 10 − 5 = 5 boxes`.
- `awaitingCutBalance = 2 boxes`.
- `totalCutBalance = 3 boxes`.
- `availableCoverage = 5 × 23.77 = 118.85 sqft`.
- Material item on work order requests `quantity = 100 sqft`. Its linked cut logs sum to `cutLogsCutTotalInStockUnit = 5 boxes`.
- `convertStockToSend({ 5, 23.77 }) = 118.85 sqft ≥ 100`. → `fulfillmentStatus = "SUFFICIENT"`.
- If quantity were `120 sqft`: `118.85 < 120` → `"SHORTAGE"`.

## Why this lives under categories, not inventory

Every helper above is **per-category**: the rule table is keyed by category slug, and the conversion depends on the category's UoM roles. Inventory, cut-logs, and work-orders all consume the helpers but none of them owns the rule table. Categories is the single node in the product graph where UoMs are declared, so the pure functions that convert between those UoMs live here.
