# Warehouse Picker — Apply to WO Record View (Sweep 1 of 4)

## Context

The warehouse picker package is **already shipped** — `WarehousePicker`, `searchWarehouseOptionsRequest`, `searchWarehouseOptionsUseCase`, `searchWarehouseOptions` (DB), `WAREHOUSE_TOOL_SLUG`, and `GET /api/warehouses/options` all exist and are in production use today (the imports list-view warehouse filter chip consumes `WarehousePicker` already).

This sweep applies the existing picker to the WO record view's Warehouse cell and rips out the now-dead SSR-options scaffolding. Templates / imports / inventory record views are sweeps 2/3/4.

**Search target confirmed**: existing `searchWarehouseOptions` matches `name` only, case-insensitive — already aligned with the user's spec. No backend change.

**Out of scope:**
- Warehouse list view + record view (legacy stack — explicitly not migrated this sweep per user)
- Warehouse list-view search bar / sort toggle (per user spec — leave intact)
- Templates / imports / inventory record-view warehouse cells (sweeps 2/3/4)

## Resolved decisions

| Decision | Choice |
|---|---|
| Build picker package | Already shipped — no new code |
| Search field | Already targets `name` only |
| Auth | `WAREHOUSE_TOOL_SLUG = "warehouse"` matches WO tool slug — works |
| Dead-code cleanup | Aggressive: drop `getWorkOrderFormOptions`, `getWorkOrderCreatePageData`, `WorkOrderFormOptionSet`, and the `options` page-data field. Mirrors the SSR-drop pattern from prior sweeps. |

---

## Layer-boundary contract

| Layer | New code |
| --- | --- |
| Schema / Domain / Data / Application / API | None — everything already shipped |
| Web primitives / controllers / hooks / transport | None — all reused |
| Module — warehouse | None — `WarehousePicker` reused via public export |
| Module — work-orders | 5 file edits + 2 page loader edits |
| Module — templates / imports / inventory | Untouched (sweeps 2/3/4) |
| `modules/shared` | No new imports |

---

## Reference patterns

| Concern | Reference |
|---|---|
| Picker swap with `WorkOrderPrimaryDetail` extension | sweep 1 of pickers (Property/Mgmt/Template), most recently job-types (job-type-picker-package-wo) |
| Existing WarehousePicker call site | [imports/components/list/warehouse-filter-chip.tsx](apps/web/modules/imports/components/list/warehouse-filter-chip.tsx) |
| WO panel `detail` object construction | [work-order-record-panel.tsx](apps/web/modules/work-orders/components/record/work-order-record-panel.tsx) — already has property/mgmt/template/jobType fields |

---

## Execution plan

### 1. `apps/web/modules/work-orders/data/queries.ts`

- Drop `listWarehouseOptions` from imports.
- Delete `WorkOrderFormOptionSet` type.
- Delete `getWorkOrderFormOptions()` function.
- Delete `getWorkOrderCreatePageData()` function.
- Drop `options` field from `WorkOrderDetailPageData`.
- Drop the `getWorkOrderFormOptions()` call from `getWorkOrderDetailPageData`'s `Promise.all`.

### 2. `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx`

- Drop `WarehouseOption` import (and its source line referencing `drafts`).
- Add `warehouseId: string | null` and `warehouseName: string | null` to `WorkOrderPrimaryDetail`.
- Import `WarehousePicker` from `@/modules/warehouse/components/picker/warehouse-picker`.
- Drop `warehouseOptions` prop from signature + `warehouseSelectOptions` derivation.
- Replace the Warehouse cell branch:
  ```tsx
  <CellAt col={3} row={1} colSpan={2}>
    <FormField label="Warehouse">
      {editable ? (
        <WarehousePicker
          value={draft.warehouseId || null}
          onChange={(id) => onFieldChange("warehouseId", id ?? "")}
          selectedLabel={detail?.warehouseName ?? null}
          placeholder="Select warehouse"
          ariaLabel="Warehouse"
        />
      ) : (
        <StaticFieldValue>{detail?.warehouseName ?? "—"}</StaticFieldValue>
      )}
    </FormField>
  </CellAt>
  ```

### 3. `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx`

- Drop `options` prop + `WorkOrderFormOptionSet` import.
- Drop `warehouseOptions` forwarding to section.
- Add `warehouseId: controller.record.warehouseId` + `warehouseName: controller.record.warehouseName` to the `detail` object.

### 4. `apps/web/modules/work-orders/components/record/work-order-detail-client.tsx`

- Drop `options` prop + `WorkOrderFormOptionSet` import.
- Stop forwarding `options` to `WorkOrderRecordPanel`.

### 5. `apps/web/modules/work-orders/components/record/work-order-create-client.tsx`

- Drop `options` prop from both inner `WorkOrderCreatePanel` and exported `WorkOrderCreateClient`.
- Drop `WorkOrderFormOptionSet` import.
- Drop `warehouseOptions` forwarding to section.

### 6. `apps/web/app/dashboard/work-orders/[id]/page.tsx`

- Stop forwarding `result.data.options`.

### 7. `apps/web/app/dashboard/work-orders/new/page.tsx`

- Stop calling `getWorkOrderCreatePageData()` (it no longer exists). Stop forwarding `options`. Drop the try/catch around it (no DB fetch left at this layer; if one is needed later we can add back).

---

## Verification

1. `npm run typecheck --workspace @builders/web` — clean.
2. `npm run build --workspace @builders/web` (Railway's step) — succeeds.
3. UI smoke (manual): open a WO record. Read-only mode shows the joined warehouse name. Edit mode opens picker with current selection in trigger. Type to search — results filter by warehouse name. Pick a different warehouse → save → round-trips. Open `/dashboard/work-orders/new` — picker works empty. Try to save a new WO without picking a warehouse — server-side validator should still 400 (warehouse is required).

---

## Files touched (7, all modified, 0 new)

- `apps/web/modules/work-orders/data/queries.ts`
- `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx`
- `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx`
- `apps/web/modules/work-orders/components/record/work-order-detail-client.tsx`
- `apps/web/modules/work-orders/components/record/work-order-create-client.tsx`
- `apps/web/app/dashboard/work-orders/[id]/page.tsx`
- `apps/web/app/dashboard/work-orders/new/page.tsx`

---

## Open questions

None.

---

## Follow-up sweeps (out of scope)

- **Sweep 2 — templates record view warehouse cell**: same `<WarehousePicker>` swap on `template-primary-fields-section.tsx`. Drop `listWarehouseOptions` from `loadTemplateDropdownOptions` (which becomes empty) — full dead-code cleanup of `loadTemplateDropdownOptions` + `getTemplateCreatePageOptions` + `warehouseOptions` page-data field (similar to what we'll do in WO this sweep).
- **Sweep 3 — imports record view**: warehouse field on `import-primary-fields-section.tsx`. Imports module already uses `WarehousePicker` for its list filter chip — proven path.
- **Sweep 4 — inventory record view**: warehouse field swap.
