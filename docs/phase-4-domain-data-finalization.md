# Phase 4 — Domain + Data finalization before application layer

## Context

Before opening the application layer for any module, lock down domain + data across every module in the sweep and strip the Phase-1 dead weight. Scope:

1. **Re-verification pass** over management-companies and properties (already done in Phases 2–3; expected clean).
2. **Cleanup pass** over services and contacts to remove dead references to the dropped join tables (these stay standalone models — never linked to templates or work orders again).
3. **Templates** — new domain + data extraction under `packages/domain/src/management/templates/` and `packages/db/src/management/templates/`. Main section + material items only. Delete everything tied to service items, sales reps, pad products, template→work-order sync, and dead calculations.
4. **Work Orders** — domain stays under `packages/domain/src/flooring/work-orders/`; data layer is fresh at `packages/db/src/flooring/work-orders/` (empty today). Main row only. Delete service items, sales reps, status, unitLabel leftovers, googleDoc/Drive fields, template sync, auto-allocation, expense/commission math.
5. **Job Types** — new read-only module. Seeded via script (no UI, no write repo). Read repository + minimal domain only.

Layer rules reaffirmed:
- Modules must not contain domain logic — they import from `@builders/domain`.
- Data layer only executes reads/writes — no business decisions.
- Domain layer is pure (no I/O, no Prisma, only `zod` as external dep).
- Application layer is out of scope and untouched.

References for new work:
- `packages/db/src/flooring/contacts/` → repo shape for management-companies (already used).
- `packages/db/src/flooring/warehouses/` → repo shape **with `shared.ts`** for work-orders (select literals + payload types extracted).
- `packages/db/src/flooring/manufacturers/` → repo shape without `shared.ts` (simpler reference for job-types read-only).

## Business rules to bake into domain

| Module | Rule | Placement |
| --- | --- | --- |
| Management companies | Cannot be deleted if a property is linked (domain delete-rule predicate) | `management-companies/delete-rules.ts` (new) |
| Management companies | Delete is NOT a cascade — schema already has `Property.managementCompanyId SetNull` | (schema enforces) |
| Properties | Cannot be deleted if a template is linked (domain delete-rule predicate) | `properties/delete-rules.ts` (new) |
| Properties | Delete is NOT a cascade — schema has `FlooringTemplate.propertyId Restrict` | (schema enforces) |
| Templates | Template delete cascades to its material items only — no WO / property / mgmt-co rows touched | Implicit via schema (`FlooringTemplateItem.onDelete: Cascade`, `FlooringWorkOrder.templateId SetNull`) — add a domain note, no blocker |
| Templates | Template save requires `propertyId` | Form validator in `templates/form-rules.ts` |
| Templates | Template `managementCompanyId` is optional | Form validator allows empty |
| Work Orders | Work order save requires `propertyId` | `work-orders/form-rules.ts` |
| Work Orders | Work order delete has no blockers (schema cascade handles items + cut logs) | Domain delete-rule returns "never blocked" |
| Services | Delete is never blocked — the templates/work-orders back-relations are gone | Drop `isServiceDeleteBlocked` entirely |
| Contacts | Delete is never blocked — same reason | Drop `isContactDeleteBlocked` entirely |

## Target structure

