# Current Plan — Management-System Sweep

Layer-by-layer destructive restructure of the management-system modules (`docs/sweeps/alteration/`). Order: **schema → domain → data → application → api → modules → dashboard.** Tests are deleted module by module as each layer is rebuilt (to be re-authored in a later pass). Services and contacts models stay intact — only their back-relations to the dropped join tables are removed.

Module completion order (used across every layer file):
1. Management Companies
2. Properties
3. Templates (with material items as the sole child section)
4. Job Types
5. Work Orders (main section; material items with cut-log child scope deferred)

## Status

### ✅ Phase 1 — Schema migration (DONE, applied to Railway staging)

Applied `20260423152350_management_system_alteration` to the staging DB via `npm run db:deploy`. Verified against `information_schema` and Prisma client counts.

Schema changes landed:
- `FlooringManagementCompany` — now back-relates to `templates` + `workOrders`.
- `Property` — added `instructions`.
- **New:** `FlooringJobType` (id, name unique, timestamps, back-relations to templates + work orders).
- `FlooringTemplate` — dropped `padProductId`/`padProduct`, dropped `store`, renamed `templateTag` → `unitType`, added `description`, `jobTypeId`, `managementCompanyId`, `propertyInstructions`; removed `serviceItems`/`salesReps` relations.
- `FlooringWorkOrder` — dropped `status`, `googleDocUrl`, `googleDriveSlip`; renamed `unitLabel` → `unitNumber`; added `description`, `jobTypeId`, `managementCompanyId`, `propertyInstructions`; removed `serviceItems`/`salesReps` relations. `analytics` remains **optional** (invariant retracted — WOs not required to link to an analytics row).
- Dropped models: `FlooringTemplateServiceItem`, `FlooringTemplateSalesRep`, `FlooringWorkOrderServiceItem`, `FlooringWorkOrderSalesRep`.
- Dependent cleanup on `FlooringService`, `FlooringContact`, `FlooringUnitOfMeasure` — back-relations to the dropped tables removed.
- Dropped enums: `FlooringWorkOrderStatus`, `FlooringStoreCode`.

Design notes baked into the schema:
- `instructions` on template/work order = the record's own editable notes.
- `propertyInstructions` on template/work order = snapshot from the linked property's `instructions` at link time; editable thereafter. Snapshot/editable semantics live in the domain/application layers (no DB trigger).

### 🟡 Phase 2 — Domain layer (STARTS NEXT)

Build `apps/web/modules/**/domain/` per module in the completion order above. Each module's domain folder will hold pure logic: predicates, message builders, derived calculations. No I/O, no repository calls. Stale tests under each module are deleted as the domain is rewritten; tests will be re-authored after the full sweep.

Checklists live in `docs/sweeps/alteration/2_domain.md`.

### 🔜 Subsequent phases

- Phase 3: **data** layer (repositories, queries, mutations) — `docs/sweeps/alteration/3_data.md`.
- Phase 4: **application** layer (use cases / orchestration) — `docs/sweeps/alteration/4_application.md`.
- Phase 5: **api routes** — `docs/sweeps/alteration/5_api_routes.md`.
- Phase 6: **modules directory** cleanup (clean layer placement) — `docs/sweeps/alteration/6_modules_directory.md`.
- Phase 7: **dashboard loaders** — `docs/sweeps/alteration/7_dashboard_loaders.md`.

Deferred items (post-sweep): template/work-order sync mutation flow, cut logs integration inside work order material items, file generation for work orders, auto-allocation. Tracked in `docs/sweeps/alteration/deferred.md`.

## Expected build state

After Phase 1 (now): `npm run typecheck` will fail on every consumer of removed/renamed fields — `status`, `unitLabel`, `templateTag`, `googleDocUrl`, `googleDriveSlip`, `padProductId`, and the four dropped join-table types. Typecheck greens back module by module as domain/data/app layers are rewritten in Phases 2–7.

## Key references

- Schema source: `packages/db/prisma/schema.prisma`.
- Applied migration: `packages/db/prisma/migrations/20260423152350_management_system_alteration/`.
- Sweep plans: `docs/sweeps/alteration/` (per-layer checklists grouped by module).
- Mocks of pre-migration Prisma shape (kept for blast-radius reference): `docs/sweeps/alteration/mocks.md`.
