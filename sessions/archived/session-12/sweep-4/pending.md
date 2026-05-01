
Important - things
[ ] Dropdown function used in work orders, template, and sync panel for {Manufacturer - Property - Template}
[ ] Sets the pattern for more dropdowns to be used.
[ ] Enable rich dropdowns with search bar in it.
[ ] Need a pattern so rich dropdowns can handle tables with thousands of rows. 
[ ] dropdown used in WOMI section is high priority also
[ ] Drop downs with less options to choose from (Warehouse) can wait, but Locations dropdown can't





Imports, Inventory, Staged Inventory, Cut logs,
[ ] Remove cost and freight columns from UI (not schema)
[ ] Decompose controllers in inventory cut logs section
[ ] Decompose workers triggered from inventory cut log section

Work Order
[ ] Harden the workers triggered from WOMI section - (Pending Cut - Finalize Cuts)
[ ] Secure voiding cut logs
[ ] List view grouping, filtering, search

Template Sync (Button in top right)
[ ] Secure the {Management Co. , Property, template dropdown flow}
[ ] Once a template is selected from the dropdown, show template info below (preview), click sync to create NEW work order from it. 
[ ] synchronous, all syncs orchestrated through the button in the top right of the app shell.

Templates
[ ] Migrate off of modules/shared
[ ] Enable server side list view search, filtering, grouping. 

Products
[ ] Migrate off of modules/shared
[ ] Enable server side list view search, filtering, grouping.

Warehouse
[ ] Migrate off of modules/shared
[ ] No list view controls needed, just the create form button.

Properties
[ ] Migrate off of modules/shared
[ ] Enable server side list view search, filtering, grouping. 

Management Companies
[ ] Migrate off of modules/shared
[ ] Enable server side list view search

Manufacturers
[ ] Migrate off of modules/shared
[ ] Enable server side list view search


Categories / Unit of Measures List
[ ] Last to be migrated off of the engine

## Sunmary
**we need a set pattern for**
[ ] Rich dropdowns with search bar
[ ] List view tools / controls