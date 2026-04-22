# Vinyl Sheet

**Slug:** `vinyl-sheet`

---

**Stock Unit:** Linear Feet
**Send Unit:** Linear Feet
**Coverage Unit:** Sqyd

---

| | |
|---|---|
| Coverage per unit required on product create | false |
| Inventory Coverage Balance enabled | true |
| Send unit = Stock unit | true |
| Cut logs need fulfillment quantity computation for material items | false |

---

**Strategy refs:** `coverage: linear-feet-to-sqyd-12ft-roll` · `fulfillment: stock-count`

**Available balance → Coverage balance:**
`availableCoverage = availableBalance × 1.333` — Linear Feet → Sqyd. Strategy `linear-feet-to-sqyd-12ft-roll` (fixed constant from standard 12-foot roll width: `12 sqft / 9 sqft-per-sqyd = 1.333 sqyd / linear ft`). Does NOT use `product.coveragePerUnit`.

**Material item fulfillment:**
`quantityAssigned = sum(cutLog.cut)` — Send unit equals Stock unit, so cut's linear-feet amount compares directly to the item's requested quantity (Linear Feet). Strategy `stock-count`.
