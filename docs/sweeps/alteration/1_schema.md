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

---

## Open Questions — need answers before migrating

1. **Work-order `status` removal scope.** The column drives far more than `isComplete`: list-view column + grouping + badge CSS, primary-fields form field, status filter (Prisma WHERE builder + filter options), validator parsing, contracts' label map. Are we removing all status UI/logic in this sweep, or keeping some surfaces with a non-FK stand-in? If removing, confirm the list view loses its status column + filter entirely.
- confirmed to remove status column and filter entirely.
2. **`unitLabel` → `unitNumber` rename collision risk.** The pre-reset archive (`migrations_pre_model_a_reset/20260323200000_remove_work_order_unit_number`) dropped a prior integer `unitNumber` column and folded its text into `unitLabel`. Renaming `unitLabel` → `unitNumber` revives the name. Is that intentional? Any downstream consumer (export, third-party, prior analytics) that might still expect integer semantics on that column name?
- would it be better to drop unit label column and add a new one for unit number (unit number is string not a number only field)
3. **Making `analytics` required.** Current state is `FlooringAnalytics?` optional. Before flipping NOT NULL, do we (a) assume all environments already have 1:1 coverage and fail-fast on migration, or (b) include a backfill step that inserts a default `FlooringAnalytics` row per orphan work order in the same migration?
- remove this requirement
- have work orders be linked to analytics but not required
- will add a dropdown field in the future to manually link it to analytics, not required.
- iscomplete boolean and link to analytics stay, status enum gets dropped.
4. **`padProduct` / `padProductId` UI dependency.** The schema drop forces removal of an entire dropdown surface across template create + detail clients, primary-fields section, options loader, and multiple queries/mutations. Confirm the pad-product selector is fully cut from the template UI in this sweep (otherwise the migration breaks the UI).
- fully cut these 
5. **Migration split.** Recommend splitting into three ordered migrations to keep each one reversible and to allow app-code deploy between steps:
   - **(a) Additive:** create `flooring_job_type`; add `instructions` on `property_hub`; add `description`, nullable `managementCompanyId`, nullable `jobTypeId` on template + work order; add `jobType` back-relations.
   - **(b) Rename + backfill:** `templateTag` → `unitType`; `unitLabel` → `unitNumber`; backfill analytics if we chose that path.
   - **(c) Destructive:** drop `flooring_template_service_item`, `flooring_template_sales_rep`, `flooring_work_order_service_item`, `flooring_work_order_sales_rep`; drop `store`, `padProductId`, `googleDocUrl`, `googleDriveSlip`, `status` columns; drop `FlooringStoreCode`, `FlooringWorkOrderStatus` enums; flip `analytics` to required.
   Confirm, or say you'd rather land one atomic migration (requires the full app-code sweep to ship in the same deploy).
   - one atomic migration
   - no backfill reuqired, there are no rows in the db
   - npx prisma migrate deploy is what we use for migrations
6. **Lockstep vs pre-landed app code.** Prisma `generate` will refuse if app code still references dropped models/enums/columns. Do we want the app-code sweep (see blast radius below) to land *before* the destructive migration (so step 3 is a clean drop), or everything in one deploy? The answer here drives whether we break the build at any intermediate point.

## Blast Radius — app-code changes forced by this migration

Counts are from `rg` over `apps/**` + `packages/**` excluding `node_modules`, `.next`, `dist`, migration folders, and the `docs/sweeps/alteration/` planning files.

### Non-mechanical rewrites (status, validators, queries)

