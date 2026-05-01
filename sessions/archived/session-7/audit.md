# Audit — Work Orders + Templates

Current state of every layer for the two in-scope modules. Read alongside `intent.md`.

## TL;DR

- Schema is **mostly there** — both models exist with all relations. Two deltas needed: a `status` enum + column on `FlooringWorkOrder` and `FlooringTemplate`, plus the file-output column(s) (depending on bucket vs. direct-download decision).
- Templates have a **full-stack vertical slice** (domain, db, application, module dir, API routes, dashboard pages).
- Work orders have a **partial slice** — domain + db exist, but **application package, API routes, and dashboard pages are missing**. The module dir at `apps/web/modules/work-orders/` is also non-canonical (uses `list/`, `record/` siblings instead of `components/list` + `components/record`).
- `unitPrice` is wired into both modules — DB columns stay, but rule files, normalizers, controllers, and UI all reference it and must be stripped.
- `templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash` exist on `FlooringWorkOrder` but **zero references in code** — pure schema prep that the template-sync flow will activate.
- Template-sync button is a **shell only** — no real options data, no submit handler.
- **TS error baseline could not be captured**: this worktree has no installed `node_modules`, so `tsc` is not available. `npm run typecheck` also fails before tsc on a `guard:prisma` violation in `packages/domain/src/flooring/imports/staged-inventory-rows/types.ts` (direct `@prisma/client` import — out of scope for this branch).

## Schema (`packages/db/prisma/schema.prisma`)

### `FlooringWorkOrder` (lines 512–555)
Existing fields:
- Identity: `id`, `workOrderNumber` (sequence-backed default).
- Relations: `property`, `template?`, `managementCompany?`, `jobType?`, `warehouse?`, `items` → `FlooringWorkOrderItem`, `analytics?` → `FlooringAnalytics`, `cutLogs` → `FlooringCutLog`.
- State: `isComplete` (boolean), `vacancy` (`FlooringVacancyStatus?`).
- Sync prep (unused): `templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash`.
- Free-text: `unitNumber`, `unitType`, `customAddress`, `description`, `instructions`, `propertyInstructions`, `notes`, `scheduledFor`.
- Indexes on every FK + `workOrderNumber`, `isComplete`, `scheduledFor`, `createdAt`, `updatedAt`.

**Missing for this sweep:**
- `status` enum field (e.g. `FlooringWorkOrderStatus`).
- File-generation output reference — column shape depends on bucket vs. direct-download.

### `FlooringWorkOrderItem` (lines 557–578)
- Standard line-item: `productId`, `quantity`, `unitPrice`, optional `assignedQuantity` + `assignedCost`, `notes`, `sourceTemplateItemId` (for sync linkage), `cutLogs` relation.
- `unitPrice` column **stays** but use cases + UI strip it.

### `FlooringTemplate` (lines 412–442)
- Identity: `id`, `templateNumber` (sequence-backed default).
- Relations: `property`, `managementCompany?`, `jobType?`, `warehouse?`, `items` → `FlooringTemplateItem`, `workOrders` (back-ref).
- Free-text: `unitType`, `description`, `instructions`, `propertyInstructions`, `templateNotes`.

**Missing for this sweep:**
- `status` enum field (`FlooringTemplateStatus`, same shape as WO).
- File-generation output reference (same decision as WO).

### `FlooringTemplateItem` (lines 444–459)
- `productId`, `quantity`, `unitPrice`, `notes`. Same `unitPrice` story as WO line items.

### `FlooringCutLog` (lines 364–398)
- Already migrated. Has `workOrderId?`, `workOrderItemId?`, full status enum (`PENDING/QUEUED/FINAL/VOID`). No changes needed for this sweep.

### Outbox (`QueueOutboxEvent`, lines 580–602)
- Already in place. Two new topics will route through it: WO file-generation and template file-generation.

## Domain (`packages/domain/src/...`)

### `flooring/work-orders/`
Files: `types.ts`, `normalizers.ts`, `form-rules.ts`, `delete-rules.ts`, `error-messages.ts`, `index.ts`.
- `WorkOrderListRow` and `WorkOrderDetail` — no `status` field yet; will need to add.
- `WorkOrderForm` includes nothing about status (status is worker-controlled, not user-controlled — likely no form change).
- No reference to `templateSynced*` fields.

