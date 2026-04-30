# Plan — Work Orders & Templates Main Section Bug Fixes

## Context

Three bugs reported on the WO main section, with templates parity bundled in:

1. **Scheduled For** is a plain `TextCell` rendering raw ISO timestamps ("…T00:00:00.000Z"); should be a calendar picker with proper formatting.
2. **Property** + **Warehouse** dropdowns visually default-select the first option but underlying state stays `""` → save fails domain validation.
3. **Property Address** + **Property Instructions** read-only cells don't update when the user picks a different property (pinned to the saved record). Templates lacks these cells entirely.

Per user direction:
- Read-only cells must follow the **live dropdown selection**, not the saved record.
- Formatter + composite must be **shared** so templates picks them up.

This is a bug-fix bundle spanning Domain → Data → API/queries → Module-dir UI. No schema changes. No application / worker / relay changes.

## Bug surface map

| # | Layer | File | Issue |
|---|---|---|---|
| 1 | UI | `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx:165-173` | TextCell with placeholder "YYYY-MM-DD" — no calendar picker |
| 1 | Domain (root cause) | `packages/domain/src/flooring/work-orders/normalizers.ts:49-53` | `toIsoDate(Date)` → `.toISOString()` produces `2026-04-29T00:00:00.000Z`; `toWorkOrderForm` passes that into the form draft unchanged |
| 1 | Existing infra | `packages/domain/src/shared/date-format.ts` | `formatStableDate` already exists for display (MM/DD/YYYY); no `toDateInputValue` (YYYY-MM-DD) helper yet; no `DateCell` primitive |
| 2 | UI | `work-order-primary-fields-section.tsx:88-97` (Property), `:129-138` (Warehouse) | No `placeholder` prop → SelectCell renders the bare options, browser visually selects the first one but `value=""` is unchanged |
| 2 | Primitive (correct) | `apps/web/components/cells/select-cell.tsx:52` | Already prepends `<option value="">{placeholder}</option>` when `placeholder` is set; templates uses this pattern correctly |
| 3 | Data flow (works) | `packages/db/src/flooring/work-orders/shared.ts:46-55` → `packages/domain/src/flooring/work-orders/normalizers.ts:86-90` → `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx:70-76` | Joined property fields ARE selected, normalized, and passed in |
| 3 | **Real bug** | `work-order-record-panel.tsx:70-76` | Address+instructions read from `controller.record.*` (saved record) → stale on dropdown change |
| 3 | Why dropdown can't drive it | `apps/web/modules/work-orders/controllers/drafts.ts:11`; `apps/web/modules/work-orders/data/queries.ts` (`WorkOrderFormOptionSet.propertyOptions`) | Options payload only carries `{id, label}` — no joined address/instructions to drive a live read-only display |
| 3 | Templates parity gap | `packages/db/src/management/templates/read-repository.ts:31-32` joins only `property: { name: true }`; `packages/domain/src/management/templates/types.ts` surfaces `propertyName` only; `apps/web/modules/templates/components/record/template-primary-fields-section.tsx` has no address/instructions cells | Needs DB join expansion + normalizer projection + UI cells |

## Locked decisions

| # | Decision |
|---|---|
| 1 | Read-only cells follow **live dropdown selection** — extend domain `PropertyOption` to carry structured address fields + `instructions`. Both modules' option payloads inherit the widened shape. |
| 2 | Build a real `DateCell` primitive in `apps/web/components/cells/`, not a TextCell hack. Mirrors TextCell's contract. |
| 3 | Multi-line address formatter lives next to existing `buildAddressLine` in `packages/domain/src/shared/address/`. |
| 4 | The 2-cell read-only composite lives at `apps/web/modules/shared/property-fields/` — knows about the "property" domain concept so it's not a primitive. |
| 5 | `toWorkOrderForm` projects `scheduledFor` through the new `toDateInputValue` so the form draft never holds a full ISO. |

## Layer-by-layer changes

### Domain (`packages/domain/`)

| File | Change |
|---|---|
| `shared/date-format.ts` | Add `toDateInputValue(value: string \| Date \| null \| undefined) → string` returning `YYYY-MM-DD`; `""` for null/invalid. |
| `shared/address/index.ts` | Add `buildAddressBlock({streetAddress, city, state, postalCode}) → string` returning `street\ncity, state postal` (multi-line). Reuses the same input shape as `buildAddressLine`. |
| `management/properties/types.ts` | Extend `PropertyOption` with `streetAddress, city, state, postalCode, instructions: string`. |
| `management/properties/normalizers.ts` | `normalizePropertyOption` projects the new fields ("" on null). Widen `PropertyOptionInput` to include `instructions`. |
| `management/templates/types.ts` | Add `propertyStreetAddress, propertyCity, propertyState, propertyPostalCode, propertyInstructions: string` to `TemplateDetail`. |
| `management/templates/normalizers.ts` | Surface those fields in `normalizeTemplate` from joined `template.property.*`. |
| `flooring/work-orders/form-rules.ts:25` | `scheduledFor: workOrder.scheduledFor` → `scheduledFor: toDateInputValue(workOrder.scheduledFor)`. |

### Data (`packages/db/`)

| File | Change |
|---|---|
| `management/properties/read-repository.ts` | Add `instructions: true` to `propertyOptionSelect` (the 4 address columns are already selected). |
| `management/templates/read-repository.ts` | Expand the detail-select's `property: { select: { name } }` to include `streetAddress, city, state, postalCode, instructions`. List select untouched. |

### Module data + API surface (`apps/web/`)

