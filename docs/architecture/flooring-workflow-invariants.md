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

## Layered call flow for touched routes

- API routes under `app/api/flooring/*` should orchestrate only: auth, rate limiting, request parsing, response shaping, and mutation telemetry.
- Application use cases remain responsible for multi-step workflow orchestration such as import create/update and template sync.
- Domain modules remain responsible for pure business rules and invariants such as template sync behavior and product-display naming.
- Feature `data/` modules are the Prisma boundary for touched workflows such as categories, management companies, imports, inventory, manufacturers, and shared record-detail option loading.
- Shared transport/UI modules should consume application or data loaders and should not import Prisma directly.

## Synchronous execution and future worker hooks

- `runImportIngestUseCase`
- `runTemplateSyncUseCase`
- `runInventorySyncUseCase`

These use cases are currently synchronous application entrypoints. The current production architecture does not run a queue or worker service.

If background workers are introduced later, these functions are the intended entrypoints for queue consumers. Future queue consumers should call application use cases only and should not call Prisma directly.
