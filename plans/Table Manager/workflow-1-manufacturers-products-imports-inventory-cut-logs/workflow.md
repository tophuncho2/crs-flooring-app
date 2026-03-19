# Workflow 1
## Manufacturers -> Products -> Imports -> Inventory -> Cut Logs

## Purpose

This workflow defines how users move from manufacturer setup into product setup, then into warehouse intake, live inventory, and cut tracking.

## User Navigation Flow

1. User opens the manufacturers table and creates a manufacturer with the add form.
2. User edits manufacturer details from the manufacturers table.
3. User opens the products table and creates products tied to that manufacturer.
4. User uses product row actions:
   - `Edit` to edit the product row itself
   - `Open` to view product information plus linked inventory
5. From the product open view, user opens linked inventory rows.
6. From the inventory row view, user adds cuts, which reduces running balance.
7. User can continue into the cut-log table for direct cut-log visibility and review.
8. User uses imports to create inventory rows that land in warehouse locations and later appear under the product inventory view.

## Current Implemented Behavior

- `implemented`: manufacturers can be created and edited from the manufacturers table.
- `missing`: manufacturers do not currently expose a dedicated `Open` workflow with linked downstream navigation.
- `implemented`: products have both `Edit` and `Open` row actions.
- `implemented`: product `Open` shows product information and linked inventory.
- `implemented`: inventory rows can be opened from the product inventory view.
- `implemented`: cuts can be added from the inventory row view and they update running balance.
- `implemented`: inventory now carries real `section` and `location` data from Prisma-backed warehouse records.
- `partially implemented`: inventory rows are visible and operational, but the inventory table itself is not yet on the full configurable table-controls system.
- `implemented`: imports can create inventory rows tied to warehouse locations.
- `partially implemented`: imports, inventory, and product inventory visibility are linked, but the end-to-end navigation still depends on users understanding multiple pages rather than one fully unified workflow.

## Missing Behavior

- `missing`: manufacturer `Open` behavior for linked downstream visibility.
- `missing`: a fully explicit manufacturer -> products navigation path in the UI.
- `missing`: inventory row editing directly from the product inventory open workflow if that is expected to be available in-place rather than by separate screen or future panel behavior.
- `missing`: inventory table support for configurable grouping and hide/show controls with `section` as a first-class groupable field.
- `missing`: clearer drilldown cues from imports into inventory and from inventory into cut logs.

## Workflow Risks And Ambiguous Decisions

- `partially implemented`: the manufacturer table behaves more like a simple edit table than a full linked-record entrypoint.
- `future-state / pending workflow finalization`: inventory-row editability from the product-open context may need a dedicated panel pattern rather than inline mutation from the inventory summary view.
- `future-state / pending workflow finalization`: warehouse category-specific location logic for workers should not leak into this user-navigation workflow doc.

## User-Workflow Checklist

- [ ] Add manufacturer `Open` behavior with linked product visibility if that is the intended primary workflow.
- [ ] Make the manufacturer -> product transition more explicit in the UI and workflow guidance.
- [ ] Confirm whether inventory rows must be editable directly from the product open workflow.
- [ ] Move the inventory table onto the configurable table-controls system so `section` is groupable and hideable.
- [ ] Make imports -> inventory -> cut logs drilldown behavior more explicit and consistent.