### `management/templates/`
Files: `types.ts`, `normalizers.ts`, `form-rules.ts`, `delete-rules.ts`, `error-messages.ts`, `index.ts`, plus `material-items/` subfolder.
- `TemplateListRow`, `TemplateDetail`, `TemplateForm` — no `status` field yet.
- `material-items/rules.ts` and `material-items/normalizers.ts` reference `unitPrice` — must be stripped from rules/types but **not** from the read normalizer if the column is still selected (TBD: we may stop selecting it entirely from the data layer instead, which is cleaner).

## Data (`packages/db/src/...`)

### `flooring/work-orders/`
- `shared.ts` — `workOrderRowSelect` + `workOrderDetailSelect`. Neither selects `status` yet (does not exist) nor `templateSynced*` fields.
- `read-repository.ts` (128 lines) — list query w/ filters, ordering, pagination.
- `write-repository.ts` (54 lines) — basic create/update/delete; **no status transitions** (e.g. `markQueued`, `markWorking`).
- No outbox helpers for WO file-generation enqueue.

### `management/templates/`
- Same shape: `read-repository.ts` (157 lines), `write-repository.ts` (83 lines), plus `material-items/` subdir with read + write repos. Both repos still select `unitPrice` — fine to keep selecting; the strip happens above the data layer.
- No status select. No outbox helpers for template file-generation.

## Application (`packages/application/src/...`)

### `management/templates/` — exists
- Has its own subdir (`material-items/` included). Use cases for primary section, material items section, create, delete.

### `flooring/work-orders/` — **does not exist**
- Confirmed: `find packages/application/src -type d` returns no `work-orders` directory.
- Builds will fail to find a use case to wire when API routes are added. This is a **major gap** to fill in step 5.

## Module dirs (`apps/web/modules/...`)

### `apps/web/modules/work-orders/` — non-canonical
Current shape:
```
work-orders/
  components/work-orders-client.tsx
  controllers/use-work-orders-list-controller.ts
  list/work-orders-client.tsx
  record/
    create/work-order-create-client.tsx
    detail/work-order-detail-client.tsx
    panel/
      controllers/{use-work-order-material-section.ts, use-work-order-primary-section.ts}
      sections/{work-order-material-items-section.tsx, work-order-primary-fields-section.tsx, ...grid helpers}
      shared.ts, work-order-record-panel.tsx
```
Diverges from `apps/web/modules/CLAUDE.md` canonical shape:
- `list/` is a sibling of `components/` instead of `components/list/`.
- `record/` is a sibling of `components/` instead of `components/record/`.
- `record/panel/controllers/` should flatten into `controllers/use-work-orders-{section}-section.ts`.
- No `data/queries.ts` or `data/mutations.ts` (data folder absent entirely).
- Step 8 will reshape this module to match canonical layout.

`unitPrice` references in this module:
- `record/panel/shared.ts` — comparable + empty-row defaults.
- `record/panel/sections/work-order-material-items-section.tsx` — full UI binding (`unitPriceValue`, `unitPriceUnit`, `unitPriceError`, `onUnitPriceChange`).
- `record/panel/controllers/use-work-order-material-section.ts` — diff and field-change cases.

### `apps/web/modules/templates/` — close to canonical, missing `record/` subfolders
Current shape:
```
templates/
  components/
    list/{templates-table.tsx, templates-client.tsx}
    record/{template-detail-client.tsx, template-record-panel.tsx, template-create-client.tsx,
            template-primary-fields-section.tsx, template-material-items-section.tsx}
  controllers/{use-template-material-items-section.ts, use-template-primary-section.ts, use-templates-list-controller.ts}
  data/{queries.ts, mutations.ts}
```
Closer to canonical but `components/record/` is flat — canonical layout puts each section in its own folder under `components/record/{section}/`. That's a step-8 reshape, not blocking for schema/domain/data sweeps.

`unitPrice` references in this module:
- `components/record/template-material-items-section.tsx` — full UI binding (column def, row renderer).
- `controllers/use-template-material-items-section.ts` — local-state shape, server diff, draft-row default.

