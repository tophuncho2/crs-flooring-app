# Warehouse Picker — Apply to Inventory Record View (Sweep 4 of 4)

## Context

Final consumer of the warehouse picker package. Mirror of sweeps 1+2+3 (WO + templates + imports). Picker package already shipped.

Inventory specifics:
- No create flow (rows auto-created by import workflow) — only the detail page is touched
- List-page warehouse filter stays — `listInventoryPageFilterOptions` is consumed by the list filter chip (out of scope per the established "don't touch list filters" rule)
- Location field's gating on warehouseId is preserved automatically (picker's `onChange` flows through the same `onFieldChange` conduit)

**Out of scope:**
- Inventory list view + filter
- Warehouse module's list/record view (legacy stack)
- `InventoryWarehouseOption` domain type stays — still used by the list filter

## Files this sweep (5, all modified, 0 new)

| File | Change |
|---|---|
| `apps/web/modules/inventory/data/queries.ts` | Drop `warehouseOptions` from `getInventoryDetailPageData` body + return-type annotation. Keep `locationOptions`. Drop `InventoryWarehouseOption` type import. `listInventoryPageFilterOptions` untouched. |
| `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` | Drop `warehouseOptions` prop + `InventoryWarehouseOption` import. Add `warehouseName: string \| null` prop. Import `WarehousePicker`. Replace `SelectCell` with `editable ? <WarehousePicker selectedLabel={warehouseName}> : <StaticFieldValue>{warehouseName ?? "—"}</StaticFieldValue>`. |
| `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` | Drop `warehouseOptions` prop + `InventoryWarehouseOption` import. Pass `warehouseName={controller.record.warehouseName}` to section. |
| `apps/web/modules/inventory/components/record/inventory-detail-client.tsx` | Drop `warehouseOptions` prop + `InventoryWarehouseOption` import + panel forwarding. |
| `apps/web/app/dashboard/inventory/[id]/page.tsx` | Stop forwarding `warehouseOptions`. |

## Behavior

- Warehouse stays required. Picker shows `selectedLabel={inventory.warehouseName}` for saved records.
- Location field gating preserved (`editable && Boolean(draft.warehouseId)` reads the live draft, which the picker updates via `onFieldChange`).
- Available-locations filter (`controller.availableLocationOptions`) preserved.
- Page payload smaller — no all-warehouses fetch on inventory record load.
- Inventory list view + warehouse filter chip unchanged.

## Warehouse picker package status — done after this sweep

| Site | Sweep | Status |
|---|---|---|
| Work-orders primary | 1 | ✅ shipped |
| Templates primary | 2 | ✅ shipped |
| Imports primary | 3 | ✅ shipped |
| Inventory primary | 4 | ⏳ this sweep |