```
packages/domain/src/management/
├── management-companies/        (existing — re-verify; add delete-rules.ts)
├── properties/                  (existing — re-verify; add delete-rules.ts)
├── templates/                   NEW
│   ├── index.ts
│   ├── types.ts                 TemplateDetail, TemplateRow, TemplateOption, TemplateForm
│   ├── form-rules.ts            validateTemplateForm (propertyId required), toTemplateForm
│   ├── delete-rules.ts          isTemplateDeleteBlocked → always false (material items cascade, WOs SetNull)
│   ├── normalizers.ts           normalizeTemplate{,ListRow,Option}
│   └── material-items/          NEW subfolder — mirrors warehouses/location-rules style
│       ├── index.ts
│       ├── types.ts             TemplateMaterialItemRow, TemplateMaterialItemForm
│       ├── rules.ts             validateTemplateMaterialItemForm, diff rules for saveSection
│       └── normalizers.ts       normalizeTemplateMaterialItem
└── job-types/                   NEW (writeable — not UI-only)
    ├── index.ts
    ├── types.ts                 JobType, JobTypeOption, JobTypeForm
    ├── form-rules.ts            validateJobTypeForm (name required, unique-name check is DB-side)
    └── normalizers.ts           normalizeJobType{,Option}

packages/domain/src/flooring/work-orders/
├── index.ts                     RE-WRITE (current file re-exports dead allocations + stub)
├── types.ts                     NEW: WorkOrderDetail, WorkOrderRow, WorkOrderOption, WorkOrderForm
├── form-rules.ts                NEW: validateWorkOrderForm (propertyId required), toWorkOrderForm
├── delete-rules.ts              NEW: isWorkOrderDeleteBlocked → always false
├── normalizers.ts               NEW: normalizeWorkOrder{,ListRow,Option}
└── material-items/              DEFERRED — placeholder location documented, NOT created this phase
                                 (work-order material items stay broken until a later phase picks them up;
                                  pattern will mirror templates/material-items/ when built)

packages/db/src/management/
├── management-companies/        (existing)
├── properties/                  (existing)
├── templates/                   NEW
│   ├── read-repository.ts       listTemplates, listTemplateOptions, getTemplateById, countTemplates
│   ├── write-repository.ts      createTemplateRecord, updateTemplateRecord, deleteTemplateRecordById
│   ├── index.ts
│   └── material-items/          NEW subfolder — mirrors domain layout
│       ├── read-repository.ts   listTemplateMaterialItems(templateId, client?)
│       ├── write-repository.ts  create/update/delete + saveTemplateMaterialItemsSection (diff)
│       └── index.ts
└── job-types/                   NEW (read + write)
    ├── read-repository.ts       listJobTypes, listJobTypeOptions, getJobTypeById, countJobTypes
    ├── write-repository.ts      createJobTypeRecord, updateJobTypeRecord, deleteJobTypeRecordById
    └── index.ts

packages/db/src/flooring/work-orders/   NEW (currently empty)
├── shared.ts                    workOrderRowSelect, workOrderDetailSelect, WorkOrderRowPayload, WorkOrderDetailPayload
├── read-repository.ts           listWorkOrders, getWorkOrderById, listWorkOrderOptions, countWorkOrders
├── write-repository.ts          createWorkOrderRecord, updateWorkOrderRecord, deleteWorkOrderRecordById
└── index.ts
(material-items/ subfolder: DEFERRED — same note as domain side)

packages/db/scripts/
└── seed-job-types.js            NEW (seeds initial job-type names; user will supply the list.
                                 Canonical list can be edited later via the write repo once a UI ships.)
```

## Files to delete outright (dead logic)

### Templates module (`apps/web/modules/templates/`)
- `domain/` folder entire (sales-reps.ts, expense-summary.ts, template-snapshot.ts — all dead).
- `application/template-snapshot.ts`, `application/record-sections.ts` (service-item + sales-rep + pad-product save flows live here).
- `data/template-snapshot-queries.ts`, `data/template-snapshot-mutations.ts`.
- `record/panel/controllers/use-template-service-section.ts`.
- `record/panel/controllers/use-template-sales-reps-section.ts`.
- `record/panel/sections/template-service-items-section.tsx`.
- `record/panel/sections/template-sales-reps-section.tsx`.
- `record/panel/sections/template-calculations-section.tsx` (depends on dropped service-items expense math).
- `services.ts`, `queries.ts`, `mutations.ts`, `types.ts`, `validators.ts` at module root (replaced by thin boundary files pointing at `@builders/db`).
- `use-templates-client-controller.ts` at root if it duplicates `controllers/use-templates-list-controller.ts` (keep one).

### Work-orders module (`apps/web/modules/work-orders/`)
- `domain/expense-summary.ts`, `domain/sales-reps.ts`, `domain/material-allocations.ts` (all dead or deferred auto-alloc).
- `application/sync-template.ts`, `application/template-sync-runner.ts`, `application/record-sections.ts`, `application/allocations.ts`, `application/allocation-errors.ts`, `application/manage-work-order.ts` (the last one contains dead field writes for status/googleDoc/unitLabel — rebuild in Phase 5).
- `components/work-order-expense-summary.tsx`, `components/work-order-sync-modal.tsx`.
- `record/panel/controllers/use-work-order-service-section.ts`.
- `record/panel/controllers/use-work-order-sales-reps-section.ts`.
- `record/panel/workflows/use-work-order-auto-allocation-workflow.ts` (and `workflows/` folder if empty after).
- `record/panel/sections/work-order-service-items-section.tsx`.
- `record/panel/sections/work-order-sales-reps-section.tsx`.
- `record/panel/sections/work-order-calculations-section.tsx`.
- `record/panel/sections/material-allocations-editor.tsx`.
- `transport/allocations.ts`.
- `contracts.ts` (TEMPLATE_SYNC_POLICY + WORK_ORDER_STATUS_LABELS both dead).
- `services.ts`, `queries.ts`, `mutations.ts`, `types.ts`, `validators.ts`, `table-filters.ts` (re-do as thin boundary / delete where redundant).

