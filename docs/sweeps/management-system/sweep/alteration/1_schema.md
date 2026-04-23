# Schema (Prisma) — Alterations

Schema changes for the management-system sweep. Grouped by module. Source comments in `../mocks.md`.

## Clients / Management Companies (`FlooringManagementCompany`)

- [ ] Add relation to work orders (1 work order won't have more than 1 management company)
- [ ] Add relation to templates (1 template won't have more than 1 management company)
- [ ] Keep the link optional on templates and work orders (not a required field)

## Clients / Properties (`Property`)

- [ ] Add `instructions` column

## Main-Hub / Templates (`FlooringTemplate`)

- [ ] Remove `padProductId` + `padProduct` relation
- [ ] Add `description` field
- [ ] Drop `store` column — confirmed dead (only in `schema.prisma` + baseline migration; no app reads/writes)
- [ ] Rename `templateTag` to `unitType`
- [ ] Add `jobTypeId` + relation to new `FlooringJobType`

## Main-Hub / Work Orders (`FlooringWorkOrder`)

- [ ] Add relation to management companies
- [ ] Add relation to job types
- [ ] Add `description` column
- [ ] Drop `googleDocUrl` + `googleDriveSlip` columns — refactor of `apps/web/modules/work-orders/` callers required (see domain/data/application/api-routes layer files)
- [ ] Remove `status` column
- [ ] Remove `isComplete` boolean
- [ ] Rename `unitLabel` to `unitNumber` - stays as string, not number only
- [ ] Make `analytics` relation required (every work order must be linked to an analytics row)

## Main-Hub / Work Orders / Items (`FlooringWorkOrderItem`, `FlooringWorkOrderServiceItem`, `FlooringWorkOrderSalesRep`)

- [ ] Clarify purpose of `sourceTemplateItemId` / `sourceTemplateServiceItemId` / `sourceTemplateSalesRepId` — is this for template-linked stats tracking?

## User Data / Job Type (`FlooringJobType`) — new model

- [ ] Add `FlooringJobType` model (`id`, `name`, relations to templates and work orders) — see `../mocks.md`
- [ ] Add `jobTypeId` + `jobType` relation on `FlooringTemplate` with `@@index([jobTypeId])`
- [ ] Add `jobTypeId` + `jobType` relation on `FlooringWorkOrder` with `@@index([jobTypeId])`

## Referenced Enums

- [ ] Drop `FlooringStoreCode` enum — confirmed dead (defined in `schema.prisma` + baseline migration, no app usages)
- [ ] Drop `FlooringWorkOrderStatus` enum (status column is being removed)
