# Entity Payments

## Dev Scope

- [ ] Delete contacts and labor payments models all the way through.
- [ ] Add a payments table, used for inflows and outflows, single-entry ledger.
- [ ] Rename management companies to Entities all the way through.
- [ ] Add an `entities type` table; payments and entities both link to it.
- [ ] Add filtering for entities type.
- [ ] Plan user role/status gating based on entity type, or let owner users manually configure which users see which entities or types.
- [ ] Backfill manufacturers into the entities table with `manufacturer` type, link entities to imports and products and backfill, then delete the manufacturers model all the way through.
- [ ] Link payments to work orders; add a `planned payments` table which links to work orders, maybe payments.
- [ ] Add cost and freight columns to inventory, adjustments, and staged inventory rows.
- [ ] Link inventory and imports to the payments table.
- [ ] Add work order job costing:
  - Expenses against a work order = sum of cost / freight columns from linked adjustments and linked outflow payments.
  - Planned payments and/or invoice cost columns = what the customer pays; the inflow added to payments / linked to the order, is what actually matters.

## Notes

- [ ] The user role/status gating will be applied to catalog tables as well.
- [ ] Entities type link should allow multiple types.
- [ ] Planned payments will be linked to templates as well; goes through with the sync.
