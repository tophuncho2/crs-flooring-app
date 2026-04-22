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

**Available balance → Coverage balance:**
`availableCoverage = availableBalance × product.coveragePerUnit` — Boxes → Linear Feet.

**Material item fulfillment:**
`quantityAssigned = sum(cut.cut × product.coveragePerUnit)` — each cut's box count converts to Linear Feet before comparing against the item's requested quantity (Linear Feet).