### Work-orders domain under `packages/domain/src/flooring/work-orders/`
- `allocations/` folder (11 files — auto-allocation domain; dead per "auto allocation logic is waste").
- `allocations.ts` root file (sales-rep expense calculators).
- `reservation-semantics.ts` (empty stub).

### API routes under `apps/web/app/api/`
- `templates/[id]/service-items/**` (3 route files + folder).
- `templates/[id]/sales-reps/**` (3 route files + folder).
- `templates/[id]/calculations/route.ts`.
- `work-orders/[id]/service-items/**` (4 route files + folder).
- `work-orders/[id]/sales-reps/**` (4 route files + folder).
- `work-orders/[id]/sync-template/route.ts`.
- `work-orders/[id]/calculations/route.ts`.
- `work-orders/[id]/allocations*` (auto-alloc endpoints — confirm names during execution).

### Tests
- `apps/web/tests/modules/templates/**` (wholesale; rebuilt later).
- `apps/web/tests/modules/work-orders/**` (wholesale).
- `apps/web/tests/modules/services/**`, `apps/web/tests/modules/contacts/**` (stale — rebuilt later).
- Any `template-sync-route.test.ts`, `template-sync-domain.test.ts`, `workflow-core.test.ts` references to deleted flows.

## Edits to existing code (not deletions)

### `packages/domain/src/flooring/services/`
- `types.ts` — remove `usageCount` field from `ServiceRow`.
- `delete-rules.ts` — delete file (never blocked now).
- `index.ts` — drop export for delete-rules.

### `packages/domain/src/flooring/contacts/`
- `types.ts` — remove `assignmentsCount` field from `ContactRow`.
- `delete-rules.ts` — delete file (never blocked).
- `index.ts` — drop export.

