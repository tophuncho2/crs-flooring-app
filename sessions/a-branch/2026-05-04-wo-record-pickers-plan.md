# WO Record View — Async Picker Trio

## Context

The work-orders record view's primary section currently uses three static `SelectCell`s for **Management Company**, **Property**, and **Template** ([work-order-primary-fields-section.tsx:120–152](apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx)). The dropdown's option lists are SSR-pre-fetched in full from `getWorkOrderFormOptions()` ([queries.ts:54–72](apps/web/modules/work-orders/data/queries.ts)) — every property, every company, every template, on every record load.

This sweep migrates the three fields to the same async-search picker trio shipped in template-sync. Same cascade rule (Mgmt → Property → Template), but **filter-only** (changing Mgmt narrows the Property results without clearing the existing `propertyId` — record-view safety: no surprise unlink). Read-only mode renders `StaticFieldValue` from joined names on `WorkOrderDetail`. The three SSR pre-fetches get dropped — pickers fetch on demand and the joined fields cover read-only display.

**Out of scope:** templates record view (will mirror this sweep next), WO list-view filters, the create-client divergence (it reuses the same section so it's covered automatically).

---

## Layer-boundary contract

This sweep is a **module-level UI swap**. Nothing crosses package boundaries.

| Layer | Lives in | New code this sweep |
| --- | --- | --- |
| Schema | `packages/db/prisma/` | None |
| Domain | `packages/domain/` | None |
| Data | `packages/db/` | None |
| Application | `packages/application/` | None |
| API | `apps/web/app/api/` | None |
| Web primitives | `apps/web/components/` | None — `AsyncRichDropdown`, `StaticFieldValue`, `FormField`, `CellAt` reused as-is |
| Web controllers | `apps/web/controllers/` | None — `useAsyncRichDropdownController` reused |
| Web hooks | `apps/web/hooks/` | None |
| Web transport | `apps/web/transport/` | None |
| Module — work-orders | `apps/web/modules/work-orders/` | Edits only: primary section, record panel, create-client, queries |
| Module — properties | `apps/web/modules/properties/` | None — `PropertyPicker` reused via its public export |
| Module — templates | `apps/web/modules/templates/` | None — `TemplatePicker` reused |
| Module — management-companies | `apps/web/modules/management-companies/` | None — `ManagementCompanyPicker` reused |

**Notes:**
- No new code in `apps/web/components/`, `apps/web/controllers/`, `apps/web/hooks/`, or `modules/shared/`.
- WO module imports the three pickers via their sibling-module public exports — same cross-module import pattern template-sync already uses.
- Pre-existing `modules/shared/engines/...` imports inside the WO record area stay untouched (engines tree mid-migration).

---

## Reference patterns to copy

| Concern | Reference file |
| --- | --- |
| Picker integration into a parent component | [template-sync-button.tsx](apps/web/modules/template-sync/components/template-sync-button.tsx) |
| Read-only joined display (precedent in WO record) | [property-joined-readonly-cells.tsx](apps/web/modules/work-orders/components/record/primary/property-joined-readonly-cells.tsx) |
| `StaticFieldValue` primitive | [apps/web/components/fields/](apps/web/components/fields) |

---

## Execution plan

### 1. WO data queries — drop the three pre-fetches

[apps/web/modules/work-orders/data/queries.ts](apps/web/modules/work-orders/data/queries.ts)

- Remove `listPropertyOptions()`, `listManagementCompanyOptions()`, `listTemplateOptions()` calls from `getWorkOrderFormOptions()`.
- Keep warehouses, job types, products, categories as-is.
- Update the `WorkOrderFormOptionSet` shape to drop the three fields. Type errors will surface in any consumer still reading them — fix in step 2/3/4.

### 2. WO primary section — replace the three SelectCells

[apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx](apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx)

For each of the three fields, branch on `editable`:

```tsx
<CellAt col={1} row={2} colSpan={3}>
  <FormField label="Management Company">
    {editable ? (
      <ManagementCompanyPicker
        value={draft.managementCompanyId || null}
        onChange={(value) => onFieldChange("managementCompanyId", value ?? "")}
        selectedLabel={detail.managementCompany?.name ?? null}
        ariaLabel="Management company"
      />
    ) : (
      <StaticFieldValue>{detail.managementCompany?.name ?? "—"}</StaticFieldValue>
    )}
  </FormField>
</CellAt>
```

Same for **Property** (cols 4–5) and **Template** (cols 6–8). Property picker takes `managementCompanyId={draft.managementCompanyId || null}` to scope its search. Template picker takes `propertyId={draft.propertyId || null}` and renders disabled when null.

- **Drop the three `*SelectOptions` props** from `WorkOrderPrimaryFieldsSectionProps`.
- **Add a `detail: WorkOrderDetail` prop** so the section has the joined names + ids for read-only display + as `selectedLabel` seeds for the editable pickers (lets the trigger show the selected name even before the user opens the dropdown).
- Keep `PropertyJoinedReadOnlyCells` as-is — it already takes `property` and renders address fields. Confirm it can read from `detail.property` directly; if it currently reads from `selectedProperty` (looked up in the dropped options array), switch the source to `detail.property`.

### 3. Record panel — drop the three option props, no cascade reset

[apps/web/modules/work-orders/components/record/work-order-record-panel.tsx](apps/web/modules/work-orders/components/record/work-order-record-panel.tsx)

- Stop forwarding `propertyOptions` / `managementCompanyOptions` / `templateOptions` to `WorkOrderPrimaryFieldsSection`.
- Forward the WO detail to the section as the new `detail` prop.
- **No cascade reset in `onFieldChange`.** Per Q1 = filter-only: when Mgmt or Property changes, leave dependent FKs intact. The pickers' search dropdowns will re-scope automatically because the `managementCompanyId` / `propertyId` props are derived from the live draft.

### 4. Create client — same prop drops

[apps/web/modules/work-orders/components/record/work-order-create-client.tsx](apps/web/modules/work-orders/components/record/work-order-create-client.tsx)

- Drop the three option props.
- Pass `detail={null}` (or an empty stub) to the section. The section's read-only path won't render in create mode (always editable), and pickers don't need `selectedLabel` for new records — `null` is fine.
- Verify create flow still works after drops (no TS errors in the component).

### 5. Type cleanup

- Update `WorkOrderFormOptionSet` definition to drop the three list fields.
- Search for any other consumer of those three fields (`grep "managementCompanyOptions\|propertyOptions\|templateOptions" apps/web/modules/work-orders`). Likely just the section + panel + create client.

---

## Verification

1. **Typecheck** — `npm run typecheck --workspace @builders/web` must be clean.
2. **Build** — `npm run build:web` (the exact step Railway runs). Confirms no client-bundle regressions.
3. **UI end-to-end** —
   - Open an existing WO record (`/dashboard/work-orders/<id>`). Read-only mode should show the three labels (or "—" if unset).
   - Click Edit. Each picker should show the current selection in its trigger.
   - Type to search each — confirm async results stream in, debounced.
   - Pick a different Management Company — Property picker's results should narrow to that company's properties (verify by typing). Existing `propertyId` should remain set.
   - Pick a different Property — Template picker's results should switch to that property's templates. Existing `templateId` should remain set.
   - Save section. Confirm `PATCH /api/work-orders/[id]/primary/section` round-trips correctly and the read-only labels update.
   - Open a fresh WO via `/dashboard/work-orders/new`. Confirm pickers work with no `selectedLabel`.
4. **Network** — DevTools → confirm the page load no longer fetches all properties/companies/templates as part of the SSR payload (smaller initial HTML).

---

## Files touched (summary)

**Modified:**
- `apps/web/modules/work-orders/data/queries.ts` (drop three list fetches + update return type)
- `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx` (swap 3 SelectCells → pickers + StaticFieldValue branches; add `detail` prop)
- `apps/web/modules/work-orders/components/record/primary/property-joined-readonly-cells.tsx` (likely no-op; confirm source is `detail.property`)
- `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx` (drop option props, forward `detail`)
- `apps/web/modules/work-orders/components/record/work-order-create-client.tsx` (drop option props, pass `detail={null}`)

**New:** none.

---

## Open questions

None remaining. (Resolved: filter-only cascade, StaticFieldValue read-only, drop SSR pre-fetches.)

---

## Note on plan location & next sweep

Plan lives at `sessions/a-branch/2026-05-04-wo-record-pickers-plan.md`. Whether execution happens on a-branch vs staging is the user's call. The next planned sweep is the **templates record view** — same picker integration, same boundaries, mirrors this plan.
