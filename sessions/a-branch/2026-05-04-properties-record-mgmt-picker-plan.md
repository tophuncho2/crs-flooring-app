# Properties Record View — Management Company Picker

## Context

Properties record view is fully on the legacy engines stack — `RecordPrimaryPane` (split-pane), raw `<select>` for Management Company, no new-primitive imports. This sweep adds the `ManagementCompanyPicker` (server-side search) by dropping it into the existing `RecordFormField` wrapper. Layout migration to the new `FieldSection` grid is **out of scope** — explicit user choice.

Also cleans up dead code in the same module:
- `initialManagementCompanyId` + `managementCompanyLocked` lock flow on the create path. Confirmed via grep — nothing in the codebase links to `/dashboard/properties/new` (let alone with `?managementCompanyId=`). Same situation as the templates locked-create flow you already cleaned up.
- `warehouseOptions` SSR-loaded in `loadPropertyDetailOptions()` but never forwarded to any property component. Pure waste.

---

## Layer-boundary contract

| Layer | New code |
| --- | --- |
| Schema / Domain / Data / Application / API | None |
| Web primitives / controllers / hooks / transport | None — picker is reused from `modules/management-companies` via its public export |
| `modules/shared/engines/...` | No new imports; existing legacy `RecordFormField`/`RecordPrimaryPane`/etc. preserved |
| `modules/properties` | 7 file edits, 0 new |
| `modules/management-companies` | None — `ManagementCompanyPicker` reused as-is |

The picker (a new-stack component) lives as a child inside the legacy `RecordFormField` wrapper. No layer boundary crossed: a module is composing its own legacy chrome around a primitive that comes through a sibling-module public export.

---

## Execution plan

### 1. `apps/web/modules/properties/data/queries.ts`

- Drop `listManagementCompanyOptions` + `listWarehouseOptions` from imports and from `loadPropertyDetailOptions()`.
- Drop both fields from the return type and the `getPropertyDetailPageData` payload type.
- The function now returns `{}`-ish — keep the wrapper so the page-data shape stays consistent for future additions, but its only contents are `property`.

### 2. `apps/web/modules/properties/components/record/property-primary-fields-section.tsx`

- Replace the raw `<select>` block (lines 36-51 of current file) with `<ManagementCompanyPicker value={draft.managementCompanyId || null} onChange={(id) => onFieldChange("managementCompanyId", id ?? "")} selectedLabel={property.managementCompany?.name ?? null} disabled={disabled} placeholder="No management company" ariaLabel="Management company" />`.
- Drop the `managementOptions` + `managementCompanyLocked` props from the section signature.
- Section is always editable (no read-only branch needed) — picker just respects `disabled` for the in-flight saving state.

### 3. `apps/web/modules/properties/components/record/property-record-panel.tsx`

- Drop `managementOptions` prop.
- Stop forwarding it to the section.

### 4. `apps/web/modules/properties/components/record/property-detail-client.tsx`

- Drop `managementOptions` prop.
- Stop forwarding it to `PropertyRecordPanel`.

### 5. `apps/web/modules/properties/components/record/property-create-client.tsx`

- Drop `managementOptions` + dead `initialManagementCompanyId` props from both `PropertyCreatePanel` and `PropertyCreateClient`.
- `createDefaultPropertyForm("")` baseline — no special initial.
- Stop passing `managementCompanyLocked` to the section (also dead now).

### 6. `apps/web/app/dashboard/properties/[id]/page.tsx`

- Stop forwarding `managementOptions` to `PropertyDetailClient`.

### 7. `apps/web/app/dashboard/properties/new/page.tsx`

- Drop the `?managementCompanyId=` URL param parsing.
- Stop forwarding `managementOptions` + `initialManagementCompanyId` to `PropertyCreateClient`.

---

## Verification

1. `npm run typecheck --workspace @builders/web` — clean.
2. `npm run build --workspace @builders/web` (Railway's step) — succeeds.
3. UI smoke: open an existing property record, confirm the management company trigger renders the saved name, type to search, pick a different company, save, confirm round-trip. Open `/dashboard/properties/new`, confirm picker works empty.

---

## Files touched (7, all modified, 0 new)

- `apps/web/modules/properties/data/queries.ts`
- `apps/web/modules/properties/components/record/property-primary-fields-section.tsx`
- `apps/web/modules/properties/components/record/property-record-panel.tsx`
- `apps/web/modules/properties/components/record/property-detail-client.tsx`
- `apps/web/modules/properties/components/record/property-create-client.tsx`
- `apps/web/app/dashboard/properties/[id]/page.tsx`
- `apps/web/app/dashboard/properties/new/page.tsx`

---

## Out of scope (explicit)

- **Full migration of properties record view to new primitives** (FieldSection / TextCell / etc.). Section stays on legacy `RecordPrimaryPane` chrome; only the one field changes. Migration is a separate decision deserving its own sweep + visual review.
- Properties list view, properties API, properties domain/data/application layers.
