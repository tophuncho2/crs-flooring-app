# Template Sync Use Case — Implementation Plan

## Context

The template sync side pane shipped as a UI shell ([template-sync-button.tsx](apps/web/modules/template-sync/components/template-sync-button.tsx)): three `SelectDropdown`s (Management Company → Property → Template) with empty hard-coded option arrays and a disabled stub **Sync** button. The user now wants the pane to actually work end-to-end:

1. Migrate the three dropdowns to the existing `AsyncRichDropdown` (server-side search + debounce). Property options must filter by management company; template options must filter by property and only enable once a property is picked.
2. Wire the **Sync** button: clicking it creates a brand-new `FlooringWorkOrder` whose primary fields and material items are copied from the chosen template. Stamp `templateSyncedAt`, `templateSyncMode='copy'`, and `templateSnapshotHash` on the new WO. Each new `FlooringWorkOrderItem` carries `sourceTemplateItemId` pointing at its origin row.
3. On success, close the panel and route to `/dashboard/work-orders/{newId}`.

**Shared packaging note:** the work orders record view will later use the same Property picker (only Property required there). Build the picker as a reusable per-module component (mirrors `ManagementCompanyPicker`) so WO record view can adopt it without rework. Manufacturer/property cross-filtering for the WO list is **out of scope this sweep**.

No schema changes — `templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash` on `FlooringWorkOrder` and `sourceTemplateItemId` on `FlooringWorkOrderItem` already exist (per the WO/templates rebuild memo).

---

## Layer-boundary contract (confirmed against current CLAUDE.md files)

This sweep adds code at every layer. Each layer's **inbound and outbound** edges are spelled out below so nothing leaks across.

| Layer | Lives in | May import from | Must NOT import from | New code this sweep |
| --- | --- | --- | --- | --- |
| Domain | `packages/domain/src/` | `node:*` builtins, zod | DB, application, lib, web, React | Zod input schemas, `PropertyOption` / `TemplateOption` types, `buildTemplateSnapshotHash`, error messages |
| Data | `packages/db/src/` | `@prisma/client`, `@builders/domain` | Application, web, React | `searchPropertyOptions`, `searchTemplateOptions`, `createWorkOrderWithItemsRecord` |
| Application | `packages/application/src/` | `@builders/domain`, `@builders/db`, `@builders/lib`, `@builders/pdf` | Anything else (rule 1) | `searchPropertyOptionsUseCase`, `searchTemplateOptionsUseCase`, `syncTemplateToWorkOrderUseCase` |
| API | `apps/web/app/api/.../route.ts` | `@builders/application`, `@builders/db` (queries only), route helpers | Module code, direct domain rules | `GET /properties/options`, `GET /templates/options`, `POST /work-orders/from-template` |
| Web primitives | `apps/web/components/` | Other primitives in same bucket per import-down rule | Modules, `@builders/db`, `@builders/application` | **Nothing.** `AsyncRichDropdown` is reused as-is. |
| Web controllers | `apps/web/controllers/` | Web primitives | Modules, server, db, application | **Nothing.** `useAsyncRichDropdownController` reused as-is. |
| Web hooks | `apps/web/hooks/` | — | Modules, server | **Nothing.** Sync flow is a single fire-and-route — not a lifecycle hook. |
| Web transport | `apps/web/transport/` | — | Modules | **Nothing.** Existing `requestJson` from `@/transport/http` is sufficient. |
| Module — properties | `apps/web/modules/properties/{components,controllers,data}/` | Web primitives, web controllers, web transport, `@builders/domain` types | Other modules, `modules/shared`, `@builders/db`, `@builders/application` | `PropertyPicker`, `searchPropertyOptionsRequest` |
| Module — templates | `apps/web/modules/templates/{components,controllers,data}/` | same as above | same as above | `TemplatePicker`, `searchTemplateOptionsRequest` |
| Module — template-sync | `apps/web/modules/template-sync/{components,data}/` | Other module pickers via their public exports, web primitives, web transport | `modules/shared`, `@builders/db`, `@builders/application` | `syncTemplateRequest`, rewrite of `template-sync-button.tsx` |

**Notes:**
- **No new code in `apps/web/components/`, `apps/web/controllers/`, or `apps/web/hooks/`.** Existing primitives cover this feature; we only compose at the module level.
- **No imports from `modules/shared`.** The existing `FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME` import in [template-sync-button.tsx:7](apps/web/modules/template-sync/components/template-sync-button.tsx) is **preexisting** and stays untouched this sweep — engines tree is mid-migration. We do not add new `modules/shared` imports.
- Modules importing pickers from sibling modules (e.g. template-sync importing `ManagementCompanyPicker` from `modules/management-companies/components/picker/`) is the **established pattern** — `ManagementCompanyPicker` is already structured for cross-module reuse and the modules/CLAUDE.md does not forbid sibling-module imports.
- The application package may NOT import `node:crypto` directly per rule 1. Hashing must live in domain (see below).

