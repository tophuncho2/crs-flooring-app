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
├── management-companies/   (existing — re-verify)
├── properties/             (existing — re-verify; add delete-rules.ts)
├── templates/              NEW
│   ├── index.ts
│   ├── types.ts            TemplateDetail, TemplateRow, TemplateOption, TemplateForm, TemplateMaterialItemRow, TemplateMaterialItemForm
│   ├── form-rules.ts       validateTemplateForm (propertyId required), toTemplateForm
│   ├── delete-rules.ts     isTemplateDeleteBlocked → always false (material items cascade, WOs SetNull)
│   └── normalizers.ts      normalizeTemplate{,ListRow,Option,MaterialItem}
└── job-types/              NEW
    ├── index.ts
    ├── types.ts            JobType, JobTypeOption
    └── normalizers.ts      normalizeJobType{,Option}

packages/domain/src/management/management-companies/
└── delete-rules.ts         isManagementCompanyDeleteBlocked (blocked if propertyCount > 0)

packages/domain/src/flooring/work-orders/
├── index.ts                RE-WRITE (current file re-exports dead allocations.ts + stub)
├── types.ts                NEW: WorkOrderDetail, WorkOrderRow, WorkOrderOption, WorkOrderForm
├── form-rules.ts           NEW: validateWorkOrderForm (propertyId required), toWorkOrderForm
├── delete-rules.ts         NEW: isWorkOrderDeleteBlocked → always false
└── normalizers.ts          NEW: normalizeWorkOrder{,ListRow,Option}

packages/db/src/management/
├── management-companies/   (existing)
├── properties/             (existing)
├── templates/              NEW
│   ├── read-repository.ts  listTemplates, listTemplateOptions, getTemplateById, countTemplates, listTemplateMaterialItems
│   ├── write-repository.ts createTemplateRecord, updateTemplateRecord, deleteTemplateRecordById, create/update/delete material items, saveTemplateMaterialItemsSection (diff)
│   └── index.ts
└── job-types/              NEW (READ ONLY)
    ├── read-repository.ts  listJobTypes, listJobTypeOptions, getJobTypeById
    └── index.ts

packages/db/src/flooring/work-orders/   NEW (currently empty)
├── shared.ts               workOrderRowSelect, workOrderDetailSelect, WorkOrderRowPayload, WorkOrderDetailPayload
├── read-repository.ts      listWorkOrders, getWorkOrderById, listWorkOrderOptions, countWorkOrders
├── write-repository.ts     createWorkOrderRecord, updateWorkOrderRecord, deleteWorkOrderRecordById
└── index.ts

packages/db/scripts/
└── seed-job-types.js       NEW (seed script for FlooringJobType; user supplies initial list)
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
// types.ts
export type TemplateTemplateItemRow = {
  id: string
  productId: string
  productName: string
  quantity: string
  unitPrice: string
  notes: string
}

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
  items: TemplateTemplateItemRow[]
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

## Job Types — read-only

```ts
// packages/domain/src/management/job-types/types.ts
export type JobType = { id: string; name: string }
export type JobTypeOption = JobType
```

```ts
// packages/db/src/management/job-types/read-repository.ts
export async function listJobTypes(client?)  // all rows, ordered by name
export async function listJobTypeOptions(client?)
export async function getJobTypeById(id, client?)
```

No write repo. Seed script stubs out with a placeholder list; user fills with real job types later.

## Execution order

