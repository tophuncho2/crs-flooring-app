# Location Picker — Apply to Imports Staged Rows (Sweep 2 of 2)

## Context

Final consumer of the location picker package shipped in sweep 1 (inventory). Apply per-row `LocationPicker` to the imports staged-inventory rows section's location cell, scoped to the parent import's warehouseId.

**Out of scope:** WO cut-log side panel, inventory list view, warehouse list/record view.

## Decisions

| Decision | Choice |
|---|---|
| Per-row scope | `warehouseId={parentWarehouseId}` (picker disabled when parent warehouse empty) |
| Live label snapshot | Add `locationShortCode` to `ImportStagedRowDraft` (mirrors `productName` pattern). Picker `onOptionSelected` updates via `setRowLocationSnapshot`. |
| Warehouse-change cascade | **Clear all rows' `locationId` + `locationShortCode`** when parent warehouse changes. Replaces `applyDefaultLocationToImportRow` with a simpler always-clear — picker enforces scope by construction. |
| New-row default | `addRow` no longer auto-resolves a location. Bare draft. |
| Locked-row gating | Preserved via `disabled={!editable}`. |

## Files this sweep (8, all modified, 0 new)

| File | Change |
|---|---|
| `apps/web/modules/imports/data/queries.ts` | Drop `locationOptions` from `getImportFormOptions` body + `ImportFormOptionSet` + `ImportDetailPageData`. Only `manufacturerOptions` remains. |
| `apps/web/modules/imports/controllers/drafts.ts` | Drop local `LocationOption` type + `applyDefaultLocationToImportRow` function. Add `locationShortCode: string` to `ImportStagedRowDraft`. Update `createImportStagedRowDraft` to seed from saved row. |
| `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts` | Drop `locationOptions` param + `LocationOption` import + `applyDefaultLocationToImportRow` import + `createDraftRow` helper. `addRow` calls `createImportStagedRowDraft()` directly. `handleWarehouseChange` clears `locationId` + `locationShortCode` on every row. Add domain `LocationOption` import. Add `setRowLocationSnapshot(index, option)` helper. Update `setRowField` exclusion to include `locationShortCode`. Update `duplicateRow` to copy `locationShortCode`. |
| `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx` | Drop `locationOptions` prop + `LocationOption` import + `filteredLocations` + `locationCellOptions` derivations + `SelectCell` import (verify no other consumer). Import `LocationPicker`. Add `onSetRowLocationSnapshot` prop. Replace location cell with `<LocationPicker warehouseId selectedLabel onOptionSelected>`. |
| `apps/web/modules/imports/components/record/import-record-panel.tsx` | Drop `locationOptions` prop + `LocationOption` import + section forwarding. Stop passing to controller. Forward `onSetRowLocationSnapshot`. |
| `apps/web/modules/imports/components/record/import-detail-client.tsx` | Drop `locationOptions` prop + `LocationOption` import + panel forwarding. |
| `apps/web/app/dashboard/imports/[id]/page.tsx` | Stop forwarding `locationOptions`. |
| `apps/web/app/dashboard/imports/new/page.tsx` | Already only forwards `manufacturerOptions`. No change. |

## Behavior

- Per-row picker scoped to parent warehouse; disabled when warehouse empty.
- Warehouse change clears all rows' location state.
- Picker `selectedLabel={row.locationShortCode}` shows saved value in trigger; `onOptionSelected → setRowLocationSnapshot` keeps the snapshot in sync with picks.
- Server-side validator rejects warehouse-location mismatches on save (no client-side cross-check needed).
- Page payload smaller — no all-locations fetch on imports record load.

## Location picker package status — done after this sweep

| Site | Status |
|---|---|
| Inventory record | ✅ shipped |
| Imports staged rows | ⏳ this sweep |
| WO cut-log side panel | future, out of scope |