| File | Change |
|---|---|
| `apps/web/modules/work-orders/data/queries.ts` | Widen `WorkOrderFormOptionSet.propertyOptions` to `{id, label, streetAddress, city, state, postalCode, instructions}` and update the projection in `getWorkOrderFormOptions`. |
| `apps/web/app/api/work-orders/options/route.ts` | No code change required — `listPropertyOptions` returns the widened shape automatically. JSON output gains the fields. |
| `apps/web/modules/templates/data/queries.ts` | Same `propertyOptions` projection widening on the templates option set (or remove the flatten if it currently mirrors domain shape directly). |
| `apps/web/app/api/templates/options/route.ts` (if exists) | Same — verify pass-through. |

### UI primitives (`apps/web/components/cells/`)

| File | Change |
|---|---|
| `date-cell.tsx` (NEW) | Mirrors `TextCell` shape. Editable: `<input type="date" value={value} onChange={(e) => onChange?.(e.target.value)} ...>` (HTML5 native picker, emits `YYYY-MM-DD`). Read-only: `<span>{value ? formatStableDate(value) : "-"}</span>`. Props = `CellProps<string>` + `placeholder?: string`. |
| `index.ts` | Re-export `date-cell`. |

### Shared composite (NEW directory)

| File | Change |
|---|---|
| `apps/web/modules/shared/property-fields/property-joined-readonly-cells.tsx` (NEW) | Takes `{ property: PropertyOption \| null, startRow: number, startCol?: number, colSpan?: number }`. Renders 2 `<CellAt><FormField><StaticFieldValue>...</StaticFieldValue></FormField></CellAt>` blocks: address (multi-line via `buildAddressBlock`) + instructions. Both fall back to `"—"` when null/empty. |
| `apps/web/modules/shared/property-fields/index.ts` (NEW) | Re-export. |

### Module dir — Work orders

| File | Change |
|---|---|
| `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx` | (a) Swap TextCell at `Scheduled For` for `DateCell`. (b) Add `placeholder="Select property"` + `placeholder="Select warehouse"` to those two SelectCells. Remove the inline `[{ value: "", label: "—" }, ...]` shim from the other 3 selects and use `placeholder="—"` instead — keeps one pattern. (c) Drop inline `formattedAddressLines` block + the row 6/7 read-only cells; render `<PropertyJoinedReadOnlyCells property={selectedProperty} startRow={6} />` where `selectedProperty = propertyOptions.find(o => o.id === draft.propertyId) ?? null`. (d) Drop `propertyAddress` + `propertyInstructions` props from the function signature. |
| `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx:70-76` | Stop passing `propertyAddress` + `propertyInstructions` to the fields section. |
| `apps/web/modules/work-orders/controllers/drafts.ts:11` | Replace local `PropertyOption = {id, label}` with the widened shape (or import from domain and re-shape via `id, label = name, ...rest`). |

### Module dir — Templates

| File | Change |
|---|---|
| `apps/web/modules/templates/components/record/template-primary-fields-section.tsx` | Insert `<PropertyJoinedReadOnlyCells property={selectedProperty} startRow={5} />` after the existing 4 rows. Same `propertyOptions.find(...)` lookup pattern. Add `propertyOptions` to the prop list if it isn't already structured to carry the new fields. |
| `apps/web/modules/templates/components/record/template-record-panel.tsx` | Verify that `propertyOptions` prop is forwarded to the fields section in widened shape. |

## Verification

| Gate | Command | Expected |
|---|---|---|
| Domain build | `npm run build --workspace @builders/domain` | exit 0 |
| Data build | `npm run build --workspace @builders/db` | exit 0 |
| Web typecheck | `npm run typecheck --workspace @builders/web 2>&1 \| awk -F'/' '{print $1"/"$2}' \| sort \| uniq -c` | Same 9 pre-existing leftovers (3 `app/api/admin`, 1 `modules/admin`, 5 `modules/shared/engines`). No new buckets. |
| Manual smoke (WO) | dev server → `/dashboard/work-orders/[id]` | (1) Scheduled For renders as native calendar; picking a date round-trips. (2) Property + Warehouse show "Select …" placeholder and don't visually default-select; saving without picking either fails with the proper validation message. (3) Changing the property dropdown immediately updates the address + instructions read-only cells. |
| Manual smoke (Templates) | `/dashboard/templates/[id]` | Address + Instructions cells appear and update reactively with property selection. |

## Out of scope

| Item | Why deferred |
|---|---|
| Admin SessionUser/GovernableRole fix (blocks `npm run build`) | Unrelated; tracked separately. |
| Engine `panel/` `../client/...` import path errors | Unrelated; tracked separately. |
| Adopting `DateCell` in other modules' date fields | Opportunistic — out of this fix's scope. |
| Property options payload size review | Negligible (5 string cols × small property table). |

## Critical files

**New (4):**
- `apps/web/components/cells/date-cell.tsx`
- `apps/web/modules/shared/property-fields/property-joined-readonly-cells.tsx`
- `apps/web/modules/shared/property-fields/index.ts`
- (no schema, no application, no worker)

**Modified (~12):**
- `packages/domain/src/shared/{date-format.ts, address/index.ts}`
- `packages/domain/src/management/{properties,templates}/{types,normalizers}.ts`
- `packages/domain/src/flooring/work-orders/form-rules.ts`
- `packages/db/src/management/{properties,templates}/read-repository.ts`
- `apps/web/components/cells/index.ts`
- `apps/web/modules/work-orders/{components/record/primary/work-order-primary-fields-section.tsx, components/record/work-order-record-panel.tsx, controllers/drafts.ts, data/queries.ts}`
- `apps/web/modules/templates/{components/record/template-primary-fields-section.tsx, data/queries.ts}`

Per CLAUDE.md, this is a bug-fix bundle (multi-layer in one commit allowed). Plan locks on approval; execution log lands at `wo-templates-main-section-bugfix-execution.md`.
