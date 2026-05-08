# Sweep 4e — Imports + Inventory modules + dashboard rewire

## Context

Sweep 4d re-pointed `apps/web/app/api/{imports,inventory}/**` onto canonical use cases and added the staged-inventory-rows section + mark-for-import routes. The API surface is clean; `tsc -b` reports zero errors under `apps/web/app/api/{imports,inventory}/**`. All remaining failures are in:

- `apps/web/modules/imports/{components,controllers,data}` — references types and helpers that the post-alteration domain no longer exports (`transportType`, `status`, `stockCount`, `formatImportStatus`, `calculateImportSummary`, `ImportInventoryRow`, `InventoryRowsDiff`, `listImportOptions`, `ImportFormOptions`).
- `apps/web/modules/inventory/{components,controllers,data}` — references the pre-alteration `InventoryRow` shape (`stockCount`, `stockUnit`, `totalCutBalance`, `awaitingCutBalance`, `availableBalance`, `uncutBalance`, `isImported`).
- `apps/web/modules/inventory/data/queries.ts` calls `listInventory({ isImported: true })` — the filter no longer has `isImported` (`InventoryListFilter` now: `importEntryId, warehouseId, productId, categoryId, isArchived`).
- `apps/web/app/dashboard/{imports,inventory}/**` page loaders are thin wrappers that delegate to module `data/queries.ts`. They will compile clean once the queries layer is fixed; their own bodies need no changes (verified — pages just hand `result.data.*` to client components).

Net effect: the dashboard pages are stable surface; nearly all rewire happens inside `modules/{imports,inventory}/`. The directory structure is canonical and stays — this sweep updates file *contents* (and renames two files to match the new section name).

End state after this sweep:
- `npm run build:web` succeeds. The imports + inventory list/record views render with the new domain shapes.
- The mark-for-import worker-trigger route has a client helper (`markStagedRowsForImportRequest`) ready for the next sweep's controller.
- `_validators.ts`-driven body shapes match what the client mutations send (`startingStock`, `manufacturerId`, full staged-rows diff envelope).

## Field-rename cheatsheet (apply across all rewires)

### `ImportRow` (live import header) — old → new
| Old (gone) | New |
|---|---|
| `transportType` | (removed — no replacement; drop from list/forms) |
| `status` | (removed — no replacement; drop from list/forms) |
| `itemsCount` | `stagedInventoryRowsCount`, `liveInventoryRowsCount` (split into two counts) |
| (n/a) | `percent` (worker-maintained Decimal as string, e.g. import progress %) |
| (n/a) | `manufacturerId`, `manufacturerName` |

### `ImportPrimaryForm` — new shape
`{ orderNumber, tag, notes, warehouseId, manufacturerId }`. Drop `transportType`, `status`. Add `manufacturerId`. Use `EMPTY_IMPORT_PRIMARY_FORM` and `toImportPrimaryForm` from `@builders/domain` directly.

### `ImportDetail` — new shape (note carefully)
`ImportRow & { stagedInventoryRows: ReadonlyArray<{ id: string }>; inventories: ReadonlyArray<{ id: string }> }`. The detail no longer carries inline row contents — only id pointers. **Implication:** the import detail page must load full staged rows + full live inventory rows separately on the server (via `listStagedInventoryByImport(id)` + `listInventory({ importEntryId: id })`) and pass them to the client. Update `getImportDetailPageData` accordingly (see queries.ts changes below).

### Import inventory rows diff — old → new
| Old (gone) | New |
|---|---|
| `InventoryRowsDiff`, `InventoryRowDraft`, `InventoryRowUpdate`, `InventoryRowUpdatePatch`, `InventoryRowDelete` | `StagedInventoryRowsDiff`, `StagedInventoryRowDraft`, `StagedInventoryRowUpdate`, `StagedInventoryRowUpdatePatch`, `StagedInventoryRowDelete` |
| `stockCount` (string) on draft + patch | `startingStock` (string) |
| `isImported` field on draft + patch | (removed — staged rows track imported-state via the row itself, not via the diff. Drop the field.) |
| `ImportInventoryRow` (the inline row type on `ImportDetail`) | `StagedInventoryRow` (load via `listStagedInventoryByImport`) |

