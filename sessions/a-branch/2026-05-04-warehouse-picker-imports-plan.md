# Warehouse Picker — Apply to Imports Record View (Sweep 3 of 4)

## Context

Mirror of sweeps 1 + 2 (WO + templates), now applied to imports. Picker package already shipped — this sweep reuses it via public export and rips out the now-dead `warehouseOptions` SSR pre-fetch.

Imports primary section is structurally simpler than WO/templates (no `XPrimaryDetail` slim type, no read-only/edit-mode branch on cells) but the picker swap mirrors the same pattern: pass a single `warehouseName` prop carrying the saved joined name, branch on `editable` for picker vs. `StaticFieldValue`.

**Out of scope:** warehouse list/record view (legacy stack — explicitly not migrated). Inventory record view is sweep 4.

## Files this sweep (8, all modified, 0 new)

| File | Change |
|---|---|
| `apps/web/modules/imports/data/queries.ts` | Drop `listWarehouseOptions` import. Drop `warehouseOptions` from `getImportFormOptions` body + `ImportFormOptionSet` + `ImportDetailPageData`. Locations + manufacturers stay. |
| `apps/web/modules/imports/controllers/drafts.ts` | Drop dead `WarehouseOption` type export. |
| `apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx` | Drop `warehouseOptions` prop + `WarehouseOption` import. Add `warehouseName: string \| null` prop. Import `WarehousePicker` + `StaticFieldValue`. Replace `SelectCell` with `editable ? <WarehousePicker selectedLabel={warehouseName}> : <StaticFieldValue>`. |
| `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx` | Drop the dead `warehouseOptions: _warehouseOptions` prop + `WarehouseOption` type import. |
| `apps/web/modules/imports/components/record/import-record-panel.tsx` | Drop `warehouseOptions` prop + forwarding to both sections. Pass `warehouseName={controller.record.warehouseName}` to the primary section. Preserve the `if (field === "warehouseId") stagedRowsSection.handleWarehouseChange(value)` side-effect. |
| `apps/web/modules/imports/components/record/import-detail-client.tsx` | Drop `warehouseOptions` prop + panel forwarding. |
| `apps/web/modules/imports/components/record/import-create-client.tsx` | Drop `warehouseOptions` from both `ImportCreatePanel` + exported component. Pass `warehouseName={null}` to the section. |
| `apps/web/app/dashboard/imports/[id]/page.tsx` + `apps/web/app/dashboard/imports/new/page.tsx` | Stop forwarding `warehouseOptions`. |

## Behavior

- Warehouse stays required (FormField `required` flag preserved).
- Picker change → `onFieldChange("warehouseId", ...)` → existing panel-level handler still fires `stagedRowsSection.handleWarehouseChange(value)` — locations re-resolve as before.
- Page payload smaller — no all-warehouses fetch on every record load.
- Imports list-view filter chip already uses `WarehousePicker`. Untouched.
