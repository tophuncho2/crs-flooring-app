# Schema (Prisma) — Alterations

Schema changes for the management-system sweep. Grouped by module. Source comments in `../mocks.md`.

## Management Companies (`FlooringManagementCompany`)

- [ ] Add relation to work orders (1 work order won't have more than 1 management company)
- [ ] Add relation to templates (1 template won't have more than 1 management company)
- [ ] Keep the link optional on templates and work orders (not a required field)

## Properties (`Property`)

- [ ] Add `instructions` column

## Templates (`FlooringTemplate`)

- [ ] Remove `padProductId` + `padProduct` relation
- [ ] Add `description` field
- [ ] Drop `store` column — confirmed dead (only in `schema.prisma` + baseline migration; no app reads/writes)
- [ ] Rename `templateTag` to `unitType`
- [ ] Add `jobTypeId` + relation to new `FlooringJobType`
- [ ] Remove `serviceItems` relation (unlink from `FlooringTemplateServiceItem`)
- [ ] Remove `salesReps` relation (unlink from `FlooringTemplateSalesRep`)
- [ ] Drop `FlooringTemplateServiceItem` model entirely
- [ ] Drop `FlooringTemplateSalesRep` model entirely

## Work Orders (`FlooringWorkOrder`)

- [ ] Add relation to management companies
- [ ] Add relation to job types
- [ ] Add `description` column
- [ ] Drop `googleDocUrl` + `googleDriveSlip` columns — refactor of `apps/web/modules/work-orders/` callers required (see domain/data/application/api-routes layer files)
- [ ] Remove `status` column
- [ ] Rename `unitLabel` to `unitNumber` - stays as string, not number only
- [ ] Make `analytics` relation required (every work order must be linked to an analytics row)
- [ ] Remove `serviceItems` relation (unlink from `FlooringWorkOrderServiceItem`)
- [ ] Remove `salesReps` relation (unlink from `FlooringWorkOrderSalesRep`)
- [ ] Drop `FlooringWorkOrderServiceItem` model entirely
- [ ] Drop `FlooringWorkOrderSalesRep` model entirely

## Dependent Relation Cleanup (from dropped service-item / sales rep models)

- [ ] `FlooringService` — remove `templateItems` and `workOrderItems` back-relations (model itself stays intact)
- [ ] `FlooringContact` — remove `templateSalesReps` and `workOrderSalesReps` back-relations (model itself stays intact)
- [ ] `FlooringUnitOfMeasure` — remove `templateServiceItems` and `workOrderServiceItems` back-relations

## Job Type (`FlooringJobType`) — new model

- [ ] Add `FlooringJobType` model (`id`, `name`, relations to templates and work orders) — see `../mocks.md`
- [ ] Add `jobTypeId` + `jobType` relation on `FlooringTemplate` with `@@index([jobTypeId])`
- [ ] Add `jobTypeId` + `jobType` relation on `FlooringWorkOrder` with `@@index([jobTypeId])`

## Referenced Enums

- [ ] Drop `FlooringStoreCode` enum — confirmed dead (defined in `schema.prisma` + baseline migration, no app usages)
- [ ] Drop `FlooringWorkOrderStatus` enum (status column is being removed)
