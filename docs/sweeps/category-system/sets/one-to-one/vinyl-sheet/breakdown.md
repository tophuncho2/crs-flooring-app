# Vinyl Sheet

**Slug:** `vinyl-sheet`

---

**Stock Unit:** Linear Feet
**Send Unit:** Linear Feet
**Coverage Unit:** N/A *(pending — see [out-of-scope section in coverage-conversions.md](../../../model/coverage-conversions.md#out-of-scope--pending))*

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
N/A — strategy `none` this sweep. Future: Linear Feet → Sqyd via `linear-feet-to-sqyd-12ft-roll` (see pending section).

**Material item fulfillment:**
`quantityAssigned = sum(cutLog.cut)` — strict 1:1 stock count. Strategy `stock-count`.
