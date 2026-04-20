Products.

Basic Outline
1. Remove base color drop down options
2. Remove add base color option
3. Inventory section is open only, no cut logs as child scoped rows. No section save or edits. 


App / API / Products
1. Route for create
2. Route for delete
3. Route for delete
4. _validators for the route edge

App / dashboard/
1. page for create
2. List view page
3. Record view page

web/modules
/application/
1. Application use cases moved to packages/application/src/flooring/products
- Create
- Update
- Delete

/domain/
1. Domain rules / logic move to packages/domain/src/flooring/products
2. type.ts move to packages/domain/src/flooring/products

/record/
1. consolidate into components/ record/ and list/ - and controlls go in controllers/

/data/
1. harden the mutations file 
2. harden the queuries file (dashboard/page imports this)

identify what servives.ts are for and their final home 
validators.ts identify, and should they live in the route for the route validators
_validators in route edge and domain validation is used. 
packages/db/src/flooring/products will be cananicol read and write repositories for products. 


Inventory section of record view
- Open inventory button - record entry to inventory record. 
- No toggle to show cut logs
- Non editable inventory rows from this section.


CLAUDE CODE ADD PLAN HERE