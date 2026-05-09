# Session — Locations & Sections Removal (UI layer)

**Started:** 2026-05-08
**Branch:** staging
**Sweep scope:** Remove warehouse Location and Section from the UI ONLY. No API, application, domain, data, or Prisma/schema changes in this sweep. Subsequent layers will be scoped in follow-up sweeps. Schema changes always ship in their own commit.
**Out of scope this sweep:** Warehouse list view and warehouse record view (including its "Sections" panel) — deferred. API routes, use cases, domain, data layer, Prisma models — separate later sweeps.

---

## Status checklist

| # | Surface | Status |
|---|---|---|
| 1 | Inventory record view — "Full Location" cell | ✅ done |
| 2 | Inventory record view — Location dropdown (LocationPicker) | ✅ done |
| 3 | Imports record view — Staged Inventory Rows: Location dropdown column | ✅ done |
| 4 | Imports record view — Imported Rows: Location column | ✅ done |
| 5 | Inventory list view — Section + Location filter chips | ✅ done |
| 6 | Inventory list view — Section + Location columns | ✅ done |
| 7 | Cut log columns showing Location (inv record + WO record, shared `grid-layout.ts`) | ⏳ pending |
| 8 | WO cut log edit form — Section + Location dropdowns | ⏳ pending |
| 9 | Picker components: `modules/locations/components/picker/location-picker.tsx` and `modules/warehouse-sections/components/picker/section-picker.tsx` | ⏳ pending (delete after consumers are gone) |

---

## Files modified

### Inventory record view (surfaces 1–2)
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx`
  - Removed "Full Location" cell, then Location dropdown cell.
  - Dropped `LocationPicker` + `LocationOption` imports, `useState`/`useEffect` imports, `pickedLocation` state and `useEffect` cleanup, `displayLocationCode` and `displayLocationShortCode` derivations, `locationCode` and `locationShortCode` props.
  - Row 2 reflowed to `Warehouse · Starting Balance · Cut Balance` (cols 1/3/5).
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx`
  - Stopped passing `locationCode` and `locationShortCode` to `InventoryPrimaryFieldsSection`.

### Imports record view (surfaces 3–4)
- `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx`
  - Removed `LocationPicker` import + `LocationOption` type import.
  - Removed `location` entry from `STAGED_ROWS_LAYOUT.dataColumns` and the `case "location":` `LocationPicker` block.
  - Dropped now-unused `warehouseId` and `onSetRowLocationSnapshot` props from signature + type.
- `apps/web/modules/imports/components/record/imported-rows/import-imported-rows-section.tsx`
  - Removed `location` entry from `IMPORTED_ROWS_LAYOUT.dataColumns` and the `case "location":` `TextCell` block.
  - Removed pre-existing dead `CurrencyCell` import.
- `apps/web/modules/imports/components/record/import-record-panel.tsx`
  - Stopped passing `warehouseId` and `onSetRowLocationSnapshot` to `ImportStagedInventoryRowsSection`.

### Inventory list view (surfaces 5–6)
- `apps/web/modules/inventory/components/list/inventory-table.tsx`
  - Removed `section` and `location` column defs from `INVENTORY_LIST_LAYOUT.dataColumns` and their `case` blocks in `renderCell`.
- `apps/web/modules/inventory/components/list/inventory-client.tsx`
  - Removed imports of `LocationFilterChip`, `SectionFilterChip`, `LocationOption`, `SectionOption`.
  - Removed `sectionId`/`locationId` from `INVENTORY_FILTERABLE_FIELDS`.
  - Removed `initialSelectedSection`/`initialSelectedLocation` props (and types).
  - Removed `selectedSectionId`/`selectedLocationId` derivations, `sectionLabel`/`locationLabel` memos, `handleSectionChange`/`handleLocationChange` callbacks.
  - `handleWarehouseChange` no longer cascade-clears section/location.
  - Toolbar collapsed to: Warehouse → divider → Category → Product.
- `apps/web/modules/inventory/data/list-inventory-request.ts`
  - Removed `"sectionId"` and `"locationId"` from `FILTER_KEYS` tuple.
  - Removed unused `FilterKey` type alias (TS6196).
