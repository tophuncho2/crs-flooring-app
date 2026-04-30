# Execution Log — Work Orders & Templates Main Section Bug Fixes

Plan: [wo-templates-main-section-bugfix-plan.md](wo-templates-main-section-bugfix-plan.md) — locked.

| Layer | Status | Commit |
|---|---|---|
| Domain (date-format + address helpers, PropertyOption + TemplateDetail widening, toWorkOrderForm projection) | ✅ DONE | `265a4a67` (bundled) |
| Data (propertyOptionSelect + templateDetailSelect/write-repo) | ✅ DONE | `265a4a67` (bundled) |
| Module data (WorkOrderFormOptionSet propertyOptions widened) | ✅ DONE | `265a4a67` (bundled) |
| UI primitive (DateCell) | ✅ DONE | `265a4a67` (bundled) |
| Shared composite (PropertyJoinedReadOnlyCells) | ✅ DONE | `265a4a67` (bundled) |
| Module dir UI — Work orders | ✅ DONE | `265a4a67` (bundled) |
| Module dir UI — Templates | ✅ DONE | `265a4a67` (bundled) |

Per CLAUDE.md, schema commits are alone but bug-fix bundles can ship multi-layer in one commit; this fix touches no schema.

---

## Domain (DONE)

| File | Result |
|---|---|
| `packages/domain/src/shared/date-format.ts` | ✅ Added `toDateInputValue(value)` returning `YYYY-MM-DD` UTC-stable; "" for null/invalid. |
| `packages/domain/src/shared/address/index.ts` | ✅ Added `buildAddressBlock({streetAddress, city, state, postalCode})` returning multi-line `street\ncity, state postalCode` (drops empty parts). |
| `packages/domain/src/management/properties/types.ts` | ✅ `PropertyOption` widened with `streetAddress, city, state, postalCode, instructions: string`. |
| `packages/domain/src/management/properties/normalizers.ts` | ✅ Local `PropertyOptionInput` widened with `instructions`; `normalizePropertyOption` projects all five new fields ("" on null). |
| `packages/domain/src/management/templates/types.ts` | ✅ `TemplateDetail` adds `propertyStreetAddress, propertyCity, propertyState, propertyPostalCode, propertyInstructions: string`. |
| `packages/domain/src/management/templates/normalizers.ts` | ✅ `TemplateDetailInput.property` shape widened (Omit + override); `normalizeTemplate` projects the joined fields. |
| `packages/domain/src/flooring/work-orders/form-rules.ts:25` | ✅ `scheduledFor: workOrder.scheduledFor` → `scheduledFor: toDateInputValue(workOrder.scheduledFor)`. Removes the "T00:00:00.000Z" fallthrough at the form-draft boundary. |

Gate: `npm run build --workspace @builders/domain` ✅ exit 0.

## Data (DONE)

| File | Result |
|---|---|
| `packages/db/src/management/properties/read-repository.ts` | ✅ `propertyOptionSelect` adds `instructions: true` (the 4 address columns were already selected). |
| `packages/db/src/management/templates/read-repository.ts` | ✅ `templateDetailSelect.property` widened to select `name, streetAddress, city, state, postalCode, instructions`. |
| `packages/db/src/management/templates/write-repository.ts` | ✅ Same widening on the local `templateDetailSelect` used by `createTemplateRecord` + `updateTemplateRecord` (caught by typecheck — the create/update paths re-read via this select and feed `normalizeTemplate`). |

Gate: `npm run build --workspace @builders/db` ✅ exit 0.

## Module data (DONE)

| File | Result |
|---|---|
| `apps/web/modules/work-orders/data/queries.ts` | ✅ `WorkOrderFormOptionSet.propertyOptions` widened to `{id, label, streetAddress, city, state, postalCode, instructions}`; projection in `getWorkOrderFormOptions` updated. |
| `apps/web/modules/templates/data/queries.ts` | ✅ No code change needed — templates loads `listPropertyOptions()` directly, so the widened domain `PropertyOption[]` flows through automatically. |

## UI primitive (DONE)

| File | Result |
|---|---|
| `apps/web/components/cells/date-cell.tsx` (NEW) | ✅ Mirrors `TextCell` shape. Editable: `<input type="date">` (HTML5 calendar; emits `YYYY-MM-DD`). Read-only: `formatStableDate(value)` or "-". Same `align`/`tone`/`invalid`/`className` knobs. |
| `apps/web/components/cells/index.ts` | ✅ Re-exports `date-cell`. |

## Shared composite (DONE)

| File | Result |
|---|---|
| `apps/web/modules/shared/property-fields/property-joined-readonly-cells.tsx` (NEW) | ✅ Takes `{ property: PropertyJoinedFields \| null, startRow, startCol?, colSpan? }`. Renders 2 `<CellAt><FormField><StaticFieldValue>...</StaticFieldValue></FormField></CellAt>` blocks (address multi-line via `buildAddressBlock` + instructions). Both fall back to "—". |
| `apps/web/modules/shared/property-fields/index.ts` (NEW) | ✅ Re-export. |