---

## Reference patterns to copy (do not reinvent)

| Concern | Reference file |
| --- | --- |
| Async picker component | [management-company-picker.tsx](apps/web/modules/management-companies/components/picker/management-company-picker.tsx) |
| HTTP request fn for search | [management-company-options-request.ts](apps/web/modules/management-companies/data/management-company-options-request.ts) |
| Options API route shape | [api/management-companies/options/route.ts](apps/web/app/api/management-companies/options/route.ts) |
| Async dropdown controller | [use-async-rich-dropdown-controller.ts](apps/web/controllers/dropdown-search/use-async-rich-dropdown-controller.ts) |
| Mutation route gauntlet | [api/work-orders/route.ts](apps/web/app/api/work-orders/route.ts) (POST) |
| WO create use case shape | [create-work-order.ts](packages/application/src/flooring/work-orders/create-work-order.ts) |
| WO material item write | [packages/db/src/flooring/work-orders/material-items/](packages/db/src/flooring/work-orders/material-items) (`createWorkOrderMaterialItemRecord`, `applyWorkOrderMaterialItemsDiff`) |
| Template detail with items | `getTemplateById` in [packages/db/src/management/templates/](packages/db/src/management/templates) |

---

## Layer plan (in execution order)

### 1. Schema — no changes

`FlooringWorkOrder` already has `templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash`. `FlooringWorkOrderItem` already has `sourceTemplateItemId`. No migrations.

### 2. Domain (`packages/domain/src/`)

**a. Property options search input/output**
- Add `PropertyOption` type + `searchPropertyOptionsInputSchema` (zod): `{ search?: string, managementCompanyId?: string, take?: number }` (mirror `searchManagementCompanyOptionsInputSchema`).

**b. Template options search input/output**
- Add `TemplateOption` type (`{ id, label, propertyId, managementCompanyId, ...minimal display fields }`) + `searchTemplateOptionsInputSchema`: `{ search?: string, propertyId: string (required), take?: number }`.
- `propertyId` is **required** here — the spec says template dropdown is only enabled with a property selected.

**c. Sync use case payload**
- Add `syncTemplateToWorkOrderInputSchema`: `{ templateId: string }`. Property/management-company are derived from the template, not passed in (template already has `propertyId` + `managementCompanyId` FKs).

**d. Snapshot hash builder**
- Add `buildTemplateSnapshotHash(templateDetail) → string` under `packages/domain/src/management/templates/snapshot-hash.ts`.
- **Confirmed:** `@builders/lib` exposes `redis`, `request-json`, `storage`, `structured-logging` only — **no hashing util exists** in the monorepo. Inline `import { createHash } from 'node:crypto'`. Domain layer has no node-builtin restriction.
- Algorithm: `sha256` of canonicalized JSON: `{ template: <pick stable fields>, items: <sort by id, pick stable fields> }`. Hex digest. Pure function, deterministic.

