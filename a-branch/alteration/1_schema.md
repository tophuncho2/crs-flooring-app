# 1 — Schema Alterations (per-model checklist)

Current models snapshot: `a-branch/alteration/mock/current-models.md`. Status: **APPLIED** to Railway via migration `20260428230000_add_product_unit_snapshots` (deploy exit 0, drift exit 0).

## `FlooringProduct`

- [x] ADD `sendUnitName String?`
- [x] ADD `sendUnitAbbrev String?`
- [x] ADD `stockUnitName String?`
- [x] ADD `stockUnitAbbrev String?`
- [x] ADD `itemCoverageUnitName String?`
- [x] ADD `itemCoverageUnitAbbrev String?`
- [ ] Backfill script `db:backfill:product-units` (mirror `db:backfill:product-names`) — pending

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