`PropertyJoinedFields` is a narrow type carrying just the 5 fields the cells need, so consumers can pass any matching shape (e.g. WO's local `PropertyOption` or domain `PropertyOption`) without an adapter.

## Module dir — Work orders (DONE)

| File | Result |
|---|---|
| `apps/web/modules/work-orders/controllers/drafts.ts` | ✅ Local `PropertyOption` widened with the 5 joined fields. |
| `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx` | ✅ (a) `Scheduled For` is now a `DateCell`. (b) Property + Warehouse `SelectCell`s pass `placeholder="Select property"` / `placeholder="Select warehouse"`. (c) Standardized the 3 other selects on the `placeholder` pattern (dropped the inline `[{ value: "", label: "—" }, ...]` shim — VACANCY_OPTIONS shed its blank entry too). (d) Inline address-formatting block + read-only Instructions cell removed; replaced with `<PropertyJoinedReadOnlyCells property={selectedProperty} startRow={6} />`, where `selectedProperty = propertyOptions.find(o => o.id === draft.propertyId) ?? null`. (e) `propertyAddress` + `propertyInstructions` props dropped from the function signature. |
| `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx` | ✅ Stopped passing `propertyAddress` + `propertyInstructions`. |
| `apps/web/modules/work-orders/components/record/work-order-create-client.tsx` | ✅ Same — stopped passing the dropped props. |

## Module dir — Templates (DONE)

| File | Result |
|---|---|
| `apps/web/modules/templates/components/record/template-primary-fields-section.tsx` | ✅ Imports `PropertyOption` from domain as `TemplatePropertyOption` for the property dropdown payload. Property dropdown still derives `{value, label}` for SelectCell. New rows 5+6: `<PropertyJoinedReadOnlyCells property={selectedProperty} startRow={5} />` driven by `propertyOptions.find(...)`. |
| `apps/web/modules/templates/components/record/template-record-panel.tsx` | ✅ `propertyOptions` prop type changed from `TemplateDropdownOption[]` to `TemplatePropertyOption[]`. |
| `apps/web/modules/templates/components/record/template-create-client.tsx` | ✅ Same prop-type swap on the create-page panel + outer client. |
| `apps/web/modules/templates/components/record/template-detail-client.tsx` | ✅ Same prop-type swap on the detail-page client. |

---

## Verification gates

| Gate | Command | Result |
|---|---|---|
| Domain build | `npm run build --workspace @builders/domain` | ✅ exit 0 |
| Data build | `npm run build --workspace @builders/db` | ✅ exit 0 |
| Web typecheck | `npm run typecheck --workspace @builders/web` | ✅ exactly 9 errors — all pre-existing leftovers (3 `app/api/admin/users/[id]/route.ts`, 1 `modules/admin/.../use-admin-user-primary-controller.ts`, 5 `modules/shared/engines/record-view/panel/`). **No new errors from this fix.** |
| Date-format unit tests | `vitest run tests/shared/date-format.test.ts` | ✅ 2/2 pass |
| Other test failures | `npm run test --workspace @builders/web` | ⚠️ 18 pre-existing failures across imports/products/admin/route-helpers — none touch any file modified by this fix. |

## Notable design points

1. **`PropertyOption` widening is purely additive.** All existing consumers (`listPropertyOptions` callers in 4 modules: work-orders, templates, properties, plus the WO API options route) keep working with the original `{id, name, address}` shape; the new fields ride along. Templates picked up the new fields automatically because its data flow already uses domain `PropertyOption[]` directly.

2. **`buildAddressBlock` next to `buildAddressLine`.** Both share the same input shape. The new helper is the multi-line formatter; the existing single-line formatter stays for compact displays (lists, etc.). Future PDF + email surfaces can adopt either.

3. **`DateCell` mirrors `TextCell` exactly.** Same prop contract, same className conventions. HTML5 `<input type="date">` is the calendar picker — no extra dependency, no portal. Read-only renders via the existing `formatStableDate` so display formatting stays consistent with list views.

4. **Composite vs primitive placement.** `PropertyJoinedReadOnlyCells` knows about a domain concept ("property") so it lives at `apps/web/modules/shared/property-fields/`, not under `apps/web/components/`. The `cells/` and `fields/` primitives stay domain-agnostic per `apps/web/components/CLAUDE.md`. Both modules import the composite as a peer component.

5. **Live-from-selection vs saved-record.** The composite reads from `propertyOptions.find(o => o.id === draft.propertyId)` so the cells update the moment the user picks a property. No re-fetch, no save round-trip needed. Templates' saved-record `propertyStreetAddress`/etc. fields (added to `TemplateDetail`) aren't currently consumed by the UI — they're added so PDF / email / future side-panel surfaces have the snapshot available without re-querying.

6. **No `apps/web/app/api/templates/options/route.ts`.** Templates loads its options via SSR in `data/queries.ts`'s `loadTemplateDropdownOptions`, so there's no separate API route shape to update.

**Open issues:** none.

---

## Out of scope (unchanged from plan)

- Admin `SessionUser`/`GovernableRole` build fix (3 errors — blocks `npm run build`).
- Engine `panel/` `../client/...` import path errors (5 errors).
- Adopting `DateCell` in other modules' date fields.