- `apps/web/app/dashboard/inventory/page.tsx`
  - Removed imports of `searchLocationOptionsUseCase`, `searchSectionOptionsUseCase`, `LocationOption`, `SectionOption`.
  - Removed `initialSelectedSection`/`initialSelectedLocation` declarations, the section/location URL-id extraction, the two resolve blocks, and the prop pass to `<InventoryClient>`.

### Files deleted
- `apps/web/modules/inventory/components/list/location-filter-chip.tsx`
- `apps/web/modules/inventory/components/list/section-filter-chip.tsx`

### Root project doc
- `CLAUDE.md` — added "Current Sweep" header at the top describing scope, in-scope UI surfaces, out-of-scope layers, and the saved-table-preferences finding.

---

## Decisions made

1. **Warehouse list/record view out of scope** — deferred to a later sweep (originally surface 8 in the audit; user pulled it).
2. **Picker components in scope** — `apps/web/modules/locations/components/picker/location-picker.tsx` and `apps/web/modules/warehouse-sections/components/picker/section-picker.tsx` will be deleted after all UI consumers are gone (cut-log form is the last remaining consumer).
3. **Saved table preferences (`tableKey: "inventory-main"`)** — no `tableKey` bump or migration needed. `normalizeColumnOrder` / `normalizeColumnVisibility` in `apps/web/modules/shared/engines/list-view/controllers/use-table-columns.ts` filter unknown column keys against the current `columnKeys`, so stale `location`/`section` entries in users' saved prefs degrade silently.
4. **`InventoryListFilters` (in `@builders/application`)** — left intact this sweep. Application contract still carries `sectionId`/`locationId`; UI just stops parsing/sending them. Will be dropped in the application/domain sweep.
5. **Controller-side dead code left in place** — `useImportStagedInventoryRowsSection.setRowLocationSnapshot`, `handleWarehouseChange`'s row-locationId clear, draft `locationShortCode`/`locationId` fields, and `useInventoryPrimarySection`'s `localValue.locationId` are now unused from the UI but remain wired in controllers. They belong to the controller-layer sweep.

---

## Out-of-scope references still in the codebase

These remained intentionally untouched and are not bugs of this sweep:

- `apps/web/modules/inventory/components/picker/inventory-picker.tsx` — accepts `sectionId`/`locationId` props for scoping picker results. Used by other modules (e.g. work orders).
- `apps/web/modules/inventory/data/inventory-options-request.ts` — picker options request still threads `sectionId`/`locationId` through to the API.
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` — controller draft still tracks `localValue.locationId`.
- `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts` — `setRowLocationSnapshot`, `handleWarehouseChange`'s row clear, draft `locationShortCode`/`locationId` fields.
- `apps/web/modules/imports/controllers/drafts.ts` — `ImportStagedRowDraft.locationShortCode` / `locationId`.
- `apps/web/modules/imports/data/queries.ts` — comment referencing `locationShortCode` on `StagedInventoryRow`.
- `apps/web/modules/inventory/data/queries.ts` — comment referencing `locationCode`/`locationShortCode`.

---

## Verification

- TypeScript: `tsc -p apps/web/tsconfig.json --noEmit` clean after each surface.
- No tests touched. Earlier audit confirmed no test snapshots assert on Location/Section UI text.
- Per CLAUDE.md: nothing committed.

## Remaining work in this sweep

- Cut log columns (surface 7) — locate and remove `locationFilter` column in shared cut-log grid layout.
- WO cut log edit form (surface 8) — remove `SectionPicker` and `LocationPicker` from the form.
- Once both above are gone, delete the two picker components (surface 9).

## Follow-up sweeps (not this branch)

- Warehouse list + record view (deferred Sections panel).
- Controller layer cleanup (drop dead snapshot setters, draft fields, cascade-clears).
- API routes — drop `sectionId`/`locationId` query params from inventory list + options endpoints.
- Application layer — drop these keys from `InventoryListFilters` and `searchInventoryOptions*` use cases.
- Domain — drop `LocationOption`, `SectionOption`, `locationCode`/`locationShortCode`/`sectionNumber` fields on `InventoryRow`/`StagedInventoryRow`.
- Data + Prisma — drop `Location` and `WarehouseSection` models (schema commit on its own).
