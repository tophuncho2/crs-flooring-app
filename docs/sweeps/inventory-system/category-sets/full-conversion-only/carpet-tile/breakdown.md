# Carpet Tile

**Slug:** `carpet-tile`

---

**Stock Unit:** Boxes
**Send Unit:** Sqyd
**Coverage Unit:** Sqyd

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
`availableCoverage = availableBalance × product.coveragePerUnit` — Boxes → Sqyd. Strategy `product-multiplier`.

**Material item fulfillment:**
`quantityAssigned = sum(cutLog.coverage)` where `coverage` is computed per cut via `product-multiplier` → each cut's box count converts to Sqyd. Compares against the item's requested quantity (Sqyd).