- `packages/db/src/index.ts` — drop `FlooringWorkOrderStatus` re-export.
- `apps/web/modules/work-orders/validators.ts` — rewrite: imports `FlooringWorkOrderStatus`, parses status (~L40, 137, 141, 445, 468), `unitLabel` parsing (L44, 449, 472), googleDoc/Drive fields, padProduct branches.
- `apps/web/modules/work-orders/queries.ts` — rewrite: `buildWorkOrderStatusWhere` (L119–120, 148), sort-by-unit (L176), unit filter (L110), `unitLabel` → `unitNumber`.
- `apps/web/modules/work-orders/mutations.ts` — create + update paths for status, unitLabel, padProduct, googleDoc/Drive.
- `apps/web/modules/work-orders/services.ts` — drop `status`/`statusLabel` projection (L82–84), rename `unitLabel` (L59, 92).
- `apps/web/modules/work-orders/contracts.ts` — `WORK_ORDER_STATUS_LABELS` (L32, 72), `TEMPLATE_SYNC_POLICY` entries for googleDoc/Drive + unitLabel (L36 + L40–41).
- `apps/web/modules/work-orders/domain/filters.ts` — drop `status` from filter type.
- `apps/web/modules/work-orders/table-filters.ts` — drop `WORK_ORDER_STATUS_OPTIONS` filter builder.
- `apps/web/modules/work-orders/list/work-orders-client.tsx` — status column, `workOrderStatusText`, badge class, status grouping (L41, 100, 144).
- `apps/web/modules/work-orders/record/panel/sections/work-order-primary-fields-section.tsx` — status form field + label (L23, 68).
- `apps/web/modules/work-orders/application/manage-work-order.ts` — strip googleDoc/Drive, rename unitLabel (L32, 72–73).

### Record-panel sections to delete outright (dedicated to dropped relations)

- `apps/web/modules/templates/record/panel/controllers/use-template-service-section.ts`
- `apps/web/modules/templates/record/panel/controllers/use-template-sales-reps-section.ts`
- `apps/web/modules/work-orders/record/panel/controllers/use-work-order-service-section.ts`
- `apps/web/modules/work-orders/record/panel/controllers/use-work-order-sales-reps-section.ts`
- Plus their wiring inside `templates/record/panel/template-record-panel.tsx`, `work-orders/record/panel/work-order-record-panel.tsx`, and shared section-row/calculation builders under `modules/shared/engines/record-view/`.

### `padProduct` / `padProductId` removal (~10 files)

Template module: `services.ts`, `types.ts`, `queries.ts`, `mutations.ts`, `validators.ts`, `record/panel/shared.ts`, `record/panel/controllers/use-template-primary-section.ts`, `record/panel/sections/template-primary-fields-section.tsx` (5 refs), `record/create/template-create-client.tsx` (8 refs — largest UI surface), `record/detail/template-detail-client.tsx`. Plus the options loader at `apps/web/modules/shared/engines/common/transport/record-detail-options-loader.ts` (6 refs — pad-product dropdown).

### Mechanical renames

- **`templateTag` → `unitType`** — ~25 files: templates module (services/validators/queries/mutations/types/list/record create + detail/primary-fields/shared/controller), properties module (services/queries/mutations/domain/types/record/property-templates-section), management-companies module (services/domain/data queries + mutations/record properties-section), app dashboard templates pages, 5 test files, plus `records-detail-options-loader`.
- **`unitLabel` → `unitNumber`** — ~8 app files (work-orders services/queries/validators/contracts/mutations/manage-work-order.ts/record sections), plus test fixtures.

### Tests to update / delete

- Template & work-order service-section and sales-rep-section tests (co-located with the dedicated controllers above).
- `apps/web/tests/engines/record-view/workflow-core.test.ts` — fixture already flagged in `3_data.md` for googleDoc/Drive, also touches unitLabel (2 refs) and templateTag (4 refs).
- `apps/web/tests/modules/templates/templates-routes.test.ts` (13 templateTag refs), `templates-domain.test.ts` (5 refs), `template-sync-domain.test.ts` (4 refs), `templates-client.test.tsx`, `template-record-panel.test.tsx`.
- `apps/web/tests/engines/record-view/record-create-clients.test.tsx` and `record-view-single-section-engine.test.tsx`.

- absolutely no tests are added in this part of the sweep.
- tests are only deleted / moved out of the way untill i say differently.

### Low-risk / confirmed safe

- `FlooringStoreCode` enum — zero app references outside `schema.prisma`. Clean drop.
- `store` column on template — zero app references (already marked confirmed dead).
- The four dropped models themselves are **never imported by name** in app code — all access is through relation traversal on parent records. That means no type-import cleanup for the models themselves; the surface is entirely the `serviceItems` / `salesReps` relation reads and their dedicated panel sections listed above.