### `InventoryRow` (live inventory) — old → new
| Old (gone) | New |
|---|---|
| `stockCount` | `startingStock` |
| `stockUnit` (single string) | `stockUnitName`, `stockUnitAbbrev` (snapshot pair) |
| `totalCutBalance` | `totalCutSum` |
| `awaitingCutBalance` | (removed — no replacement) |
| `availableBalance` | (removed — no replacement; if needed, compute or drop UI) |
| `uncutBalance` | (removed; conceptually replaced by `stockBalance` / `coverageBalance`) |
| `isImported` | (removed — staged rows own this flag now; live rows are always "imported" by definition) |
| (n/a) | `inventoryNumber`, `importNumber`, `importEntryId`, `categorySlug`, `itemCoverageUnitName/Abbrev`, `sendUnitName/Abbrev`, `costPerUnit`, `freightPerUnit`, `coveragePerUnit`, `stockBalance`, `coverageBalance`, `fifoReceivedAt` |

### `InventoryDetail` — new shape
`InventoryRow & { cutLogs: CutLogRow[] }` only. Drop any reference to detail-only fields that were on the old shape.

### `InventoryForm` — new shape
`{ itemNumber, dyeLot, warehouseId, locationId, notes, isArchived }`. Drop `productId`, `stockCount`, `cost`, `freight`. Use `EMPTY_INVENTORY_FORM` and `toInventoryForm` from `@builders/domain`.

### `InventoryListFilter` — old → new
| Old (gone) | New |
|---|---|
| `isImported` | (removed; the rows table represents *live* inventory only — staged rows live elsewhere) |

`listInventory()` (no filter) returns all live inventory.

### Removed `@builders/domain` exports
| Old (gone) | Replacement |
|---|---|
| `formatImportStatus` | (removed — no replacement; drop the column or the call) |
| `formatImportTransportType` | (removed — no replacement) |
| `calculateImportSummary` | (removed — replace with inline percent display from `ImportRow.percent`, or drop) |

### Removed `@builders/db` exports (or replace via composition)
| Old (gone) | Replacement |
|---|---|
| `listImportOptions` | Compose: `listProducts`, `listWarehouses`, `listLocationsByWarehouse` (per warehouse), `listCategories`, `listManufacturers`. Or restore a thin `listImportOptions` in `packages/db/src/flooring/imports/read-repository.ts` returning `{ products, warehouses, locations, categories, manufacturers }`. **Recommended: restore the canonical reader** — keeps the modules/data/queries.ts thin per the architecture's data-layer carve-out. This is a `packages/db` change, but a small one. |
| `ImportFormOptions` | Define inline in domain (`packages/domain/src/flooring/imports/options.ts`) or in the data repository alongside the new `listImportOptions`. |

## Per-file punch list

### `app/api` cleanup (small)

| File | Status |
|---|---|
| `apps/web/app/api/imports/options/route.ts` | **Verify only** — touch only if it imports a removed symbol. The route calls `getImportFormOptions()` from `modules/imports/data/queries.ts`; once queries.ts is fixed, this route compiles unchanged. |
| `apps/web/app/api/inventory/options/route.ts` | **Verify only** — same pattern; calls `listInventoryPageFilterOptions()`. Should be clean. |

If either route hand-imports a removed `@builders/db` symbol directly, fix it; otherwise leave.

### `modules/imports/data/`

#### `queries.ts` — major rewrite
1. **Imports rewrite**: drop `listImportOptions`, `ImportFormOptions` from the `@builders/db` import block. Add (recommended) `listImportOptions` once it's restored to `@builders/db` (see below) — *or* compose inline from `listProducts`, `listWarehouses`, `listLocationsByWarehouse`, `listCategories`, `listManufacturers`.
2. **`buildImportsOrderBy`**: drop the `transport` and `status` field-map entries (`transportType`/`status` columns no longer exist). Add a `manufacturer` group key mapped to `{ manufacturer: { companyName: direction } }`. Update `allowedGroupKeys` in the dashboard page to match (`["warehouse", "manufacturer"]`).
3. **`getImportFormOptions`**: rename the exported keys if/when the canonical reader returns them (keep the same shape: `productOptions`, `warehouseOptions`, `locationOptions`, `categoryOptions`, **add** `manufacturerOptions`).
4. **`getImportDetailPageData`**: load full staged + live rows server-side. Compose:
   ```
   const [import, options, stagedRows, liveRows] = await Promise.all([
     getImportDetailById(id),
     getImportFormOptions(),
     listStagedInventoryByImport(id),
     listInventory({ importEntryId: id }),
   ])
   ```
   Return shape: `{ entry: import, stagedRows, liveRows, productOptions, warehouseOptions, locationOptions, categoryOptions, manufacturerOptions }`. The detail-client signature changes correspondingly.
