# Sweep 4e — Imports + Inventory modules + dashboard rewire — Report

## Headlines

- **Imports + inventory module trees rewired to the post-alteration domain shape.** Zero typecheck errors in any file under `apps/web/modules/{imports,inventory}/**`, `apps/web/app/dashboard/{imports,inventory}/**`, `apps/web/app/api/imports/[id]/staged-inventory-rows/**`, `packages/domain/src/flooring/imports/**`, or `packages/db/src/flooring/imports/**`.
- **`listImportOptions` restored to `@builders/db`** with manufacturers added to the option set; `ImportFormOptions` defined in domain alongside the `InventoryFormOptions` precedent.
- **Two file renames + one symbol rename:**
  - `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` → `.../use-import-staged-inventory-rows-section.ts`
  - `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx` → `.../import-staged-inventory-rows-section.tsx`
  - `useImportInventoryRowsSection` → `useImportStagedInventoryRowsSection`
  - `updateImportInventoryRowsRequest` → `updateImportStagedInventoryRowsRequest`
- **One new client helper:** `markStagedRowsForImportRequest` in `apps/web/modules/imports/data/mutations.ts`. Worker-trigger endpoint is now reachable from the client; the paired controller + UI button is the next sweep.
- **One small route tweak:** `/api/imports/[id]/staged-inventory-rows/section` response gains `stagedRows: StagedInventoryRow[]` so the controller reconciles cleanly without a refetch.
- **Live-inventory data is fetched server-side** in `getImportDetailPageData` (`listInventory({ importEntryId })`) and threaded through `initialLiveRows` on `ImportDetailClient`. Section UI deferred to next sweep per the resolved decision.
- **Dead code removed:** `formatters.ts` (transport/status helpers), `buildImportMutationPayload` (legacy combined-payload helper), `createInventoryRequest` + `updateInventoryCutLogsRequest` shells in inventory mutations.

## Error counts

| Surface | tsc errors |
|---|---|
| `packages/domain` typecheck | 0 |
| `packages/db` typecheck | 0 |
| `packages/application` typecheck | 0 |
| `apps/web` typecheck — sweep 4e scope (`modules/{imports,inventory}/**`, `app/dashboard/{imports,inventory}/**`, `app/api/imports/[id]/staged-inventory-rows/**`) | **0** |
| `apps/web` typecheck — repo total | 57 (all pre-existing: admin/users role mismatch, missing module paths in `modules/work-orders/**` and `modules/shared/engines/record-view/panel/**`, BaseRecord/updatedAt in `modules/admin/**`) |

## Decisions resolved (during planning)

1. **Live-inventory data on the import detail:** fetched server-side; UI deferred. Page-data shape carries `liveRows`; `ImportDetailClient` accepts `initialLiveRows`. Next sweep adds the read-only section component.
2. **Per-row status cell on the staged-rows section:** read-only badge driven by `StagedInventoryRow.status` (DRAFT / QUEUED / IMPORTED). The editable PENDING/FINAL select is gone. Tone mapping: DRAFT → neutral, QUEUED → processing, IMPORTED → success.
3. **Inventory primary balance cells:** Starting + Cut + Available (`stockBalance`) + Coverage (`coverageBalance`, hidden when empty). Awaiting / Uncut / Available-Balance cells dropped; the new fields land where users were already looking.

## Files touched (29)

**Domain (1):**
- `packages/domain/src/flooring/imports/types.ts` — added `Import{Product,Warehouse,Location,Category,Manufacturer}Option` + `ImportFormOptions` mirroring the `InventoryFormOptions` precedent.

**DB (1):**
- `packages/db/src/flooring/imports/read-repository.ts` — added `listImportOptions(client = db)` returning `ImportFormOptions`. Imports the pure domain helpers (`buildFlooringProductDisplayName`, `formatFullLocationCode`, `formatLocationRafterLevel`) per the data-package carve-out.

**API routes (1):**
- `apps/web/app/api/imports/[id]/staged-inventory-rows/section/route.ts` — extends response to `{ import: detail, stagedRows, tempIdMap }`.

**Imports module — data (2):**
- `apps/web/modules/imports/data/queries.ts` — major rewrite (new field map for grouping, new page-data shape, new `manufacturerOptions`, parallel fetches for staged + live rows on detail).
- `apps/web/modules/imports/data/mutations.ts` — rename + retype `updateImportStagedInventoryRowsRequest`; new `markStagedRowsForImportRequest`.

