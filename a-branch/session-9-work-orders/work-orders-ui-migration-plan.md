# Plan — Work Orders UI Migration (7j + 7k + 7l, bundled)

## Context

The work-orders module sweep has landed schema → domain → data → application → workers → API (7a–7i committed). Final layer remaining: the UI module + dashboard pages. The current `apps/web/modules/work-orders/` tree is non-canonical (`record/panel/`, `record/detail/`, `record/create/` siblings of `components/`, no `data/` folder, 40+ imports from the deprecated `@/modules/shared/engines/`). It must be wiped and rebuilt on the engine-free pattern that the imports module already follows.

Three sub-sweeps fold into one execution per user direction:
- **7j — Engine off-ramp**: wipe existing tree, recreate canonical shape.
- **7k — Module dir UI**: list view, primary section, material-items with cut-log expandable rows, files section.
- **7l — Dashboard pages**: list / create / detail SSR loaders.

**Locked decisions from clarification (this turn):**
| # | Decision |
|---|---|
| 1 | Mirror imports — section save/discard/dirty uses `useSingleSectionRecordController` from `@/modules/shared/engines/record-view/`. List controller / transport / components / query-policies all import from the new `apps/web/{controllers,transport,components,query-policies}/` primitives. |
| 2 | Cut-log section header carries a single `ActionsPanel` with two actions: "Save Pending Cuts" (enabled when there are dirty pending edits) and "Finalize Selected Cuts" (enabled when batch-select mode active and ≥1 PENDING row checked). Smart enable/disable; both visible. |
| 3 | Location filter is **per-row** inside each expandable cut-log row. Each row has its own location dropdown that narrows that row's inventory dropdown. |
| 4 | List view columns (12): workOrderNumber, scheduledFor, warehouse, description, propertyName, templateNumber, managementCompanyName, jobTypeName, vacancy, unitNumber, unitType, **status** (file-gen lifecycle badge). No isComplete column on the list. |

---

## Patterns reused (verified in Phase 1 exploration)

