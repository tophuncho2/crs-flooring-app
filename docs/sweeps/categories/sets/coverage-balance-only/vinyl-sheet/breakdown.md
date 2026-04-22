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

**Available balance → Coverage balance:**
`availableCoverage = availableBalance × 1.333` — Linear Feet → Sqyd. Fixed category constant (derived from standard 12-foot roll width: 12 sqft / 9 sqft-per-sqyd = 1.333 sqyd per linear foot). Not product-level; does NOT use `product.coveragePerUnit`.

**Material item fulfillment:**
`quantityAssigned = sum(cut.cut)` — Send unit equals Stock unit, so cut's linear-feet amount compares directly to the item's requested quantity (Linear Feet). No conversion.