### `packages/db/src/flooring/services/read-repository.ts`
- Remove `usageCount` from `ServiceRecord`.
- Remove `_count` from `normalizeServiceRow` signature.
- `getServiceDeleteState` → return `{ id: string } | null` (drop `_count` field from `ServiceDeleteStateResult`), or delete the function entirely (`packages/application/src/flooring/services/delete-service.ts` currently consumes it; simplest path is return `{ id }` so that call site's `contact._count.xxx` fails at typecheck and we fix `delete-service.ts` as a small side-effect — or update `delete-service.ts` in the same phase to drop the block check).

### `packages/db/src/flooring/contacts/read-repository.ts`
- Remove `assignmentsCount` from `ContactRecord`.
- Remove `_count` from `normalizeContactRow` signature.
- `getContactDeleteState` → same treatment.

### `packages/application/src/flooring/services/delete-service.ts` and `packages/application/src/flooring/contacts/delete-contact.ts`
- Edit the use cases to remove the `isDeleteBlocked` gate. Phase 4 touches these two files (they're the only consumers of the deleted domain predicates) as collateral damage. This is the only application-layer code we touch; everything else remains.

### Module UI edits (services, contacts)
- `apps/web/modules/services/components/record/service-primary-fields-section.tsx` + `service-create-client.tsx` — drop `usageCount` references.
- `apps/web/modules/contacts/components/record/contact-primary-fields-section.tsx` + `contact-create-client.tsx` — drop `assignmentsCount`.
- `apps/web/modules/contacts/components/list/contacts-client.tsx` + `contacts-table.tsx` — drop the "assignments" column.

## Templates — what gets built in `packages/domain/src/management/templates/`

```ts
// templates/material-items/types.ts
export type TemplateMaterialItemRow = {
  id: string
  productId: string
  productName: string
  quantity: string
  unitPrice: string
  notes: string
}

export type TemplateMaterialItemForm = {
  productId: string
  quantity: string
  unitPrice: string
  notes: string
}

// templates/types.ts
export type TemplateListRow = {
  id: string
  templateNumber: string
  unitType: string
  description: string
  propertyName: string
  managementCompanyName: string | null
  jobTypeName: string | null
  warehouseName: string
  itemsCount: number
  createdAt: string
  updatedAt: string
}

export type TemplateDetail = TemplateListRow & {
  propertyId: string
  managementCompanyId: string | null
  jobTypeId: string | null
  warehouseId: string | null
  instructions: string
  propertyInstructions: string
  templateNotes: string
  items: TemplateMaterialItemRow[]   // from material-items/types.ts
}

export type TemplateOption = { id: string; templateNumber: string; unitType: string }

export type TemplateForm = {
  propertyId: string
  managementCompanyId: string
  jobTypeId: string
  warehouseId: string
  unitType: string
  description: string
  instructions: string
  templateNotes: string
}

// form-rules.ts
export function validateTemplateForm(input: TemplateForm) {
  if (!input.propertyId) return "Property is required"
  if (!input.unitType.trim()) return "Unit type is required"
  return ""
}

// delete-rules.ts
// Deletion never blocked — material items cascade on the DB side, WOs set templateId to null.
export function isTemplateDeleteBlocked(): false { return false }
```

## Work Orders — what gets built in `packages/domain/src/flooring/work-orders/`

```ts
// types.ts (no sales reps, no service items, no status)
export type WorkOrderRow = {
  id: string
  workOrderNumber: string
  propertyName: string
  managementCompanyName: string | null
  jobTypeName: string | null
  templateNumber: string
  unitNumber: string
  unitType: string
  scheduledFor: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | null
  createdAt: string
  updatedAt: string
}

export type WorkOrderDetail = WorkOrderRow & {
  propertyId: string
  managementCompanyId: string | null
  jobTypeId: string | null
  templateId: string | null
  warehouseId: string | null
  description: string
  instructions: string
  propertyInstructions: string
  notes: string
  customAddress: string
}

export type WorkOrderForm = {
  propertyId: string
  managementCompanyId: string
  jobTypeId: string
  templateId: string
  warehouseId: string
  unitNumber: string
  unitType: string
  customAddress: string
  description: string
  instructions: string
  notes: string
  scheduledFor: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | ""
}
// form-rules.ts / delete-rules.ts / normalizers.ts mirror the template shape.
```

## Job Types — read + write, seeded initial data

A job type is just a name string surfaced as a dropdown on templates and work orders. No UI this sweep — seed script loads initial values. Write repo still ships (user confirmed) so a future minimal UI or seed-rerun can add/edit/delete without a retrofit.

```ts
// packages/domain/src/management/job-types/types.ts
export type JobType = { id: string; name: string }
export type JobTypeOption = JobType
export type JobTypeForm = { name: string }

// packages/domain/src/management/job-types/form-rules.ts
export function validateJobTypeForm(input: JobTypeForm) {
  if (!input.name.trim()) return "Job type name is required"
  return ""  // uniqueness is DB-side (`name String @unique` on FlooringJobType)
}
```

```ts
// packages/db/src/management/job-types/read-repository.ts
export async function listJobTypes(client?)
export async function listJobTypeOptions(client?)
export async function getJobTypeById(id, client?)
export async function countJobTypes(client?)

// packages/db/src/management/job-types/write-repository.ts
export async function createJobTypeRecord(input: { name: string }, client?)
export async function updateJobTypeRecord(id, input: Partial<{ name: string }>, client?)
export async function deleteJobTypeRecordById(id, client?)
```

Seed script at `packages/db/scripts/seed-job-types.js` ships with a TODO placeholder list. User supplies the canonical names; rerunning the script is idempotent (upsert by `name`).

## Templates — material items co-located under templates

Material items are a **child section** of a template, not a separate module. Following the warehouses pattern where `location-rules.ts` and `section-rules.ts` sit alongside `warehouse-rules.ts`, templates get a `material-items/` subfolder inside both `packages/domain/src/management/templates/` and `packages/db/src/management/templates/`:

```ts
// packages/domain/src/management/templates/material-items/types.ts
// (see "Templates — what gets built" section above)

// packages/domain/src/management/templates/material-items/rules.ts
export function validateTemplateMaterialItemForm(input: TemplateMaterialItemForm) {
  if (!input.productId) return "Product is required"
  if (!input.quantity || Number(input.quantity) <= 0) return "Quantity must be greater than zero"
  return ""
}
// plus any diff helpers (computeMaterialItemDiff(current, next))

// packages/db/src/management/templates/material-items/write-repository.ts
export async function createTemplateMaterialItemRecord(templateId, input, client?)
export async function updateTemplateMaterialItemRecord(id, input, client?)
export async function deleteTemplateMaterialItemRecordById(id, client?)
export async function saveTemplateMaterialItemsSection(templateId, diff, client?)  // atomic diff-save
```

**Work-order material items are deferred this phase** — but the intent is the same nesting: `packages/domain/src/flooring/work-orders/material-items/` and `packages/db/src/flooring/work-orders/material-items/` when a later phase picks them up.

## Execution order

1. **Pre-flight**: baseline `@builders/domain` and `@builders/db` both build green (already the case after Phase 3).
2. **Services cleanup** — domain + db repo + module UI + application/delete-service.ts edit. Build domain + db + `npm run typecheck --workspace @builders/web` (services scope should not regress).
3. **Contacts cleanup** — same pattern.
4. **Management companies** — add `delete-rules.ts` to domain; add `countPropertiesByManagementCompanyId(client?)` helper to mgmt-co read repo so the use-case can consult it later (Phase 5).
5. **Properties** — add `delete-rules.ts` to domain; add `countTemplatesByPropertyId(client?)` helper to properties read repo.
6. **Job Types** — create domain (types + form-rules) + read repo + write repo + seed script stub; wire into `packages/db/src/index.ts` + `packages/domain/src/index.ts`.
7. **Templates domain** — new folder `packages/domain/src/management/templates/` with parent files (`types.ts`, `form-rules.ts`, `delete-rules.ts`, `normalizers.ts`) **plus** the `material-items/` subfolder (`types.ts`, `rules.ts`, `normalizers.ts`, `index.ts`). Parent `index.ts` re-exports through the subfolder barrel. Wire into domain package index.
8. **Templates data** — new folder `packages/db/src/management/templates/` with parent `read-repository.ts` + `write-repository.ts` **plus** `material-items/` subfolder (read + write + index). Wire into db package index.
9. **Templates module purge** — delete dead files/folders, rewrite `apps/web/modules/templates/data/{queries,mutations}.ts` as thin boundary wrappers pointing at `@builders/db`. Delete module root `services.ts` / `queries.ts` / `mutations.ts` / `types.ts` / `validators.ts` — replaced by canonical imports + a single `validators.ts` (HTTP parser) that only contains the new shape.
10. **Templates consumers** — repoint dashboard pages + remaining API routes (`/api/templates/...`) at `@builders/db` / `@builders/domain`. Delete the dead route folders (`service-items`, `sales-reps`, `calculations`).
11. **Work Orders domain** — nuke `packages/domain/src/flooring/work-orders/allocations/`, `allocations.ts`, `reservation-semantics.ts`. Add new `types.ts`, `form-rules.ts`, `delete-rules.ts`, `normalizers.ts`, `index.ts`.
12. **Work Orders data** — create `packages/db/src/flooring/work-orders/{shared,read-repository,write-repository,index}.ts` (mirror warehouses).
13. **Work Orders module purge** — delete dead files/folders, rewrite `apps/web/modules/work-orders/data/{queries,mutations}.ts` as thin boundary wrappers. Delete module root `services.ts` / `queries.ts` / `mutations.ts` / `types.ts` / `validators.ts` / `contracts.ts` / `table-filters.ts`.
14. **Work Orders consumers** — dashboard pages + API routes. Delete dead route folders (`service-items`, `sales-reps`, `sync-template`, `calculations`, `allocations*`).
15. **Delete tests** — `apps/web/tests/modules/{templates,work-orders,services,contacts}/**`; and any `template-sync-*.test.ts` / `workflow-core.test.ts` at the engines level that reference dropped flows.
16. **Verify + build** — both package builds green; apps/web typecheck shows only expected failures scoped to record UI (templates primary-fields + work-order primary-fields sections still referencing old field names — Phase 6 cleanup) and the two application files we didn't touch. Flag any surprises.
17. **Single commit**: "Phase 4: finalize domain + data for templates, work-orders, job-types; purge dead sales-reps/service-items/sync/auto-allocation logic; clean services+contacts assignment counts".

## Concerns

1. **Application-layer cross-over (confirmed).** Only `packages/application/src/flooring/services/delete-service.ts` and `.../contacts/delete-contact.ts` get edited this phase — they consume the domain delete predicates we're removing. Everything else in `packages/application/` remains untouched; full rewrite is Phase 5.
2. **UI out of scope (confirmed).** Deleted section components + controllers are gone outright. Primary-fields sections for templates and work-orders will have compile errors against the new types — accepted as the Phase-6 surface. Dashboard pages get surgical fixes (drop dead imports, repoint to canonical reads) so imports at least resolve; rendering correctness is not required this phase.
3. **API routes (confirmed).** Dead route folders are physically removed (Next.js would otherwise still resolve them). All surviving routes for in-scope modules will be rebuilt after the application layer ships (Phase 5+).
4. **Job Types — write repo included (confirmed).** Job type is a simple `{ name }` dropdown value. Domain gets types + form-rules + normalizers. Data gets both read and write repos. Seed script populates initial values; rerun is idempotent via `upsert` on the unique `name`.
5. **Work Orders domain location (confirmed).** Stays under `packages/domain/src/flooring/work-orders/`. Templates, management-companies, properties, and job-types live under `management/`.
6. **Services / contacts delete-rules removal (confirmed).** `isServiceDeleteBlocked` and `isContactDeleteBlocked` are dead code — relations don't exist. No UI regression (list/detail views don't render blocked-delete messaging).
7. **Analytics (confirmed).** Stays optional. `WorkOrderDetail` does not surface analytics; out of scope until a later phase revisits it.
8. **Material items placement (confirmed).** Material-item domain + data lives **as a subfolder under its parent**, not a sibling module:
   - Templates: `packages/domain/src/management/templates/material-items/` + `packages/db/src/management/templates/material-items/` (IN SCOPE this phase — templates material items are built).
   - Work Orders: `packages/domain/src/flooring/work-orders/material-items/` + `packages/db/src/flooring/work-orders/material-items/` (DEFERRED — documented but not created this phase; the existing broken module files stay broken until a later phase picks them up).
   - Pattern mirrors warehouses (where `location-rules.ts` and `section-rules.ts` live alongside `warehouse-rules.ts`), but with a dedicated subfolder given material-items has its own types + rules + normalizers + two repos.
9. **Auto-allocation + reservation-semantics deletion (confirmed).** All stale. Worker and relay services stay intact (they're independent lifecycle; the workflow wiring to auto-allocation is dead but the infrastructure packages are fine). A future phase rebuilds allocation after the core modules stabilize.


## Verification

- `npm run build --workspace @builders/domain` → exit 0.
- `npm run build --workspace @builders/db` → exit 0.
- `rg "templateTag|padProduct|FlooringTemplateServiceItem|FlooringTemplateSalesRep|FlooringWorkOrderServiceItem|FlooringWorkOrderSalesRep|FlooringWorkOrderStatus|TEMPLATE_SYNC_POLICY|googleDocUrl|googleDriveSlip|unitLabel\\b" packages/ apps/` → zero hits outside `docs/`, `archive/`, `migrations/`, `.next/`, `dist/`.
- `rg "prisma\\." apps/web/modules/{templates,work-orders,management-companies,properties,services,contacts}` → zero hits.
- `rg "isContactDeleteBlocked|isServiceDeleteBlocked|assignmentsCount|usageCount" packages/ apps/` → zero hits.
- `rg "auto-allocation|autoAllocat|AutoAllocation" apps/web/modules/work-orders packages/domain/src/flooring/work-orders packages/db/src/flooring/work-orders` → zero hits.
- `ls packages/domain/src/flooring/work-orders/allocations 2>&1` → "No such file or directory".
- `ls apps/web/modules/templates/domain 2>&1` → "No such file or directory".
- `npm run typecheck --workspace @builders/web` — residual errors scoped to: primary-fields UI sections for templates + work-orders (expected Phase 6), any deferred material/cut-log files, and the admin slice (out of sweep). No errors in module `data/**`, API routes we kept, or dashboard pages we repointed.

## Out of scope (confirmed deferred)

- Auto-allocation domain + data + UI (will be re-added after system is secured per user).
- Template → work-order sync (deferred until cut logs secured; see `docs/sweeps/alteration/deferred.md`).
- Work-order material items + cut-log child scope.
- File generation for templates / work orders.
- Application-layer use cases for any module (Phase 5).
- Record-panel UI rebuild for templates + work-orders primary fields (Phase 6).
- Job-types module UI (no UI this sweep — seed-script only).
