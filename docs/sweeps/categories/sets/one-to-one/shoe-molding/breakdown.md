# Shoe Molding

**Slug:** `shoe-molding`

---

**Stock Unit:** Pieces
**Send Unit:** Pieces
**Coverage Unit:** N/A

---

| | |
|---|---|
| Coverage per unit required on product create | false |
| Inventory Coverage Balance enabled | false |
| Send unit = Stock unit | true |
| Cut logs need fulfillment quantity computation for material items | false |

---

**Available balance → Coverage balance:**
N/A — category opts out of coverage.

**Material item fulfillment:**
`quantityAssigned = sum(cut.cut)` — strict 1:1 stock count, no conversion.
