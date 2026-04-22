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

**Available balance → Coverage balance:**
`availableCoverage = availableBalance × product.coveragePerUnit` — Boxes → Sqyd.

**Material item fulfillment:**
`quantityAssigned = sum(cut.cut × product.coveragePerUnit)` — each cut's box count converts to Sqyd before comparing against the item's requested quantity (Sqyd).
