# Data model — reference charts

Canonical spec for seeded units, category unit bindings, inventory balance definitions, and the column shapes of cut logs + work-order material items. This file is the source of truth for seed values and field definitions consumed by Sweep 3 and beyond.

"Pieces" normalized throughout (input spellings varied).

---

## 1. Unit of Measures (seeded)

| Unit |
|---|
| Bags |
| Boxes |
| Buckets |
| Gallons |
| Linear Feet |
| Pieces |
| Rolls |
| Sheets |
| Square Feet |
| Square Yard |
| Units |

---

## 2. Categories (seeded) — Stock / Send / Coverage unit bindings

| Category | Stock Unit | Send Unit | Coverage Unit |
|---|---|---|---|
| Plank | Boxes | Sqft | Sqft |
| Carpet Tile | Boxes | Sqyd | Sqyd |
| Pad | Rolls | Sqyd | Sqyd |
| Carpet | Linear Feet | Linear Feet | Sqyd |
| Vinyl Sheet | Linear Feet | Linear Feet | Sqyd |
| VCT | Boxes | Boxes | Sqyd |
| Covebase | Boxes | Linear Feet | Linear Feet |
| Adhesive | Buckets | Buckets | Sqft |
| Baseboard | Pieces | Pieces | N/A |
| Trim | Pieces | Pieces | N/A |
| Metals | Pieces | Pieces | N/A |
| Luan | Sheets | Sheets | Sqft |
| Plywood | Sheets | Sheets | Sqft |
| Patch | Bags | Bags | N/A |
| Shoe Molding | Pieces | Pieces | N/A |
| Wax Ring | Boxes | Boxes | N/A |
| Kils | Buckets | Buckets | N/A |
| Scent Stop | Units | Units | N/A |
| Moisture Barrier | Units | Units | N/A |
| Primer | Units | Units | N/A |

**Notes:**
- `N/A` in the Coverage column = no coverage-available computation for that category. Inventory's `availableCoverage` tile renders blank; cut logs emit blank `coverage`. Maps to `CATEGORY_UNIT_RULES[slug].hasCoverageUnit = false`.
- Categories whose Send Unit ≠ Stock Unit (e.g. Plank boxes → sqft, Covebase boxes → linear feet) require `product.coveragePerUnit` at product authoring time to make the conversion meaningful.
- Categories whose Stock Unit = Send Unit = Coverage Unit (e.g. Luan sheets → sheets, Adhesive buckets → buckets) can still have a coverage computation when the Coverage Unit differs — see Luan/Plywood sheets→sqft, Adhesive buckets→sqft.

---

## 3. Inventory Balances (computed fields)

| Field | Source |
|---|---|
| Starting Stock Count | Input at import |
| Available Balance | Starting stock − cut logs |
| Available Coverage | Available balance converted to coverage unit balance |
| Total Cut Balance | Sum of all final cuts |
| Awaiting Cut Balance | Sum of all pending cuts |
| Uncut Balance | Available balance minus pending cuts |

All of Available Balance, Total Cut Balance, Awaiting Cut Balance, and Uncut Balance are expressed in the category's **stock unit**. Available Coverage is expressed in the category's **coverage unit** (or blank when the category opts out of coverage).

Conversion is canonical: `Available Coverage = convertStockToCoverage({ stockAmount: <Available Balance>, coveragePerUnit: product.coveragePerUnit, categorySlug: category.slug })` from `packages/domain/src/flooring/categories/`.

---

## 4. Cut Logs (row columns)

| Column | Type | Editable post-create? |
|---|---|---|
| Before | Decimal (stock unit) | No — frozen on create |
| Cut | Decimal (stock unit) | No — delete + recreate to change |
| After | Decimal (stock unit) | No — frozen on create (= Before − Cut) |
| Status | Enum (Pending / Final) | Yes — flips freely both directions |
| Waste Status | Boolean | Yes |
| Cost of Cut | Decimal | No — frozen on create |

