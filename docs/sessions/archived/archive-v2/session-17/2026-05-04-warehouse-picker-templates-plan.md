# Warehouse Picker — Apply to Templates Record View (Sweep 2 of 4)

## Context

Mirror of sweep 1 (WO warehouse picker), now applied to templates. The `WarehousePicker` package is already shipped — this sweep reuses it via public export and rips out the now-dead form-options scaffolding from templates. After this sweep, templates fully retires the SSR-options pattern (matches WO post-sweep-1).

**Out of scope:** warehouse list/record view (legacy stack — explicitly not migrated). Imports / inventory record views are sweeps 3/4.

## Files this sweep (7, all modified, 0 new)

| File | Change |
|---|---|
| `apps/web/modules/templates/data/queries.ts` | Drop `listWarehouseOptions` import. Delete `loadTemplateDropdownOptions`, `loadTemplateDetailOptions`, `getTemplateCreatePageOptions`. Drop `warehouseOptions` from `getTemplateDetailPageData` return. |
| `apps/web/modules/templates/components/record/template-primary-fields-section.tsx` | Add `warehouseId` + `warehouseName` to `TemplatePrimaryDetail`. Import `WarehousePicker`. Drop `warehouseOptions` prop. Replace `SelectCell` with `editable ? <WarehousePicker> : <StaticFieldValue>`. |
| `apps/web/modules/templates/components/record/template-record-panel.tsx` | Drop `warehouseOptions` prop + section forwarding. Add `warehouseId` + `warehouseName` to `detail`. |
| `apps/web/modules/templates/components/record/template-detail-client.tsx` | Drop `warehouseOptions` prop + panel forwarding. |
| `apps/web/modules/templates/components/record/template-create-client.tsx` | Drop `warehouseOptions` from both `TemplateCreatePanel` + `TemplateCreateClient`. |
| `apps/web/app/dashboard/templates/[id]/page.tsx` | Stop forwarding `warehouseOptions`. |
| `apps/web/app/dashboard/templates/new/page.tsx` | Drop `getTemplateCreatePageOptions()` call (function deleted). Render `<TemplateCreateClient backHref={...}>` directly. |

## Behavior

- Zero user-visible changes — warehouse stays optional, picker shows saved name.
- Templates create page no longer hits DB on load.
- Templates list view warehouse column unchanged.
