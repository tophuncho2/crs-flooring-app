# 1 — Schema Alterations (per-model checklist)

Current models snapshot: `a-branch/alteration/mock/current-models.md`. Status: **PENDING — not applied.**

## `FlooringProduct`

- [ ] ADD `sendUnitName String?`
- [ ] ADD `sendUnitAbbrev String?`
- [ ] ADD `stockUnitName String?`
- [ ] ADD `stockUnitAbbrev String?`
- [ ] ADD `itemCoverageUnitName String?`
- [ ] ADD `itemCoverageUnitAbbrev String?`
- [ ] Backfill script `db:backfill:product-units` (mirror `db:backfill:product-names`)

## `FlooringWorkOrderItem`

- [ ] No schema change. (Stamping source switches from category-join to `product.sendUnitName/Abbrev` once products carry the snapshot — domain/data work, not schema.)

## `FlooringTemplateItem`

- [ ] No schema change. (Same as WO item.)

## `FlooringWorkOrder`

- [ ] No schema change.

## `FlooringTemplate`

- [ ] No schema change.

## `FlooringWorkOrderFile`

- [ ] No schema change.
