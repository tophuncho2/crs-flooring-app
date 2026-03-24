# Flooring Workflow Invariants

This document marks which invariants are enforced by the database and which are still enforced by application code.

## DB-backed invariants

- `FlooringWorkOrderSalesRep` and `FlooringTemplateSalesRep` prevent duplicate contact links per parent record through composite uniqueness.
- `FlooringContactType` is constrained by the Prisma enum and only valid values can persist.
- `UserTablePreference` is unique per `(userId, tableKey)`.
- Work-order template provenance fields added in `20260322160000_work_order_template_sync_source_ids` preserve source row identity once written.

## Application-backed invariants

- Only `SALES_REP` contacts may be linked as template/work-order sales reps.
- Template-to-work-order sync rules decide whether snapshot rows are appended, overwritten, or deleted.
- Inventory cut logs must maintain a non-negative running balance and rebalance downstream rows after deletion.
- Import entries may only reference warehouse locations that belong to the selected warehouse and an actual section.
- Product names are normalized from the category-based naming contract before persistence.

## Transaction-sensitive workflows

- Import create/update must write the header and inventory rows atomically.
- Work-order creation with an optional template snapshot must create the header and seeded child rows atomically.
- Cut-log deletion must delete the target row and rebalance the remaining rows in one transaction.
- Template deletion must remove sales reps, service items, material items, and the template in one transaction.

## Worker-ready use cases

- `runImportIngestUseCase`
- `runTemplateSyncUseCase`
- `runInventorySyncUseCase`

These use cases are the intended entrypoints for future queue workers. Queue consumers should call application use cases only and should not call Prisma directly.
