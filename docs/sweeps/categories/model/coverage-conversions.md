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

## `product-multiplier`

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
- `vct` (Boxes → Sqyd, varies per product)

---

## `linear-feet-to-sqyd-12ft-roll`

Fixed constant `1.333 sqyd per linear foot`. Derived from standard 12-foot roll width: `12 sqft / 9 sqft-per-sqyd = 1.333 sqyd / linear ft`.

```ts
(stock, _product) => stock * 1.333
```

**Product create requirement:** `coveragePerUnit` is NOT required (and is ignored if set — the constant wins).

**Used by:**
- `carpet` (Linear Feet → Sqyd)
- `vinyl-sheet` (Linear Feet → Sqyd)

---

## `none`

Category has no coverage unit; coverage concept doesn't apply.

```ts
(_stock, _product) => null
```

**Product create requirement:** `coveragePerUnit` is NOT required (and is meaningless for these categories).

**Used by (one-to-one categories):** adhesive, baseboard, trim, metals, luan, plywood, patch, shoe-molding, wax-ring, kils, scent-stop, moisture-barrier, primer.

---

## Registry

```ts
export const COVERAGE_STRATEGIES = {
  "product-multiplier":            (stock, product) => product.coveragePerUnit !== null ? stock * product.coveragePerUnit : null,
  "linear-feet-to-sqyd-12ft-roll": (stock, _product) => stock * 1.333,
  "none":                          (_stock, _product) => null,
} as const satisfies Record<string, CoverageStrategy>

export const CATEGORY_COVERAGE_STRATEGY: Record<string, keyof typeof COVERAGE_STRATEGIES> = {
  // full-conversion-only
  "vinyl-plank":       "product-multiplier",
  "carpet-tile":       "product-multiplier",
  "pad":               "product-multiplier",
  "covebase":          "product-multiplier",
  // coverage-balance-only
  "carpet":            "linear-feet-to-sqyd-12ft-roll",
  "vinyl-sheet":       "linear-feet-to-sqyd-12ft-roll",
  "vct":               "product-multiplier",
  // one-to-one
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