5. **`getImportCreatePageData`**: now needs `warehouseOptions` + `manufacturerOptions` (form requires manufacturerId). Add manufacturers to its return.

#### `mutations.ts` — three changes
1. **Rename + retype**: `updateImportInventoryRowsRequest` → `updateImportStagedInventoryRowsRequest`. Endpoint: `/api/imports/${id}/inventory-rows/section` → `/api/imports/${id}/staged-inventory-rows/section`. Param type: `diff: InventoryRowsDiff` → `diff: StagedInventoryRowsDiff`. Response type: `{ import: ImportDetailRecord, tempIdMap }` (the new route returns the parent detail, not the inline rows).
2. **`createImportRequest`**: input type stays `CreateImportInput` from `@builders/application` — but the runtime shape changed. No client change beyond the form sender producing the new fields (`manufacturerId` added, `transportType`/`status` removed). The TS type pulls through automatically once `@builders/application` is updated; verify the form caller passes the right shape.
3. **Add `markStagedRowsForImportRequest`**:
   ```ts
   export async function markStagedRowsForImportRequest(
     importId: string,
     stagedRowIds: string[],
     idempotencyKey: string,
   ) {
     return requestJson<{ batch: { markedRowIds: string[]; outboxEventId: string; wasDuplicate: boolean } }>(
       `/api/imports/${importId}/staged-inventory-rows/mark-for-import`,
       {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(withMutationMeta({ stagedRowIds }, idempotencyKey)),
       },
     )
   }
   ```
   Note: `withMutationMeta`'s second arg is normally a revisionKey for `expectedUpdatedAt` — for an action route there's no parent updatedAt to gate on. Verify `withMutationMeta` accepts an idempotency-only call (it should, since the field is optional). If it doesn't, pass an empty string and update the helper.

### `modules/imports/controllers/`

#### `use-import-inventory-rows-section.ts` → **rename** `use-import-staged-inventory-rows-section.ts`
1. Function rename: `useImportInventoryRowsSection` → `useImportStagedInventoryRowsSection`.
2. Input type: replace `ImportInventoryRow` with `StagedInventoryRow` (from `@builders/domain`). Where the controller gets its initial rows: source from `serverValue.stagedRows` (new field on the page-data shape) instead of `serverValue.inventories` on the detail.
3. Diff shape: `InventoryRowsDiff` → `StagedInventoryRowsDiff`. Field renames inside the diff builder: `stockCount` → `startingStock`. Drop `isImported` from any diff payload (the field no longer exists on the staged-row diff).
4. Mutation call: `updateImportInventoryRowsRequest` → `updateImportStagedInventoryRowsRequest`. Response handling: result has `{ import, tempIdMap }` — the controller used to read `result.import.inventories` for fresh row data; now it must load fresh rows from the new `getImportDetailPageData` shape (or have the route return them — see "Decision needed" below).
5. Remove now-irrelevant patch fields (`isImported` on `InventoryRowUpdatePatch`).