**Imports module — controllers (4):**
- `apps/web/modules/imports/controllers/drafts.ts` — `ImportInventoryRowDraft` → `ImportStagedRowDraft` (no `isImported`, `stockCount` → `startingStock`); helpers retyped to `StagedInventoryRow`; dead `buildImportMutationPayload` removed.
- `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts` (renamed) — wholesale rewrite. `serverValue` is now `StagedInventoryRow[]` (not the parent record); diff builds `StagedInventoryRowsDiff`; mutation call returns fresh rows; `setRowImportStatus` removed.
- `apps/web/modules/imports/controllers/use-import-primary-section.ts` — no body change; new `ImportDetail` type flows through automatically.
- `apps/web/modules/imports/controllers/use-imports-list-controller.ts` — no change.

**Imports module — components (7):**
- `apps/web/modules/imports/components/formatters.ts` — **deleted**.
- `apps/web/modules/imports/components/list/imports-client.tsx` — new field set (importNumber, tag, warehouse, manufacturer, percent, stagedRows, liveRows, created).
- `apps/web/modules/imports/components/list/imports-table.tsx` — new cell map; dropped `StatusPill` and formatter dependencies.
- `apps/web/modules/imports/components/record/import-create-client.tsx` — dropped `EMPTY_IMPORT_ROW`; takes `manufacturerOptions`.
- `apps/web/modules/imports/components/record/import-detail-client.tsx` — takes `initialStagedRows`, `initialLiveRows`, `manufacturerOptions`.
- `apps/web/modules/imports/components/record/import-record-panel.tsx` — calls `useImportStagedInventoryRowsSection`; tracks `stagedRows` via local `useState`; passes `serverRows` + `drafts` to the section.
- `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx` (renamed) — read-only status badge driven by server status; `stockCount` → `startingStock`; `calculateImportSummary` removed.
- `apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx` — dropped transport/status/total-cost cells; added Manufacturer cell.

**Inventory module — data (2):**
- `apps/web/modules/inventory/data/queries.ts` — dropped `{ isImported: true }` filter.
- `apps/web/modules/inventory/data/mutations.ts` — dropped dead `createInventoryRequest` + `updateInventoryCutLogsRequest`.

**Inventory module — controllers (1):**
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` — `validateInventoryInput`/`describeInventoryValidationIssues` swapped to `validateInventoryForm`/`describeInventoryFormValidationIssues`; selectedLocationLookup composed from the controller's `locationOptions`.

**Inventory module — components (5):**
- `apps/web/modules/inventory/components/list/inventory-client.tsx` — new field set (`startingStock`, `totalCutSum`, `stockBalance`, `coverageBalance`, plus `inventoryNumber`).
- `apps/web/modules/inventory/components/list/inventory-table.tsx` — cell map updated; all `stockUnit` references → `stockUnitAbbrev`.
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` — dropped `isImported` read-only branch; passes new props to cut-logs section.
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — dropped pending-import notice; balance cells = Starting + Cut + Available + Coverage (last two only when present).
- `apps/web/modules/inventory/components/record/sections/inventory-cut-logs-section.tsx` — prop signature `{ cutLogs, stockUnitAbbrev, totalCutSum, isArchived }`; dropped Pending Cuts metric; empty-state gate now `isArchived`.

**Dashboard pages (3):**
- `apps/web/app/dashboard/imports/page.tsx` — `allowedGroupKeys: ["manufacturer", "warehouse"]`.
- `apps/web/app/dashboard/imports/[id]/page.tsx` — passes `initialStagedRows`, `initialLiveRows`, `manufacturerOptions`.
- `apps/web/app/dashboard/imports/new/page.tsx` — passes `manufacturerOptions`.

## Verification

- `npm run build --workspace @builders/domain` — clean.
- `npm run build --workspace @builders/db` — clean (Prisma generate + tsc).
- `npm run build --workspace @builders/application` — clean.
- `npm run typecheck --workspace @builders/web` — 57 errors total, all pre-existing in `modules/work-orders/**`, `modules/shared/engines/record-view/panel/**`, `modules/admin/**`, `app/api/admin/users/**`. Zero in the sweep 4e scope.
- Manual smoke (next: dev server) — out of scope for this report; the type contract is right and the route response now carries the staged rows the controller reconciles against.

## Out of scope, lined up for next sweep

- Mark-for-import controller + UI button on the staged-rows section (the client helper is exported and ready).
- Live-inventory section UI on the import detail page (the data is already on the page-data shape).
- Worker-status surfacing (Bull Board polling, batch progress display).
- Cut-logs save flow (`/api/inventory/[id]/cut-logs/section` + use case + section editing).
- Pre-existing typecheck failures in `work-orders`, `admin`, and `record-view/panel` (separate sweeps).
