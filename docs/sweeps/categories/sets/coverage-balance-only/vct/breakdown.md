# VCT

**Slug:** `vct`

---

**Stock Unit:** Boxes
**Send Unit:** Boxes
**Coverage Unit:** Sqyd

---

| | |
|---|---|
| Coverage per unit required on product create | true |
| Inventory Coverage Balance enabled | true |
| Send unit = Stock unit | true |
| Cut logs need fulfillment quantity computation for material items | false |

---

**Strategy refs:** `coverage: product-multiplier` · `fulfillment: stock-count`

**Available balance → Coverage balance:**
`availableCoverage = availableBalance × product.coveragePerUnit` — Boxes → Sqyd. Strategy `product-multiplier`.

**Material item fulfillment:**
`quantityAssigned = sum(cutLog.cut)` — Send unit equals Stock unit, so cut's box count compares directly to the item's requested quantity (Boxes). Strategy `stock-count`.