### `apps/web/modules/template-sync/` — shell only
Single file: `components/template-sync-button.tsx`. Constants `MANAGEMENT_COMPANY_OPTIONS`, `PROPERTY_OPTIONS`, `TEMPLATE_OPTIONS` are all empty arrays. No data fetching, no mutation, no panel preview of template fields, no submit handler. Open + Sync buttons are disabled until a template is selected, but their `onClick` is unbound. Used from `apps/web/modules/app-shell/components/header-controls.tsx`.

## API routes (`apps/web/app/api/...`)

### `templates/`
- `route.ts` — GET list + POST create.
- `_validators.ts` — input validators.
- `[id]/route.ts` — DELETE.
- `[id]/primary/section/route.ts` — PATCH primary.
- `[id]/material-items/section/route.ts` — PATCH material items diff.
Sectional shape matches `apps/web/modules/CLAUDE.md`.

### `work-orders/` — **does not exist**
No `apps/web/app/api/work-orders/` directory. All work-order persistence goes through… nothing yet, beyond what the controllers in the module dir currently do (which won't function without routes). Step 7 builds the full sectional API: `route.ts`, `[id]/route.ts`, `[id]/primary/section/route.ts`, `[id]/material-items/section/route.ts`, plus `[id]/file/route.ts` (or similar) to enqueue file generation, and `options/route.ts`.

## Dashboard pages (`apps/web/app/dashboard/...`)

### `templates/`
- `page.tsx` (list), `new/page.tsx` (create), `[id]/page.tsx` (record).

### `work-orders/` — **does not exist**
No dashboard pages. Step 8 (or a parallel step 7) creates them as SSR loaders that pull from `modules/work-orders/data/queries.ts`.

## Worker / Relay (`apps/worker/src/...`, `apps/relay/src/...`)

Existing dispatchers + processors:
- `materialize-import-batch`
- `pending-save-cut-log-batch`
- `finalize-cut-log-batch`
- `void-cut-log`

All follow the same shape: relay reads outbox by `topic`, claims rows, dispatches to BullMQ; worker has a processor per queue. **No file-generation processors yet.** Step 6 adds:
- `apps/relay/src/dispatch/build-{wo|template}-file-generation-dispatcher.ts`
- `apps/worker/src/processors/{wo|template}-file-generation.ts`
- Queue connection registrations.

## TS error baseline — not captured

Attempted via `npm run typecheck`:
1. `guard:prisma` halts the run before any `tsc` invocation, due to `packages/domain/src/flooring/imports/staged-inventory-rows/types.ts` directly importing `@prisma/client`. Out of scope for this branch — owned by the imports sweep.
2. Even bypassing the guard, this worktree has **no installed `node_modules`** at root or in any non-worker workspace, so `tsc` is not on the path. (`apps/worker/node_modules/` exists but is empty.) An `npm install` is required before `tsc` can run.

**Decision needed:** confirm whether to run `npm install` in this worktree to capture the baseline, or treat the audit as "≈50 errors expected, will be observed as each layer is touched." Either way the strict layer order keeps working — each layer can be type-checked in isolation by running tsc against that one workspace once installed.

## Open questions for the user

1. **File delivery** — bucket vs. direct download. Audit recommendation: bucket (already deployed on Railway, matches the queued-job pattern, lets the file outlive the user's session). If confirmed, add e.g. `generatedFileKey String?` (and maybe `generatedFileUrl`) to both `FlooringWorkOrder` and `FlooringTemplate` in the schema sweep.
2. **Status enum exact values** — must include `QUEUED` and `WORKING`. Likely also a default (`IDLE` or `READY`) and at least one terminal (`COMPLETED`; `FAILED` optional). Confirm before schema lands.
3. **Worker scope confirmation** — file generation only this sweep; cut-assignment worker deferred. Status field can already model both, but the dispatcher + processor for cut-assignment is out of scope. Confirm.
4. **`unitPrice` selection** — strip from use cases + UI is required. Optional follow-up: also stop selecting it from the data layer entirely (cleaner). Confirm preference.
5. **TS baseline** — `npm install` to capture, or roll forward and observe per layer?
