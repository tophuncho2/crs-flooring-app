# Covebase

**Slug:** `covebase`

---

**Stock Unit:** Boxes
**Send Unit:** Linear Feet
**Coverage Unit:** Linear Feet

---

| | |
|---|---|
| Coverage per unit required on product create | true |
| Inventory Coverage Balance enabled | true |
| Send unit = Stock unit | false |
| Cut logs need fulfillment quantity computation for material items | true |

---

**Strategy refs:** `coverage: product-multiplier` · `fulfillment: coverage-sum`

**Available balance → Coverage balance:**
`availableCoverage = availableBalance × product.coveragePerUnit` — Boxes → Linear Feet. Strategy `product-multiplier`.

**Material item fulfillment:**
`quantityAssigned = sum(cutLog.coverage)` where `coverage` is computed per cut via `product-multiplier` → each cut's box count converts to Linear Feet. Compares against the item's requested quantity (Linear Feet).