**e. Error messages**
- Add `TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE`, `TEMPLATE_SYNC_PROPERTY_REQUIRED_MESSAGE` (defensive — template's propertyId should always be set, but the WO create path requires it).

### 3. Data (`packages/db/src/`)

**a. `searchPropertyOptions`** — new read function under `packages/db/src/management/properties/read-repository.ts`. Args: `{ search?, managementCompanyId?, take = 20 }`. Case-insensitive substring on `name` (mirror manufacturer pattern). Returns `PropertyOption[]`. Re-export from `@builders/db`.

**b. `searchTemplateOptions`** — new read function under `packages/db/src/management/templates/read-repository.ts`. Args: `{ search, propertyId, take = 20 }`. Where: `propertyId = ?` AND multi-field OR search across `templateNumber`, `unitType`, `description`. Returns `TemplateOption[]`. Re-export.

**c. WO + items write helper** — confirm or add `createWorkOrderWithItemsRecord(input, tx)` under `packages/db/src/flooring/work-orders/write-repository.ts`. Single TX path: insert WO row, then insert all items in one batch (`prisma.flooringWorkOrderItem.createMany`). The existing `createWorkOrderRecord` does WO only; this is a small composite that the application layer needs. Returns `{ workOrder, items }`.

> Decision: build the WO+items composite in the **data** layer rather than the application layer because items need to be inserted in the same TX as the WO and `applyWorkOrderMaterialItemsDiff` already lives in data.

### 4. Application (`packages/application/src/`)

**a. `searchPropertyOptionsUseCase`** — new use case under `packages/application/src/management/properties/`. Trim search, clamp take to 20–50, delegate to `searchPropertyOptions`. Re-export from `@builders/application`.

**b. `searchTemplateOptionsUseCase`** — new use case under `packages/application/src/management/templates/`. Same shape; reject if `propertyId` missing. Re-export.

**c. `syncTemplateToWorkOrderUseCase`** — new use case under `packages/application/src/flooring/work-orders/sync-template-to-work-order.ts`. Single `withDatabaseTransaction`:
  1. `getTemplateById(input.templateId, tx)` — throw `WorkOrderExecutionError` 404 if missing.
  2. Defensive: if template's `propertyId` or `warehouseId` null, throw 400 (carries existing error messages).
  3. Build WO input from template fields: `propertyId`, `managementCompanyId`, `jobTypeId`, `warehouseId`, `unitType`, `description`, `instructions`, `notes` ← copy from template.
  4. Compute `snapshotHash = buildTemplateSnapshotHash(templateDetail)`.
  5. Call `createWorkOrderWithItemsRecord({ workOrder: { ...woInput, templateId, templateSyncedAt: new Date(), templateSyncMode: 'copy', templateSnapshotHash: snapshotHash }, items: templateDetail.items.map(toWorkOrderItemInput) }, tx)`.
  6. Each item carries `sourceTemplateItemId = templateItem.id`, copies `productId`, `quantity`, `sendUnitName`, `sendUnitAbbrev`, `notes`.
  7. Return the new WO + items.
- Accept optional `client` param per `packages/application/CLAUDE.md` rule 3.
- No outbox event this sweep (sync is sync, no worker, confirmed by the rebuild memo).
- Re-export from `@builders/application`.

**d. Tests** — vitest under `packages/application/src/flooring/work-orders/__tests__/sync-template-to-work-order.test.ts`. Cases: (i) happy path copies all fields + items, (ii) missing template → 404, (iii) template missing propertyId → 400, (iv) snapshot hash deterministic across runs.

### 5. Outbox / worker — N/A this sweep.

### 6. API (`apps/web/app/api/`)

**a. `GET /api/properties/options/route.ts`** — new. Mirrors management-companies options route. Calls `searchPropertyOptionsUseCase`. Validator under `apps/web/app/api/properties/_validators.ts`.

**b. `GET /api/templates/options/route.ts`** — new. Same pattern. Validator under `apps/web/app/api/templates/_validators.ts`. Validator must reject missing `propertyId` with 400.

**c. `POST /api/work-orders/from-template/route.ts`** — new. Full mutation gauntlet exactly matching `POST /api/work-orders`:
  - `applyRoutePolicy` with `WORK_ORDERS_TOOL_SLUG`, rate limit `work-orders.from-template` 20/10min.
  - `parseMutationEnvelope` → `validateSyncTemplateInput` (new in `apps/web/app/api/work-orders/_validators.ts`, runs `syncTemplateToWorkOrderInputSchema`).
  - `enforceMutationReceipt` (idempotency).
  - `withMutationTelemetry({ action: 'work-orders.from-template', route: '/api/work-orders/from-template', entityType: 'flooringWorkOrder' })` → `syncTemplateToWorkOrderUseCase(input)`.
  - `finalizeMutationReceipt` → `routeJson({ workOrder, items }, { status: 201 })`.

### 7. Module directory

**a. `apps/web/modules/properties/components/picker/property-picker.tsx`** — new. Carbon copy of `ManagementCompanyPicker`. Adds optional `managementCompanyId` prop that gets forwarded into the search request and into the controller's bucket key (`['properties', 'options', managementCompanyId]`) so cache buckets per filter. Resets selection in template-sync pane when filter changes.

**b. `apps/web/modules/properties/data/property-options-request.ts`** — new. `searchPropertyOptionsRequest(search, signal, { managementCompanyId, take })`. Calls `GET /api/properties/options?search=&managementCompanyId=&take=`.

**c. `apps/web/modules/templates/components/picker/template-picker.tsx`** — new. Same shape. Required `propertyId` prop. Disabled when `propertyId` null.

**d. `apps/web/modules/templates/data/template-options-request.ts`** — new. Calls `GET /api/templates/options?search=&propertyId=&take=`.

**e. `apps/web/modules/template-sync/data/sync-template-request.ts`** — new. POST helper wrapping `withMutationMeta` → `/api/work-orders/from-template` with `{ templateId }`. Returns `{ workOrder, items }`.

**f. `apps/web/modules/template-sync/components/template-sync-button.tsx`** — rewrite the body:
  - Drop `MANAGEMENT_COMPANY_OPTIONS / PROPERTY_OPTIONS / TEMPLATE_OPTIONS` constants.
  - Drop `SelectDropdown` imports; import `ManagementCompanyPicker`, `PropertyPicker`, `TemplatePicker`.
  - Keep the three useState selections; pass `managementCompanyId` into `PropertyPicker`, `propertyId` into `TemplatePicker`.
  - Cascade resets stay (changing parent clears children).
  - Add a `useRouter` from `next/navigation`. Replace stub Sync button `onClick` with an async handler that calls `syncTemplateRequest({ templateId })`, on success closes the panel, resets selections, and `router.push('/dashboard/work-orders/' + newWorkOrder.id)`. Show inline error message on failure (use the existing pane's spacing — small red text under the buttons).
  - **`Open` button stays as a stub.** Future work will wire it to open the selected template's record view; out of scope this sweep. Keep `disabled={!canActOnTemplate}` and existing styling untouched.
  - Add an in-flight `isSyncing` state to disable the Sync button while the POST is open.

### 8. Pages — no changes

The pane already mounts via `apps/web/modules/app-shell/components/header-controls.tsx`. No new routes.

---

## Open questions

None remaining. (Resolved: Management Company terminology, post-sync UX, sync-metadata fields, hashing util location, Open-button preservation.)

---

## Verification

1. **Unit tests** — `pnpm -w test --filter @builders/application sync-template` (the four cases above).
2. **DB-level smoke** — manually run `syncTemplateToWorkOrderUseCase` against a known template via `tsx` script or vitest integration; assert the new WO row has `templateSyncedAt` set and items count matches.
3. **API smoke** — `curl -X POST localhost:3000/api/work-orders/from-template -H "content-type: application/json" -d '{"input":{"templateId":"..."}, "mutation":{...}}'` after seeding a template. Expect 201 + `{ workOrder, items }`.
4. **UI end-to-end** — `pnpm dev`, log in, click the top-right cyan refresh icon, type to search each dropdown, verify Property results update when management company changes, verify Template stays disabled until property is set, click Sync, confirm panel closes and the page navigates to the new WO record view with the copied primary fields and material items rendered.
5. **Type check + build** — `pnpm typecheck && pnpm build` to catch import-order regressions in `@builders/domain` / `@builders/application` re-exports.

---

## Files touched (summary)

**New:**
- `packages/domain/src/management/properties/options.ts` (type + zod)
- `packages/domain/src/management/templates/options.ts` (type + zod)
- `packages/domain/src/management/templates/snapshot-hash.ts`
- `packages/domain/src/flooring/work-orders/sync-template.ts` (zod + error messages)
- `packages/db/src/management/properties/read-repository.ts` (add `searchPropertyOptions`)
- `packages/db/src/management/templates/read-repository.ts` (add `searchTemplateOptions`)
- `packages/db/src/flooring/work-orders/write-repository.ts` (add `createWorkOrderWithItemsRecord`)
- `packages/application/src/management/properties/search-property-options.ts`
- `packages/application/src/management/templates/search-template-options.ts`
- `packages/application/src/flooring/work-orders/sync-template-to-work-order.ts` (+ test)
- `apps/web/app/api/properties/_validators.ts`, `apps/web/app/api/properties/options/route.ts`
- `apps/web/app/api/templates/_validators.ts` (extend), `apps/web/app/api/templates/options/route.ts`
- `apps/web/app/api/work-orders/from-template/route.ts`
- `apps/web/modules/properties/components/picker/property-picker.tsx`
- `apps/web/modules/properties/data/property-options-request.ts`
- `apps/web/modules/templates/components/picker/template-picker.tsx`
- `apps/web/modules/templates/data/template-options-request.ts`
- `apps/web/modules/template-sync/data/sync-template-request.ts`

**Modified:**
- `apps/web/modules/template-sync/components/template-sync-button.tsx` (replace dropdowns + wire Sync handler)
- `apps/web/app/api/work-orders/_validators.ts` (add `validateSyncTemplateInput`)
- Re-export barrels: `@builders/domain`, `@builders/db`, `@builders/application`

---

## Note on plan location

Per the two-worktree workflow, this plan will be copied to `sessions/a-branch/2026-05-03-template-sync-plan.md` on approval before execution. Whether execution actually happens on a-branch vs staging is the user's call.
