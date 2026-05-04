# Templates Record View — Async Picker Pair

## Context

Mirror the WO record sweep for the templates record view. Replace the two static `SelectCell`s for **Management Company** and **Property** in [template-primary-fields-section.tsx](apps/web/modules/templates/components/record/template-primary-fields-section.tsx) with `ManagementCompanyPicker` and `PropertyPicker`. Drop the two SSR pre-fetches in [queries.ts](apps/web/modules/templates/data/queries.ts) (`listManagementCompanyOptions` + `listPropertyOptions`). Read-only mode renders `StaticFieldValue` from joined names on `TemplateDetail`. Cascade is **filter-only** — changing Management Company narrows the Property picker's results without nulling `propertyId`.

**Dead-code cleanup:** `propertyLocked` / `managementCompanyLocked` props on the section + `initialPropertyId` / `initialManagementCompanyId` props on `TemplateCreateClient` + the `?propertyId=` / `?managementCompanyId=` URL param parsing on `new/page.tsx` are all removed. They served the old "create template from a property's lookup section" flow that no longer exists. Confirmed via grep — nothing in the codebase generates those URLs.

**Out of scope:** templates list-view filters, anything outside the templates module.

---

## Layer-boundary contract

Module-only swap. No package-layer changes.

| Layer | New code |
| --- | --- |
| Schema / Domain / Data / Application / API | None |
| Web primitives / controllers / hooks / transport | None — `AsyncRichDropdown`, `useAsyncRichDropdownController`, `StaticFieldValue`, `FormField`, `CellAt` reused |
| Module — properties | None — `PropertyPicker` reused (already exposes `onOptionSelected` from the WO sweep) |
| Module — management-companies | None — `ManagementCompanyPicker` reused |
| Module — templates | 5 file edits |
| `app/dashboard/templates/{[id],new}/page.tsx` | 2 file edits (drop forwarded props + URL param parsing) |

No new imports from `modules/shared`. Pickers are imported via sibling-module public exports.

---

## Execution plan

### 1. `apps/web/modules/templates/data/queries.ts`

- Drop `listManagementCompanyOptions` + `listPropertyOptions` from imports and from `loadTemplateDropdownOptions()`.
- Drop the two return fields. Update `getTemplateDetailPageData`'s return-type annotation.

### 2. `apps/web/modules/templates/components/record/template-primary-fields-section.tsx`

- Drop the two `SelectCell`s for Management Company and Property; replace each with `editable ? <Picker /> : <StaticFieldValue />`.
- Drop `managementOptions` + `propertyOptions` props.
- Drop `propertyLocked` + `managementCompanyLocked` props (dead code).
- Drop the `TemplateDropdownOption` + `TemplatePropertyOption` type re-exports (only the section consumed them).
- Add a slim `detail: TemplatePrimaryDetail | null` prop carrying the joined names + property address fields needed for read-only display + picker `selectedLabel` seeding.
- Add `pickedPropertyJoined` local state + effect on `detail.propertyId` so `PropertyJoinedReadOnlyCells` updates live during edit (mirrors the WO section).
- Property picker: pass `managementCompanyId={draft.managementCompanyId || null}` for filter-only cascade, and `onOptionSelected={handlePropertyOption}` for the live preview.

### 3. `apps/web/modules/templates/components/record/template-record-panel.tsx`

- Drop `managementOptions` + `propertyOptions` props.
- Build `detail` from `primary.record` (the live `TemplateDetail`) and forward to the section.

### 4. `apps/web/modules/templates/components/record/template-detail-client.tsx`

- Drop `managementOptions` + `propertyOptions` props from prop type and from forwarding to `TemplateRecordPanel`.

### 5. `apps/web/modules/templates/components/record/template-create-client.tsx`

- Drop `managementOptions` + `propertyOptions` props.
- Drop `initialPropertyId` + `initialManagementCompanyId` props (dead code) and the matching `createInitialValue` overrides — falls back to `EMPTY_TEMPLATE_FORM`.
- Pass `detail={null}` to the section (create mode is always editable; pickers show empty triggers).

### 6. `apps/web/app/dashboard/templates/[id]/page.tsx`

- Drop `managementOptions` + `propertyOptions` from the props passed to `TemplateDetailClient`.

### 7. `apps/web/app/dashboard/templates/new/page.tsx`

- Drop `?propertyId=` / `?managementCompanyId=` URL param parsing.
- Drop `managementOptions` + `propertyOptions` + `initialPropertyId` + `initialManagementCompanyId` from props passed to `TemplateCreateClient`.

---

## Verification

1. `npm run typecheck --workspace @builders/web` — clean.
2. `npm run build --workspace @builders/web` (Railway's step) — succeeds.
3. UI smoke (manual) — open an existing template record, edit, search each picker, change Mgmt Co and confirm Property results narrow without clearing `propertyId`, change Property and confirm address cells update live, save, confirm round-trip. Open `/dashboard/templates/new`, confirm pickers work.

---

## Files touched (7 — all modified, 0 new)

- `apps/web/modules/templates/data/queries.ts`
- `apps/web/modules/templates/components/record/template-primary-fields-section.tsx`
- `apps/web/modules/templates/components/record/template-record-panel.tsx`
- `apps/web/modules/templates/components/record/template-detail-client.tsx`
- `apps/web/modules/templates/components/record/template-create-client.tsx`
- `apps/web/app/dashboard/templates/[id]/page.tsx`
- `apps/web/app/dashboard/templates/new/page.tsx`
