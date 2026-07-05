# Product UoM & Category Backbone — Executed

> This epic is **done**. The per-row `unitId` FK backbone shipped end-to-end (product,
> inventory, adjustment, staged rows, filter rows, template items, WO items), send-unit is
> gone, and category slug is dropped. The full plan has been removed — only the one open
> item below remains.

## Still pending — Category & UoM are not yet user-managed

Category and Unit-of-Measure remain **read-only** modules. Making them user-managed CRUD is
deferred, blocked on a decision about what to do next.

**The complication.** Products **paste the category snapshot onto the product row** (the stored
`product.name` is composed from the category name). So editing the actual category row gets
messy — a rename would leave every product that snapshotted the old category name stale unless
we recompose those names, and the same coupling has to be reasoned through for any category
edit or delete. That coupling is the open question that has to be resolved before Category/UoM
become mutable.

**Next step:** decide how category edits reconcile with the product-side snapshot (recompose on
rename? break the snapshot coupling? block renames while linked?) before building the CRUD.
