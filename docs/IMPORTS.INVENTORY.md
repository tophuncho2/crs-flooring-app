Inventory Plans

Inventort is entered by 
1. Create import row (cananicol section save)
2. add inventory rows to 2nd section of imports record view (cananicol diff sectional save)
3. Cut logs not viewable or toggleable or editable from imports record view. 
4. Inventory rows need a bolean to indicate weather they are have actually been imported to the warehouse.

**Warehouse link needs to be resolved**
1. Imports
- Move Domain into packages/domain
- Move application use cases to packages/application
- Packages/db will be where imports read and write repositories will live
- /record folder will be consolidated into components/ list/ and record/ and the controllers will go under controllers/
- data/ will hold the mutations and queueries files
-  Routes need a _validators file for the edge of routes
- Domain will still validate with its own rules
- Dashbaord/ will import from modules and queueries to render pages.

**Location and warehouse links for inventory and cut logs need to be resolved, current typescript error**
2. Inventory
- Editable from imports record view and inventory record view.
- Move Domain into packages/domain
- Move application use cases to packages/application
- Packages/db will be where inventory read and write repositories will live
- /record folder will be consolidated into components/ list/ and record/ and the controllers will go under controllers/
- modules/x/data/ will hold the mutations and queueries files
-  Routes need a _validators file for the edge of routes
- Domain will still validate with its own rules
- Dashbaord/ will import from modules and queueries to render pages.

3. Cut logs
- Lives within inventory record view
- later will be editable inside of work orders record view. 
- Move Domain into packages/domain
- Move application use cases to packages/application
- Packages/db will be where cut logs read and write repositories will live
- /record folder will be consolidated into components/ list/ and record/ and the controllers will go under controllers/
- modules/x/data/ will hold the mutations and queueries files
-  Routes need a _validators file for the edge of routes
- Domain will still validate with its own rules
- Dashbaord/ will import from modules and queueries to render pages.
- Adding a cut log effects the running balance of an inventory item
- Add a display status to cut logs for display only - later may tie into a domain rule
- No cut logs dashboard page for now, will only live in inventory record view and later the work orders record view.
- cananicol diff

Open an inventory record view to manage cut logs - cut logs will later be linkable to work orders

Work Order
Main Section
1. Update schema with new rows
2. Harden the link to warehouse
3. Harden the main section mutation to follow the cananicol. 
1. Remove the allocation items table in between material items and inventory
- Replace the allocation items child scoped rows of material items with cut logs
- material items and work orders both link to cut logs
- cut logs from work orders record view is what fufills a material items quantity
2. Re wire the warehouse link so it porperly links to a work order row
3. each added work order row is WO+1
4. Re wire warehouse locations to link to inventory rows.
5. 