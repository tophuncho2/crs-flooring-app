Work Order Life Cycle

1. User creates work order from scratch or syncs a template
2. User fills in primary fields, material items, service items, and sales reps.
3. Users manually allocate inventory to material items (staged cuts from inventory rows)
4. Or, users use the auto allocation worker. 
5. Auto allocation finds the best fit inventory based on the material items quantit and whats already allocated. 
6. Worker adds the child scoped rows to each material item
7. Once allocations are final, user activates the second worker flow, which adds cut logs to inventory based of the allocations, and then creates a file for the warehouse and a file for the installer. 
8. Once this process is complete, the record view reconciles.
9. Once the job is fully finished it gets marked complete which updates the company analytics

Rules Per Phase

Template to work order sync.
- Syncing a template to work order links the template to the work orders unit type field.
- Work order is its own source of truth, editing a work order after sync does not effect the real template, and vice versa
-  All material items, service items, and Sales reps items are synced to the work order.
- Syncing a template to work order does not automatically add child scoped rows to material items in work orders or trigger any workers
- Syncing is idempotent and transactional

Allocating Inventory to Material Items.
- The warehouse in the work orders primary row is the only warehouse inventory can be pulled from per work order.
- When an inventory item is linked to allocations, the unit price of the inventory row is added to the allocations row. 
- When an inventory item is linked to allocations, the inventorys reserved / allocated counts must update in the same transaction
- An inventory row can never be allocated to more than what its stock balance is worth
- Inventory rows can be allcoted multiple times in multiple work orders as long as the stock is there. 
- Material items can allocated the same invenory multiple times to produce multiple cuts (usually for carpet or vinyl sheet)
- Allocating an inventory row to a work order updates the companies expense for the work order.
- 

Auto Allocation
- A worker process is initiated from the material items section controller of the work orde record view. 
- The worker sees what is already allocated if at all, and adds allocations per material item to fufill the quantity requested.
- If each material item is fufilled when a worker is activated then the proccess stops and returns a notice
- Each warehouse has prefferences per category as to which section to pull from first. And then the work starts with the preffered section and only goes to other sections if the preffered doesnt fufill.
- inventory can be allocated from different sections to one material row if needed.
- If the worker cant fufill a material item, it allocates whats there and marks the material item as "Shortage"
- A material items status can only be fufilled if the quantity requested is fufilled.
- If a material item is already fufilled the worker ignores it.






