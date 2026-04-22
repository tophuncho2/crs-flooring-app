# Coverage conversion strategies

Every category picks exactly one coverage-conversion strategy. The strategy is stored as a slug (not a hard-coded function in inventory/cut-log code) so adding a new conversion = one entry in this registry + one reference in the category's seed record.

Conversion takes a `stockAmount` (in the category's Stock Unit) and returns a coverage amount in the category's Coverage Unit (or `null` when coverage isn't applicable).

Signature:
```ts
type CoverageStrategy = (
  stockAmount: number,
  product: { coveragePerUnit: number | null },
) => number | null
```

Consumers of these strategies:
- Inventory normalizer → `availableCoverage` = `strategy(availableBalance, product)`.
- Cut-log normalizer → `coverage` = `strategy(cut, product)` (computed on read, never stored).
- Future work-order material-item fulfillment → indirectly via the cut-log `coverage` field.

---

## Active strategies

### `product-multiplier`

Uses the product's per-unit coverage factor.

```ts
(stock, product) => product.coveragePerUnit !== null
  ? stock * product.coveragePerUnit
  : null
```

**Product create requirement:** `coveragePerUnit` is required (product create/update use case rejects `null` for categories whose strategy is `product-multiplier`).

**Used by:**
- `vinyl-plank` (Boxes → Sqft, varies per product)
- `carpet-tile` (Boxes → Sqyd, varies per product)
- `pad` (Rolls → Sqyd, varies per product)
- `covebase` (Boxes → Linear Feet, varies per product)

---

### `none`

Category has no coverage unit; coverage concept doesn't apply.

```ts
(_stock, _product) => null
```

**Product create requirement:** `coveragePerUnit` is NOT required (and is meaningless for these categories).

**Used by (all one-to-one categories):** carpet, vinyl-sheet, vct, adhesive, baseboard, trim, metals, luan, plywood, patch, shoe-molding, wax-ring, kils, scent-stop, moisture-barrier, primer.

---

## Registry

```ts
export const COVERAGE_STRATEGIES = {
  "product-multiplier": (stock, product) => product.coveragePerUnit !== null ? stock * product.coveragePerUnit : null,
  "none":               (_stock, _product) => null,
} as const satisfies Record<string, CoverageStrategy>

export const CATEGORY_COVERAGE_STRATEGY: Record<string, keyof typeof COVERAGE_STRATEGIES> = {
  // full-conversion-only
  "vinyl-plank":       "product-multiplier",
  "carpet-tile":       "product-multiplier",
  "pad":               "product-multiplier",
  "covebase":          "product-multiplier",
  // one-to-one
  "carpet":            "none",
  "vinyl-sheet":       "none",
  "vct":               "none",
  "adhesive":          "none",
  "baseboard":         "none",
  "trim":              "none",
  "metals":            "none",
  "luan":              "none",
  "plywood":           "none",
  "patch":             "none",
  "shoe-molding":      "none",
  "wax-ring":          "none",
  "kils":              "none",
  "scent-stop":        "none",
  "moisture-barrier":  "none",
  "primer":            "none",
}
```

---

## Adding a new conversion

1. Define the strategy in `COVERAGE_STRATEGIES` with its slug.
2. Map each consuming category in `CATEGORY_COVERAGE_STRATEGY`.
3. (Optional) Update each `sets/{category}/breakdown.md` to reference the new strategy slug.

No changes to consumers — inventory + cut-log normalizers look up by slug and run the strategy.

---

## Out of scope / pending

Strategies fully specified below but **not wired this sweep**. Categories that would use them currently ship with `coverage: none` (display Coverage Unit: N/A; no `availableCoverage` tile; cut logs emit blank `coverage`). When activated, flip the category's entry in `CATEGORY_COVERAGE_STRATEGY` from `none` to the strategy slug — no other code changes needed.

### `linear-feet-to-sqyd-12ft-roll` *(pending)*

Fixed constant `1.333 sqyd per linear foot`. Derived from standard 12-foot roll width: `12 sqft / 9 sqft-per-sqyd = 1.333 sqyd / linear ft`.

```ts
(stock, _product) => stock * 1.333
```

**Product create requirement when active:** `coveragePerUnit` is NOT required (and is ignored if set — the constant wins).

**Future users when active:**
- `carpet` (Linear Feet → Sqyd)
- `vinyl-sheet` (Linear Feet → Sqyd)

**Why deferred:** simplifying Sweep 3's coverage surface. Neither carpet nor vinyl-sheet's fulfillment computation needs the sqyd conversion (Send Unit = Stock Unit = Linear Feet, so material items compare directly in linear feet). The sqyd coverage would only exist as a display balance on the inventory record view — useful but not load-bearing. Ship when a concrete consumer (reporting, UI tile) asks for it.

**Activation checklist (when the time comes):**
1. Re-add `"linear-feet-to-sqyd-12ft-roll"` to `COVERAGE_STRATEGIES` in the active registry.
2. Flip `CATEGORY_COVERAGE_STRATEGY["carpet"]` and `["vinyl-sheet"]` from `"none"` to `"linear-feet-to-sqyd-12ft-roll"`.
3. Update each category's `sets/one-to-one/{category}/breakdown.md` — Coverage Unit: Sqyd, `Inventory Coverage Balance enabled: true`, coverage strategy ref. Consider moving the folder back into a `coverage-balance-only/` bucket if more than these two ever use the strategy.
4. Update seeded category row's `coverageAvailableUnitId` / `itemCoverageUnitId` to the Sqyd unit-of-measure id.