| Primitive | Path | Used for |
|---|---|---|
| `withMutationMeta`, `RequestJsonError`, `requestJson` | [@/transport/mutation](apps/web/transport/mutation.ts), [@/transport/http](apps/web/transport/http.ts) | Mutation envelopes + typed HTTP errors |
| `useServerListController` | [@/controllers/list-view](apps/web/controllers/list-view) | List view search / sort / group / paginate |
| `LIST_FRESHNESS_STANDARD` | [@/query-policies](apps/web/query-policies) | React Query freshness preset for list |
| Cells (`TextCell`, `NumberCell`, `PerUnitCell`, `StatusCell`, `CheckboxCell`, `TextareaCell`, `SelectCell`, `DropdownCell`) | [@/components/cells](apps/web/components/cells) | All form / grid cells |
| `FormField`, `FieldSection`, `StaticFieldValue` | [@/components/fields](apps/web/components/fields) | Labelled field composition |
| `LayoutGrid`, `CellAt` | [@/components/layout-grid](apps/web/components/layout-grid) | Section grid positioning |
| `Grid`, `GridHeader`, `GridBodyRow`, `GridEmpty`, `ScopedRow` | [@/components/grid](apps/web/components/grid) | Material-items table + expandable cut-log rows |
| `StatusBadge`, `TonePill` | [@/components/badges](apps/web/components/badges) | Status + vacancy / completion badges |
| `SelectDropdown`, `SearchDropdown`, `ActionsPanel` | [@/components/dropdowns](apps/web/components/dropdowns) | Inventory dropdown, location filter, cut-log ActionsPanel |
| `SectionHeader`, `ActionHeader` | [@/components/headers](apps/web/components/headers) | Section titles + action surfaces |
| `useSingleSectionRecordController`, `createRecordSectionError`, `RecordDetailClientScaffoldContext` | [@/modules/shared/engines/record-view](apps/web/modules/shared/engines/record-view) | Section save/discard/dirty (per locked decision #1 — mirrors imports) |

**Reference module: `apps/web/modules/imports/`** — every WO file mirrors a counterpart there (controller shape, mutation request signatures, queries.ts shape, dashboard page wiring).

---

## File inventory

### Wipe (existing `apps/web/modules/work-orders/`)

Entire tree gets `git rm` then recreated:
- `components/work-orders-client.tsx` (re-export proxy — gone)
- `list/work-orders-client.tsx` (engine-coupled — gone)
- `controllers/use-work-orders-list-controller.ts` (engine-coupled — gone)
- `record/detail/`, `record/create/`, `record/panel/` (entire subtree — gone, 12+ files)

### Recreate — module dir (canonical shape)

```
apps/web/modules/work-orders/
├── components/
│   ├── list/
│   │   ├── work-orders-client.tsx
│   │   └── work-orders-table.tsx
│   └── record/
│       ├── work-order-detail-client.tsx
│       ├── work-order-create-client.tsx
│       ├── work-order-record-panel.tsx
│       ├── primary/
│       │   └── work-order-primary-fields-section.tsx
│       ├── material-items/
│       │   ├── work-order-material-items-section.tsx
│       │   └── work-order-cut-log-row.tsx
│       └── files/
│           └── work-order-files-section.tsx
├── controllers/
│   ├── drafts.ts
│   ├── use-work-orders-list-controller.ts
│   ├── use-work-orders-list-mutations.ts
│   ├── use-work-order-primary-section.ts
│   ├── use-work-order-material-items-section.ts
│   ├── use-work-order-item-pending-cut-logs.ts
│   ├── use-work-order-cut-log-finalize.ts
│   ├── use-work-order-cut-log-void.ts
│   └── use-work-order-files-section.ts
└── data/
    ├── queries.ts
    ├── mutations.ts
    └── list-work-orders-request.ts
```

### Dashboard pages

```
apps/web/app/dashboard/work-orders/
├── page.tsx       — list (SSR + HydrationBoundary prefetch)
├── new/page.tsx   — create (SSR loads form options)
└── [id]/page.tsx  — detail (SSR loads detail + options)
```

---

## Layer-by-layer detail

### `data/`

**`queries.ts`** — thin wrappers over `@builders/db`:
- `getWorkOrderListPageOptions()` — wraps `getResolvedUserTablePreference` for table prefs.
- `getWorkOrderCreatePageData()` — calls a subset of `getWorkOrderFormOptions()` (just creation-relevant: properties, warehouses, jobTypes, managementCompanies, templates).
- `getWorkOrderDetailPageData(id)` — `Promise.all([getWorkOrderDetailById(id), getWorkOrderFormOptions(), listWorkOrderFiles(id)])` returning a `PrismaDetailPageResult<...>` that handles 404 + load error states.
- `getWorkOrderFormOptions()` — single fetch backing `apps/web/app/api/work-orders/options/route.ts`. Calls `listPropertyOptions`, `listWarehouseOptions`, `listJobTypeOptions`, `listManagementCompanyOptions`, `listTemplateOptions`, `listProductOptions`, `listCategories` in parallel. Wrapped in `withLoaderTiming({ loader: "flooring.work-orders.options" })` per imports pattern.

**`mutations.ts`** — client HTTP helpers, all wrap `withMutationMeta`. One per API route (mirrors imports exactly):
- `createWorkOrderRequest(input)` → `POST /api/work-orders` → 201
- `updateWorkOrderRequest({ id, input, revisionKey })` → `PATCH /api/work-orders/[id]/primary/section`
- `deleteWorkOrderRequest({ id, updatedAt })` → `DELETE /api/work-orders/[id]`
- `saveWorkOrderMaterialItemsSectionRequest({ workOrderId, diff, revisionKey })` → `PATCH /api/work-orders/[id]/material-items/section` → returns `{ workOrder, tempIdMap }`
- `saveWorkOrderItemPendingCutLogDiffRequest({ workOrderId, workOrderItemId, requestKey, diff })` → `PATCH .../[itemId]/pending-cut-logs/section` → 202 producer
- `finalizeWorkOrderCutLogBatchRequest({ workOrderId, requestKey, cutLogIds })` → `POST /api/work-orders/[id]/cut-logs/finalize` → 202 producer
- `voidWorkOrderCutLogRequest({ workOrderId, cutLogId })` → `DELETE .../cut-logs/[cutLogId]` → sync 200
- `requestWorkOrderFileRequest({ workOrderId })` → `POST .../files` → 202 producer
- `deleteWorkOrderFileRequest({ workOrderId, fileId, updatedAt })` → `DELETE .../files/[fileId]` → sync
- `getWorkOrderFileDownloadUrlRequest({ workOrderId, fileId })` → `GET .../files/[fileId]/download` → returns `{ url }`
- `listEligibleInventoryRequest({ workOrderId, workOrderItemId })` → `GET .../eligible-inventory` → returns `{ inventories }`

**`list-work-orders-request.ts`** — mirrors imports' `list-imports-request.ts`: defines `WORK_ORDERS_LIST_QUERY_KEY`, `parseWorkOrdersListInputFromSearchParams`, `listWorkOrdersRequest` for client-side React Query refetches.

### `controllers/`

**`drafts.ts`** — local form types + validators + form converters. Mirrors imports' `controllers/drafts.ts` shape:
- `toWorkOrderPrimaryForm(detail) → WorkOrderPrimaryForm` form converter
- `validateWorkOrderPrimaryForm(form) → string` (returns first validation error, "" on success)
- Same for material-item draft validators (already in domain; this just re-exports for the controller)
- `WorkOrderListInput` type for the list filters / sort / group state

**`use-work-orders-list-controller.ts`** — wraps `useServerListController` from `@/controllers/list-view`. Hooks up `listWorkOrdersRequest`, `WORK_ORDERS_LIST_QUERY_KEY`, table-prefs persistence. Returns the controller output for the table component. **No engine imports.**

**`use-work-orders-list-mutations.ts`** — bundles list-mutation react-query hooks (`createWorkOrder`, `deleteWorkOrder`) for use across list view + record view. Mirrors imports' `use-imports-list-mutations.ts`.

**`use-work-order-primary-section.ts`** — wraps `useSingleSectionRecordController<WorkOrderDetail, WorkOrderPrimaryForm>` from `shared/engines/record-view`. `saveSection` calls `validateWorkOrderForm` (domain) → `updateWorkOrderRequest`. Returns the engine's `{ isDirty, isSaving, save, discard, localValue, ... }`.

**`use-work-order-material-items-section.ts`** — wraps `useMultiRowSectionDiffController` (or whichever multi-row diff hook the engine offers — I'll mirror what templates' `use-template-material-items-section.ts` uses). Builds the `added/modified/deleted` diff client-side, calls `saveWorkOrderMaterialItemsSectionRequest`, reconciles `tempIdMap` after success.

**`use-work-order-item-pending-cut-logs.ts`** — per-WOMI pending cut-log diff controller. Tracks dirty state for adds/edits/deletes of PENDING rows under one WOMI's expandable. On save: client-generates `requestKey` (UUID), calls `saveWorkOrderItemPendingCutLogDiffRequest` (202 producer). Polls WOMI status for `SAVING_CUTS → IDLE` transition; reconciles tempIds to real IDs on response. Surfaces a single `{ rows, isDirty, isSaving, addRow, updateRow, deleteRow, save, discard }` API per WOMI.

**`use-work-order-cut-log-finalize.ts`** — WO-scoped batch-select controller. Maintains `selectedCutLogIds: Set<string>` across all expandable rows under the WO. On `enterFinalizeMode()` toggles checkbox column visibility on PENDING rows. On `submit()`: client-generates `requestKey`, calls `finalizeWorkOrderCutLogBatchRequest`. Polls touched WOMI statuses for `FINALIZING → IDLE`. Returns `{ isFinalizeMode, selectedIds, toggleSelection, enterFinalizeMode, exitFinalizeMode, submit, isSubmitting }`.

**`use-work-order-cut-log-void.ts`** — sync single-row void. `void(cutLogId)` calls `voidWorkOrderCutLogRequest`, patches local row state to VOID. No polling. Returns `{ void, isVoiding }`.

**`use-work-order-files-section.ts`** — file section orchestration: `requestFile()` (POST 202 producer), `deleteFile(fileId)` (sync DELETE), `getDownloadUrl(fileId)` (GET — returns presigned URL the UI opens). Polls file status for `QUEUED → WORKING → COMPLETED/FAILED`. Returns `{ files, requestFile, deleteFile, openDownload, isRequesting }`.

### `components/`

**`components/list/work-orders-client.tsx`** — client wrapper. Calls `useWorkOrdersListController()`. Renders `<SectionHeader>` (title + create button) + `<WorkOrdersTable>` + `<PaginateControls>`. Search / sort / group via `@/components/features/{search,sort,group}`. Mirrors imports' `imports-client.tsx` shape.

**`components/list/work-orders-table.tsx`** — table layout + 12 column defs per locked decision #4. `Grid` + `GridHeader` from `@/components/grid`. Renders `StatusBadge` cell for the status column, `<TonePill>` for vacancy, plain text for the rest. Click row → navigate to `/dashboard/work-orders/[id]`.

**`components/record/work-order-detail-client.tsx`** — client component for the detail page. Receives `initialWorkOrder`, `initialFiles`, `productOptions`, `categoryOptions`, etc. as props (set by SSR loader). Wraps in `RecordDetailClientScaffold` (engine context). Renders `<WorkOrderRecordPanel>`.

**`components/record/work-order-create-client.tsx`** — client component for `new/page.tsx`. Renders `<WorkOrderPrimaryFieldsSection>` in create mode (no MI section, no files section); on submit calls `createWorkOrderRequest`, redirects to `/dashboard/work-orders/[newId]`.

**`components/record/work-order-record-panel.tsx`** — orchestrates the three sections (primary, material-items, files). Composes `useWorkOrderPrimarySection` + `useWorkOrderMaterialItemsSection` + `useWorkOrderFilesSection`. Renders three `<FieldSection>` blocks stacked. Each section gets a Save / Discard pair from its controller; section-level loading + error states surface inline.

**`components/record/primary/work-order-primary-fields-section.tsx`** — pure presentational. Receives `draft`, `record`, options arrays, `disabled`, `onFieldChange` callback. Visible cells per locked decision #4 of the master plan + this clarification:

| Row | Cells |
|---|---|
| 1 | `workOrderNumber` (RO), `propertyId` → property lookup (`SelectCell` with options) |
| 2 | `templateId` (`SelectCell`), `managementCompanyId` (`SelectCell`) |
| 3 | `jobTypeId` (`SelectCell`), `warehouseId` (`SelectCell`, required) |
| 4 | `isComplete` (`CheckboxCell`), `status` (`StatusCell` RO worker-controlled) |
| 5 | `vacancy` (`SelectCell` VACANT/OCCUPIED/blank), `scheduledFor` (`TextCell` — date) |
| 6 | `unitNumber` (`TextCell`), `unitType` (`TextCell`) |
| 7 | `customAddress` (`TextareaCell`) — full width |
| 8 | Property address read-only block: `propertyStreetAddress`, `propertyCity`, `propertyState`, `propertyPostalCode` (`StaticFieldValue`s, derived from joined `property.*`) — full width |
| 9 | `description` (`TextareaCell`) — full width |
| 10 | `instructions` (`TextareaCell`) — full width |
| 11 | `notes` (`TextareaCell`) — full width |

(`propertyInstructions` rendered as a read-only `StaticFieldValue` from the joined `property.instructions` — reads from `record.propertyInstructions` which was derived live in 7d's normalizer.)

**`components/record/material-items/work-order-material-items-section.tsx`** — Grid table. Columns:

| Position | Column | Cell | Notes |
|---|---|---|---|
| Leading | `expand` | expand toggle | Reveals cut-log expandable row |
| Leading | `select` (when finalize-mode active) | checkbox | Drives `useWorkOrderCutLogFinalize` selection |
| 1 | Category filter | inline `SelectDropdown` in column header | Filters product dropdown options client-side |
| 2 | Product | `SelectDropdown` (filtered by category) | editable via section dirty-tracking |
| 3 | Quantity | `PerUnitCell` with `unit={item.sendUnitAbbrev}` | Always shows send-unit suffix |
| 4 | Notes | `TextareaCell` | editable |
| 5 | Status | `StatusBadge` | RO worker-controlled (IDLE / SAVING_CUTS / FINALIZING / FAILED) |

Section header has the **single ActionsPanel** per locked decision #2:
- "Save Pending Cuts" — calls `useWorkOrderItemPendingCutLogs.save()` for the dirty WOMI(s) (or aggregated saver). Disabled when no pending edits dirty.
- "Finalize Selected Cuts" — calls `useWorkOrderCutLogFinalize.submit()`. Disabled when no rows selected. The "Enter selection mode" toggle is also in the panel.

**`components/record/material-items/work-order-cut-log-row.tsx`** — `<ScopedRow>` content for an expanded WOMI. Renders the cut log Grid + per-row controls. Cut log columns:

| # | Column | Editable? | Notes |
|---|---|---|---|
| 1 | Inventory dropdown | ✅ for PENDING rows | `SelectDropdown` populated from `listEligibleInventoryRequest({ workOrderId, workOrderItemId })`. Filtered by location filter (column 2). |
| 2 | Location filter | ✅ per-row (pre-filter only, doesn't write) | Per locked decision #3 — each row has its own location filter narrowing its inventory dropdown options. |
| 3 | Before | RO | from row |
| 4 | Cut | ✅ for PENDING | `NumberCell` |
| 5 | After | RO (recomputed under TX) | from row |
| 6 | Coverage Cut | RO | empty when no coverage unit |
| 7 | Status | RO | `StatusBadge` |
| 8 | Final Cut Sequence | RO | numeric, only set on FINAL rows |
| 9 | Waste | ✅ for PENDING | `CheckboxCell` |
| 10 | Notes | ✅ for PENDING | `TextareaCell` |
| 11 | Created At | RO | |
| 12 | Updated At | RO | |
| Trailing | Void button | per row, FINAL only | `useWorkOrderCutLogVoid` |
| Trailing | Selection checkbox | when finalize-mode active | only on PENDING rows |

**`components/record/files/work-order-files-section.tsx`** — Grid table for files. Columns: `fileNumber`, `status` (StatusBadge), `createdAt`, `completedAt`, `errorMessage` (truncated). Section header has a "Generate File" button (single primary, NOT an ActionsPanel — keeps it simple). Per row: download button (calls `getDownloadUrl` → opens presigned URL in new tab via the browser's native print view) + delete button (with confirm modal).

### Dashboard pages

**`apps/web/app/dashboard/work-orders/page.tsx`** — mirrors imports' page.tsx exactly:
- `requireToolAccess("warehouse")` (or whatever the WO tool slug resolves to — verify against `WORK_ORDERS_TOOL_SLUG`)
- `getResolvedUserTablePreference(user.id, "work-orders-main")`
- `parseWorkOrdersListInputFromSearchParams(...)`
- `QueryClient` prefetch with `WORK_ORDERS_LIST_QUERY_KEY` → `listWorkOrdersUseCase` (or just `listWorkOrders` from db — check imports' choice; imports uses the application layer so I'll match)
- Renders `<HydrationBoundary><WorkOrdersClient ... /></HydrationBoundary>`

**`apps/web/app/dashboard/work-orders/new/page.tsx`** — create page. `requireToolAccess` + `getWorkOrderCreatePageData()` (form options). Renders `<WorkOrderCreateClient options={...} />`.

**`apps/web/app/dashboard/work-orders/[id]/page.tsx`** — detail page. `requireToolAccess` + `getWorkOrderDetailPageData(id)`. 404 / error handling per `PrismaDetailPageResult` shape (mirror imports). Renders `<WorkOrderDetailClient initialWorkOrder={...} initialFiles={...} productOptions={...} ... />`.

---

## Verification

| Gate | Command | Expected |
|---|---|---|
| Engine grep | `grep -rn "@/modules/shared/engines" apps/web/modules/work-orders/` | Only `record-view` matches (the section-controller hook). Zero matches for `record-view/panel`, `list-view`, `common/feedback`, etc. |
| Module dir grep | `grep -rn "from \"@builders/db\"" apps/web/modules/work-orders/` | Only inside `data/queries.ts` (no Prisma imports outside data/) |
| Web typecheck | `npm run typecheck --workspace @builders/web` | The 48 pre-existing WO module errors disappear; remainder are the 9 unrelated leftovers (5 shared engines, 3 admin api, 1 admin module) |
| Smoke (manual) | `npm run dev` + open `/dashboard/work-orders` | List renders, click row → detail renders, primary section save round-trips, MI section diff-save round-trips, cut-log expand reveals row, save pending → 202 + WOMI flips SAVING_CUTS → IDLE, finalize selection → 202 + FINALIZING → IDLE, void single → 200 sync, generate file → 202 + status QUEUED → WORKING → COMPLETED, download opens PDF, delete file → row gone |

---

## Sequencing within the bundled execution

To minimize partial-broken-state windows during the rewrite:

1. **Wipe** `apps/web/modules/work-orders/` (clean slate; web typecheck stays broken from the 48 errors which now point at non-existent files — that's fine, we're rebuilding immediately).
2. **Create `data/`** (`queries.ts`, `mutations.ts`, `list-work-orders-request.ts`).
3. **Create `controllers/`** in dependency order: `drafts.ts` → list controller + mutations → primary section → MI section + cut-log controllers → files section.
4. **Create `components/list/`** (`work-orders-table.tsx`, `work-orders-client.tsx`).
5. **Create `components/record/`** in dependency order: `primary/...primary-fields-section.tsx` → `material-items/work-order-cut-log-row.tsx` → `material-items/work-order-material-items-section.tsx` → `files/work-order-files-section.tsx` → `work-order-record-panel.tsx` → `work-order-detail-client.tsx` + `work-order-create-client.tsx`.
6. **Create `dashboard/work-orders/`** pages (`page.tsx`, `new/page.tsx`, `[id]/page.tsx`).
7. **Run gates**: engine grep + db import grep + web typecheck.
8. **Manual smoke** in dev server.
9. **Single commit** for the bundled 7j+7k+7l per the user's "fold into one execution" direction. Layered commit message identifies the 3 sub-sweeps.

---

## Out of scope (explicit)

| Item | Where it lands |
|---|---|
| List view server-side toolbars (advanced search, server-side filters beyond what the existing `useServerListController` already provides) | Not in this sweep — search + sort + group render inline with the list using the existing controller's surface |
| Migrating `useSingleSectionRecordController` itself out of `shared/engines` into `apps/web/controllers/` | Separate sweep — doing it here would force imports + inventory to migrate too |
| Inventory record view migration | Out — only data layer is migrated; component layer still uses engines, untouched |
| Rich inventory dropdown UX | Out — `SelectDropdown` for now; user noted "we will later add the rich drop down" |
| Auto-assign cut logs to WOMIs | Out — already deferred per master plan |
| Cut log de-link from WO (manual unlink) | Out — already deferred per master plan |
| Inventory record-view cut-log section take-down | Out — separate sweep AFTER this one |

---

## Critical files to modify (summary)

**Wiped + recreated:**
- `apps/web/modules/work-orders/` (entire tree, ~17 files removed, 18 created)

**Created:**
- `apps/web/app/dashboard/work-orders/page.tsx`
- `apps/web/app/dashboard/work-orders/new/page.tsx`
- `apps/web/app/dashboard/work-orders/[id]/page.tsx`

**No changes:**
- API routes (7i already done)
- Application layer / domain / data / workers / relay / schema (all done)
- Other modules (imports, inventory, templates) — no edits

---

## Open questions — RESOLVED

All four resolved during plan finalization:

| # | Question | Answer |
|---|---|---|
| 1 | Section controller hook | **Mirror imports** — use `useSingleSectionRecordController` from `shared/engines/record-view`, no engine imports elsewhere. |
| 2 | ActionsPanel layout | **Single panel** with both "Save Pending Cuts" + "Finalize Selected Cuts" actions on the MI section header. |
| 3 | Location filter scope | **Per-row** — each expandable cut-log row has its own location filter narrowing its inventory dropdown. |
| 4 | List view columns | **12 columns**: spec-as-given + `status` badge, no `isComplete`. |
