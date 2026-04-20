Inventory Plans

Inventort is entered by 
1. Create import row (cananicol section save)
2. add inventory rows to 2nd section of imports record view (cananicol diff sectional save)
3. Cut logs not viewable or toggleable or editable from imports record view. 
4. Inventory rows need a bolean to indicate weather they are have actually been imported to the warehouse.

1. Imports
- Move Domain into packages/domain
- Move application use cases to packages/application
- Packages/db will be where imports read and write repositories will live
- /record folder will be consolidated into components/ list/ and record/ and the controllers will go under controllers/
- data/ will hold the mutations and queueries files
-  Routes need a _validators file for the edge of routes
- Domain will still validate with its own rules
- Dashbaord/ will import from modules and queueries to render pages.

2. Inventory
- Editable from imports record 