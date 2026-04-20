# Properties Domain — Rules

Brief stub.

- `validatePropertyInput` — structural validation (name required, optional address fields length-bounded).
- `isPropertyDeleteBlocked({ hasWorkOrders, hasTemplates })` — pairs with schema-level `onDelete: Restrict` on both child relations.
