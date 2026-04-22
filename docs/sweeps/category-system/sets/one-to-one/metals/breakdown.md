# Metals

**Slug:** `metals`

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

**Strategy refs:** `coverage: none` · `fulfillment: stock-count`

**Available balance → Coverage balance:**
N/A — strategy `none`. Category opts out of coverage.

**Material item fulfillment:**
`quantityAssigned = sum(cutLog.cut)` — strict 1:1 stock count. Strategy `stock-count`.