#### `drafts.ts` — rewrite
1. Rename type `ImportInventoryRowDraft` → `StagedInventoryRowDraft`. Update field `stockCount` → `startingStock`. Drop `isImported` field.
2. Drop `ImportInventoryRow` import (gone). Use `StagedInventoryRow` from `@builders/domain` for the seed.
3. `ImportPrimaryForm` references: drop `transportType`/`status` access; add `manufacturerId` handling. Use `EMPTY_IMPORT_PRIMARY_FORM` and `toImportPrimaryForm` from `@builders/domain` directly to seed/round-trip the form.
4. `validateImportInventoryDrafts` (or analogous helper): rename if needed; rename "stock is required" → "starting stock is required" (or rely on the domain's `validateStagedInventoryRowsDiff`, which is what runs server-side).

#### `use-import-primary-section.ts`
Update form shape: drop `transportType`/`status` defaulting; add `manufacturerId`. Keep using `EMPTY_IMPORT_PRIMARY_FORM` and `toImportPrimaryForm`.

#### `use-imports-list-controller.ts`
Adjust column / grouping / filter references: drop `transportType`/`status`-based grouping. Add `manufacturer` grouping. Update `allowedGroupKeys` in the consuming dashboard page to match. The `ImportRow` type itself doesn't need a re-import name change.

### `modules/imports/components/`

#### `formatters.ts`
If this file re-exports `formatImportStatus` / `formatImportTransportType`, drop those re-exports and any local helpers built on them. Add a `formatImportPercent(value: string): string` helper if the list view will surface `percent`. Keep stable helpers (anything not coupled to status/transport).

#### `list/imports-client.tsx`
1. Drop `formatImportStatus`, `formatImportTransportType` imports (gone from `@builders/domain`).
2. Drop column references to `transportType`, `status`, `itemsCount` (lines 83–87 in the current file).
3. Replace `itemsCount` UI with `stagedInventoryRowsCount` and/or `liveInventoryRowsCount` columns (or a single combined "rows" cell — design call).
4. Add `percent` column if useful (display via the new `formatImportPercent` if you add it).
5. Add `manufacturerName` column.

#### `list/imports-table.tsx`
Same drops + adds as `imports-client.tsx`. Both files share most of the column scaffolding.

#### `record/import-create-client.tsx`
1. Drop `transportType`/`status` from the seeded `ImportPrimaryForm` (lines 25–26).
2. Add `manufacturerId` to the form seed; pass `manufacturerOptions` prop in.
3. Update prop type: receive `manufacturerOptions` from `getImportCreatePageData()`.

#### `record/import-detail-client.tsx`
1. Update prop signature to receive `stagedRows: StagedInventoryRow[]` and `liveRows: InventoryRow[]` (the new page-data fields). Pass `stagedRows` into the staged-rows section; pass `liveRows` into the live-inventory section (a new section, optional this sweep — see "Live inventory section on import detail" below).
2. Add `manufacturerOptions` prop.

#### `record/import-record-panel.tsx`
1. Update import: `useImportInventoryRowsSection` → `useImportStagedInventoryRowsSection`.
2. Section title (optional): "Inventory rows" → "Staged inventory rows" (clarity).

#### `record/sections/import-inventory-rows-section.tsx` → **rename** `import-staged-inventory-rows-section.tsx`
1. Drop `calculateImportSummary` import (gone). Replace with inline summary or drop the summary card.
2. Rename all field references: `stockCount` → `startingStock`. Drop any `isImported` cell or branch (the field is no longer on the diff/draft).
3. Update prop type: rows are `StagedInventoryRow[]` (from server) + `StagedInventoryRowDraft[]` (in-flight from controller).

#### `record/sections/import-primary-fields-section.tsx`
1. Drop the `transportType` field group (lines 51–53).
2. Drop the `status` field group (lines 67–69).
3. Add a `manufacturerId` field group (select from `manufacturerOptions`).
4. Drop the `totalCostLabel` reference (line 125 — gone from `ImportDetail`). If the design wants total cost displayed, derive from staged or live rows on the server side (out-of-scope for this sweep; drop the line for now).

### `modules/inventory/data/`

#### `queries.ts`
1. **`loadInventoryPageData`**: drop the `{ isImported: true }` filter — `InventoryListFilter` no longer has that field. Plain `listInventory()` returns all live inventory.
2. Other functions (`listInventoryPageFilterOptions`, `getInventoryById`, `getInventoryDetailPageData`) compile once domain types are right. No body changes needed beyond drift cleanup.

#### `mutations.ts`
1. Drop any `createInventoryRequest` if present (no `POST /api/inventory` route). Looking at sweep 4d's verification, none was confirmed — verify and delete if found.
2. `updateInventoryRequest` (PATCH primary): payload type narrows to `UpdateInventoryInput` = `{ itemNumber?, dyeLot?, warehouseId?, locationId?, notes?, isArchived? }`. The form must stop sending `productId`/`stockCount`/`cost`/`freight`.
3. `deleteInventoryRequest` stable.

### `modules/inventory/controllers/`

#### `use-inventory-primary-section.ts`
1. Update form shape via `EMPTY_INVENTORY_FORM` / `toInventoryForm` from `@builders/domain`.
2. Drop `productId`, `stockCount`, `cost`, `freight` from the form state and patch builder.
3. Add `isArchived` boolean to the form state and patch builder.
4. Drop any field referenced from `localValue.stockCount` or related — it's `startingStock` on the read shape but not on the form.

#### `use-inventory-cut-logs-section.ts`
Touch only if it consumes a removed field. Cut logs are a separate domain — likely stable; verify and skip if clean.

#### `use-inventory-list-controller.ts`
Drop column / sort references to gone fields (`stockCount`, `totalCutBalance`, etc — see component changes).

### `modules/inventory/components/`

#### `list/inventory-client.tsx`
- Drop columns referencing `stockCount`, `totalCutBalance`, `awaitingCutBalance`, `availableBalance`, `uncutBalance` (lines 47–51).
- Add columns for `startingStock`, `totalCutSum`, `stockBalance`, `coverageBalance` as appropriate.

#### `list/inventory-table.tsx`
- Lines 71–93: same renames. `stockCount` → `startingStock`; `totalCutBalance` → `totalCutSum`; drop `awaitingCutBalance`/`availableBalance`/`uncutBalance`.
- All `stockUnit` references → `stockUnitAbbrev` (or `stockUnitName` for the long form).

#### `record/inventory-record-panel.tsx`
- Line 35: drop `inventory.isImported` reference (gone).
- Line 87: `stockUnit` → `stockUnitAbbrev`.
- Lines 88–89: `totalCutBalance` → `totalCutSum`; drop `awaitingCutBalance` (no replacement — design call: drop the cell or compute differently).
- Line 90: drop `isImported` reference.

#### `record/sections/inventory-primary-fields-section.tsx`
- Line 42: drop `inventory.isImported` branch.
- Line 83: `stockCount` → `startingStock`; `stockUnit` → `stockUnitAbbrev`.
- Line 90: `totalCutBalance` → `totalCutSum`; `stockUnit` → `stockUnitAbbrev`.
- Lines 97, 104: drop `uncutBalance`, `availableBalance` cells (no direct replacement — `stockBalance`/`coverageBalance` are the canonical balance fields if you want to keep balance display).

#### `record/inventory-detail-client.tsx`
Verify it doesn't pass any of the removed fields through props. Adjust if it does.

#### `record/sections/inventory-cut-logs-section.tsx`
Touch only if it consumes a removed field; otherwise stable.

### `app/dashboard/imports/`

#### `page.tsx`
- Line 22: `allowedGroupKeys: ["transport", "status", "warehouse"]` → `["manufacturer", "warehouse"]`.
- Default group key (line 21): `["warehouse"]` is fine.
- Otherwise stable — delegates to `getImportsPageData`.

#### `[id]/page.tsx`
- Update prop wiring to pass the new `stagedRows`, `liveRows`, `manufacturerOptions` into `ImportDetailClient`.

#### `new/page.tsx`
- Update prop wiring to pass `manufacturerOptions` into `ImportCreateClient`.

### `app/dashboard/inventory/`

#### `page.tsx`
- Stable. Delegates to `getInventoryPageData`. Compiles clean once the queries layer fixes the filter.

#### `[id]/page.tsx`
- Stable. Delegates to `getInventoryDetailPageData`.

### `packages/db` (small support change)

Restore `listImportOptions` + `ImportFormOptions` to `packages/db/src/flooring/imports/read-repository.ts`, returning `{ products, warehouses, locations, categories, manufacturers }`. Compose existing `listProducts` / `listWarehouses` / `listLocationsByWarehouse` (over all warehouses, or flat `flooringLocation.findMany`) / `listCategories` / `listManufacturers`. Keep the data-package carve-out: read-only composition. The `ImportFormOptions` type can re-export from `@builders/domain` (recommended) or define locally; pick whichever matches the existing `InventoryFormOptions` precedent (which lives in domain and is consumed by `listInventoryOptions`). Match that pattern.

This is a small `packages/db` add, not a large change. Without it, `modules/imports/data/queries.ts` either inlines five separate canonical reads (uglier, against the thin-wrapper convention) or pulls them from inside the module (also fine, but less clean).

## Decision needed before execution

**Live-inventory section on the import detail view.** The new `ImportDetail` carries `inventories: ReadonlyArray<{id}>` — which means the import record view *can* show a live-inventory section listing rows the worker materialized. Two options:

1. **In scope this sweep:** load live rows via `listInventory({ importEntryId })` in `getImportDetailPageData`, render a read-only "Live inventory" section under the import detail. Symmetrical to the staged-rows section, simpler than the staged section (read-only, no diff). +1 file (`record/sections/import-live-inventory-section.tsx`), +1 controller (or controller-less if read-only).
2. **Defer:** load `listInventory` server-side and pass through, but skip the section UI. Saves design + a small UI build. Page-data wire still added so the next sweep has the data.

Recommendation: **defer the section UI but add the server-side fetch + page-data shape.** Symmetry of data, minimal new component.

## Verification

1. **`tsc -b`**: zero errors across the repo.
2. **`npm run build:web`**: succeeds.
3. **Imports list page** (`/dashboard/imports`): renders rows with the new column set (importNumber, orderNumber, tag, percent, warehouseName, manufacturerName, staged-rows count, live-rows count, createdAt). No 500.
4. **Import create page** (`/dashboard/imports/new`): form fields = orderNumber, tag, notes, warehouse select, manufacturer select. Submitting creates a record and redirects.
5. **Import detail page** (`/dashboard/imports/[id]`): primary section edit works. Staged-rows section: add/edit/delete row → save → controller calls `updateImportStagedInventoryRowsRequest` → 200 with new `tempIdMap` → in-place reconciliation. Stale `expectedUpdatedAt` → 409 visibly handled.
6. **Inventory list page** (`/dashboard/inventory`): renders with new columns (`startingStock`, `totalCutSum`, `stockBalance`, etc). No reference to deleted fields.
7. **Inventory detail page** (`/dashboard/inventory/[id]`): primary section edit works. Form sends only the six allowed fields. Cut-logs section unaffected.
8. **Mark-for-import client helper exists** (no UI yet) — `markStagedRowsForImportRequest` is exported from `modules/imports/data/mutations.ts` so the next sweep's controller can import it directly.

## Sequencing

1. **Restore `listImportOptions` to `@builders/db`** + add `manufacturerOptions` shape (smallest unblocking change).
2. **`modules/imports/data/queries.ts`**: rewrite per above. Restores type compile for the imports module.
3. **`modules/inventory/data/queries.ts`**: drop `{ isImported: true }` from the list filter. Restores type compile for inventory data layer.
4. **`modules/imports/data/mutations.ts`**: rename + retype the staged-rows request; add `markStagedRowsForImportRequest`.
5. **`modules/imports/controllers/`**: rename `use-import-inventory-rows-section.ts` → `use-import-staged-inventory-rows-section.ts`; rewrite to build `StagedInventoryRowsDiff` and call the renamed mutation. Update `drafts.ts`, `use-import-primary-section.ts`, `use-imports-list-controller.ts` to the new domain shapes.
6. **`modules/imports/components/`**: drop deleted columns/fields/imports; rename `import-inventory-rows-section.tsx` → `import-staged-inventory-rows-section.tsx`; rewire `import-record-panel.tsx`, `import-detail-client.tsx`, `import-create-client.tsx` to receive new props.
7. **`modules/inventory/controllers/`**: shrink primary-section form to the six allowed fields; add `isArchived`.
8. **`modules/inventory/components/`**: drop deleted-field references; rename `stockCount`/`stockUnit`/`totalCutBalance` per the cheatsheet.
9. **`app/dashboard/imports/page.tsx`**: update `allowedGroupKeys`.
10. **`app/dashboard/imports/[id]/page.tsx` and `new/page.tsx`**: pass new props (`stagedRows`, `liveRows`, `manufacturerOptions`) through.
11. **`tsc -b`** + **`npm run build:web`** + manual smoke per Verification §3–8.

Order rationale: data layer first (every module file imports its types). Controllers next (they consume types and call mutations). Components last (they consume controller outputs). Dashboard pages are thin glue, they fall out at the end.

## Renames summary

| From | To |
|---|---|
| `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` | `.../use-import-staged-inventory-rows-section.ts` |
| `useImportInventoryRowsSection` (function) | `useImportStagedInventoryRowsSection` |
| `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx` | `.../import-staged-inventory-rows-section.tsx` |
| `updateImportInventoryRowsRequest` (function) | `updateImportStagedInventoryRowsRequest` |
| `ImportInventoryRowDraft` (type in drafts.ts) | `StagedInventoryRowDraft` (or alias to it from `@builders/domain`) |

## New files / additions

- `apps/web/modules/imports/data/mutations.ts`: `markStagedRowsForImportRequest`.
- `packages/db/src/flooring/imports/read-repository.ts`: restore `listImportOptions` + `ImportFormOptions` (or domain-side type def).
- (Optional) `apps/web/modules/imports/components/record/sections/import-live-inventory-section.tsx` — read-only live-inventory listing on the import detail. Defer per "Decision needed" above.

## Out of scope after this sweep

- A user-facing "Run import" controller (button + status surfacing + polling) on the staged-rows section that calls `markStagedRowsForImportRequest`. This sweep stops at the client *helper*; the next sweep wires the *controller* + UI gesture.
- Worker-status surfacing (Bull Board polling, batch progress display).
- Live-inventory section UI on the import detail (deferred per decision above).
- Any new domain helpers (`formatImportPercent`, etc) beyond those needed to clear compile errors.
