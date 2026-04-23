# Fulfillment source strategies

Work-order material items compute `quantityAssigned` by summing a specific field across linked cut logs. Which field depends on the linked product's category.

This registry answers: "when a material item sums its cut logs to check fulfillment, does it sum `cut` (stock count) or `coverage` (computed send-unit)?"

Signature:
```ts
type FulfillmentSource = (cutLog: { cut: number; coverage: number | null }) => number
```

Consumer of these strategies:
- Work-order material-item normalizer → `quantityAssigned = sum(source(cutLog))` across linked cut logs. Decides `fulfillmentStatus` = `"SUFFICIENT"` iff `quantityAssigned ≥ item.quantity`.

Out of scope this sweep — documented here so the work-orders sweep inherits the contract.

---

## `stock-count`

Sums the raw `cut` field (in the category's Stock Unit).

```ts
(cutLog) => cutLog.cut
```

**Applies when** Send Unit = Stock Unit. No conversion needed — the cut's stock-count amount IS the fulfillment quantity.

**Used by (all one-to-one categories):** carpet, vinyl-sheet, vct, adhesive, baseboard, trim, metals, luan, plywood, patch, shoe-molding, wax-ring, kilz, scent-stop, moisture-barrier, primer.

---

## `coverage-sum`

Sums the computed `coverage` field (in the category's Coverage Unit, which equals the Send Unit for every category using this strategy).

```ts
(cutLog) => cutLog.coverage ?? 0
```

**Applies when** Send Unit ≠ Stock Unit. The cut's stock-count amount can't compare directly to the item's requested quantity (different units), so fulfillment reads the computed coverage instead.

**Invariant for categories using this strategy:** Coverage Unit === Send Unit. If a future category sets them differently, a third fulfillment strategy is needed.

**Used by (`full-conversion-only` categories):**
- `vinyl-plank` — cuts in Boxes, material items in Sqft; coverage converts per-cut.
- `carpet-tile` — cuts in Boxes, material items in Sqyd.
- `pad` — cuts in Rolls, material items in Sqyd.
- `covebase` — cuts in Boxes, material items in Linear Feet.

---

## Registry

```ts
export const FULFILLMENT_SOURCES = {
  "stock-count":  (cutLog) => cutLog.cut,
  "coverage-sum": (cutLog) => cutLog.coverage ?? 0,
} as const satisfies Record<string, FulfillmentSource>

export const CATEGORY_FULFILLMENT_SOURCE: Record<string, keyof typeof FULFILLMENT_SOURCES> = {
  // full-conversion-only (send ≠ stock → read computed coverage)
  "vinyl-plank":       "coverage-sum",
  "carpet-tile":       "coverage-sum",
  "pad":               "coverage-sum",
  "covebase":          "coverage-sum",
  // one-to-one (send = stock → read stock directly)
  "carpet":            "stock-count",
  "vinyl-sheet":       "stock-count",
  "vct":               "stock-count",
  "adhesive":          "stock-count",
  "baseboard":         "stock-count",
  "trim":              "stock-count",
  "metals":            "stock-count",
  "luan":              "stock-count",
  "plywood":           "stock-count",
  "patch":             "stock-count",
  "shoe-molding":      "stock-count",
  "wax-ring":          "stock-count",
  "kilz":              "stock-count",
  "scent-stop":        "stock-count",
  "moisture-barrier":  "stock-count",
  "primer":            "stock-count",
}
```

---

## Adding a new fulfillment strategy

Most new categories will fall into `stock-count` (send=stock) or `coverage-sum` (send≠stock) as-is. A third strategy is only needed if:
- A category's Coverage Unit ≠ Send Unit (then coverage-sum doesn't produce a send-unit total).
- A category wants to count only subset cuts (e.g., FINAL-only toward fulfillment — deferred per `REFERENCE.md`).

If that time comes: add the strategy to `FULFILLMENT_SOURCES`, map applicable categories in `CATEGORY_FULFILLMENT_SOURCE`. No consumer changes.

---

## Why cut-log `coverage` is computed, not stored

Stored would mean: add a Prisma column, write it on every cut-log create, and migrate it if the conversion formula ever changes. Computed means: normalizer runs `coverageStrategy(cut, product)` at read time. If the Carpet constant ever changes from `1.333` to `1.34` (or a new strategy is introduced), no DB migration and no rewrite of historical rows — reads instantly reflect the new math.

Accounting fields (`cost`, `freight`) are stored because they MUST NOT drift as inventory cost later changes. `coverage` is a display-layer derivation and can re-compute safely on every read.