1. **Pre-flight**: baseline `@builders/domain` and `@builders/db` both build green (already the case after Phase 3).
2. **Services cleanup** — domain + db repo + module UI + application/delete-service.ts edit. Build domain + db + `npm run typecheck --workspace @builders/web` (services scope should not regress).
3. **Contacts cleanup** — same pattern.
4. **Management companies** — add `delete-rules.ts` to domain; add `countPropertiesByManagementCompanyId(client?)` helper to mgmt-co read repo so the use-case can consult it later (Phase 5).
5. **Properties** — add `delete-rules.ts` to domain; add `countTemplatesByPropertyId(client?)` helper to properties read repo.
6. **Job Types** — create domain + read-only data repo + seed script stub; wire into `packages/db/src/index.ts` + `packages/domain/src/index.ts`.
7. **Templates domain** — new folder under `packages/domain/src/management/templates/`; wire barrel into domain package index.
8. **Templates data** — new folder under `packages/db/src/management/templates/`; wire barrel into db package index.
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

1. **Application layer cross-over.** Only two files in `packages/application/` get edited: `delete-service.ts` and `delete-contact.ts`. Scope creep is minimal and justified (collateral damage from dropping the domain predicates). Everything else in `packages/application/` remains untouched and will be rewritten in Phase 5.
- goos 
2. **UI cascades.** Many record-panel files reference types that are disappearing (e.g., `DraftWorkOrder.status`). Where a component still renders a field we're dropping (status dropdown, pad product select, service-items grid, sales-reps grid, template sync modal), the component's file is deleted outright in this phase. The remaining primary-fields section for each module will have compile errors against the new types until Phase 6 rebuilds the UI — this is the expected red-build surface.
- confirn, ui is out of scope
3. **Dashboard pages** for templates and work-orders will compile-error on removed imports. Acceptable for this phase — the page files get surgical fixes (drop the dead import, swap to canonical data reads) so the app can at least resolve modules. The full UI doesn't need to render for Phase 4 to ship.
- good
4. **API routes** — any route tied to a deleted flow must be physically removed, not just have its handler gutted, otherwise Next.js would still resolve it. Removing the route folder also removes the file from the router.
- agreed. api routes will be rebuilt / restuctured for the modules in scope in next phases after application is set up
5. **Job-types seed script** ships as a stub with TODO comments. User will supply the canonical list; first working seed lands before the templates/work-orders UI goes live in Phase 7.
- agreed, job type is just regular string text being linked by a dropdown in templates and work orders. still need domaian read and write. 
6. **Work Orders domain location.** User confirmed stays under `flooring/` (with manufacturers + warehouses as reference). Everything else in the sweep lives under `management/`. Cross-package imports are fine — both packages export through their barrels.
- confirmed. templates goes under management/ however.
7. **Services/contacts delete-rules removal.** Deleting `isContactDeleteBlocked` and `isServiceDeleteBlocked` from domain means no UI messaging remains for blocked deletes. Since the relations no longer exist, deletion is always safe at the DB level — the messages were dead. Module UI doesn't currently render those messages (verified in scan), so no UI regression.
- agreed
8. **`analytics` on work orders stays optional** (user retracted the "make required" earlier). The new domain `WorkOrderDetail` doesn't surface analytics at all; analytics is a separate module scope for a later phase.
- agreed. dont worry about analytics yet,.
9. **Deferred files stay put** (we don't touch them): `apps/web/modules/work-orders/record/panel/sections/work-order-material-items-section.tsx`, `use-work-order-material-section.ts`, material API routes, cut-log wiring. They're in a known-broken state after this phase (references to removed types / old signatures); a later phase picks them up.
- yes work order material items are broken right now. still keep material item domain tied with the parent work order. so the domain and data layer for work order and template material items go with the template or work order domain. not seperate directories. 
- look at warehouses domain. the location / section rules have there own file. work orders and templates should follow that pattern for material items (cut logs still out of scope). prefferebly material items have a folder under either template and work order in domain. so example is domain/src/management/templates/material-items/rules ectt. files
10. **Reservation semantics** — if any non-auto-allocation consumer imports from `packages/domain/src/flooring/work-orders/reservation-semantics.ts`, the grep comes back empty (file is a stub). Safe to delete.
- agreed, auto allocation is stale, worker and relay flows will fix these later.
- stale code can go, worker and relay services stay.


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