Implicit additional columns not in the user-provided chart but required by the Sweep-3 plan:
- Freight of Cut (Decimal, frozen on create) — parallels Cost, rolls up into work-order expense totals alongside cost.
- Coverage (computed, not stored) — `convertStockToCoverage({ stockAmount: Cut, … })`; blank when category has no coverage unit.
- Notes (text, editable).
- Work Order ID / Work Order Item ID — read-only display from inventory side; set by future work-orders sweep.

---

## 5. Work Order Material Items (row columns — future sweep)

| Column | Type | Notes |
|---|---|---|
| Product | FK → FlooringProduct | User-selected |
| Quantity | Decimal | User-input, in Send Unit |
| Send Unit | Derived from product's category.sendUnit | Display only |
| Quantity Assigned | Computed | Sum of linked cut-log coverage (or strict stock-count sum for categories with no coverage unit) |
| Fulfillment Status | Computed enum (Short / Assigned) | SUFFICIENT iff Quantity Assigned ≥ Quantity; overage allowed |
| Price | Decimal | Line-item price |

Quantity Assigned derivation is category-aware:
- Categories with `hasCoverageUnit = true` AND Coverage Unit = Send Unit → sum of linked cuts' `coverage` field. Example: Plank — request 100 sqft, one 1-box cut × 23.77 sqft/box = 23.77 sqft assigned.
- Categories with `hasCoverageUnit = true` AND Coverage Unit ≠ Send Unit → sum of linked cuts' `cut` field (stock-count direct). Example: Covebase — request 50 linear feet, cuts linked are in boxes; assignment is strict count per the Send Unit binding.
- Categories with `hasCoverageUnit = false` (Baseboard, Trim, Metals, Patch, Shoe Molding, Wax Ring, Kils, Scent Stop, Moisture Barrier, Primer) → sum of linked cuts' `cut` field (strict 1:1 stock count).

Out of scope for Sweep 3; documented here so the work-orders sweep inherits the contract.

---

## Open items / naming flags

1. **`Plank` vs. current seed `vinyl-plank`.** The current seed key is `vinyl-plank` with display name "Vinyl Plank". This chart shortens to just "Plank". Decide before Phase 2 seed: rename the slug to `plank` (small migration consideration) or keep `vinyl-plank` with "Plank" as display name. Recommend: rename to `plank` since this chart is the canonical list and multiple categories (Carpet Tile, Vinyl Sheet, VCT) already follow the "category-type" naming without a material prefix.

2. **`Kils`.** Likely intended as `Kilz` (the brand name for the primer line). Keeping the user's spelling. Confirm the slug — `kils` or `kilz`? Primer also exists as its own row, so Kils is treated as a distinct category (brand-specific primer).

3. **`Baseboard` appeared twice.** The second entry (identical to the first) was treated as a dedup. Confirm that was the intent; otherwise the second row was meant to be a different category.

4. **Inventory-balance arithmetic consistency.** The chart gives these formulas:
   - Available Balance = Starting stock − cut logs
   - Uncut Balance = Available balance − pending cuts

   If "cut logs" in the Available Balance formula means ALL cuts (final + pending), then Uncut Balance algebraically becomes `starting − final − 2×pending` which is nonsensical. Two consistent readings:

   - **Reading A (matches current code):** "cut logs" in the Available Balance row means ALL cuts; Uncut Balance formula is then an inconsistency. Fix by restating: "Uncut Balance = Starting stock − final cuts" (what physically remains uncut).
   - **Reading B (matches my original "swap" flag):** "cut logs" in the Available Balance row means FINAL cuts only; then Uncut Balance = Available − pending = Starting − final − pending (truly free stock). This is the swap interpretation.

   These are the only two semantically coherent readings. Pick one and the plan aligns. Current code implements Reading A's first line (`available = stock − all cuts`) and a different Reading A Uncut (`uncut = stock − final cuts`). The chart's Uncut formula matches Reading B instead.

   This is the same question that was briefly marked resolved in an earlier plan revision. Re-raising because the chart introduces a subtle inconsistency that needs one clean answer before Phase 3 Domain lands.
