# Planned utility — canonical searchable dropdown (`RecordCombobox`)

**Status:** backlogged. Picks up as part of the system-wide upgrade to **search, sort, grouping, and dropdown controls** on record-view + list-view surfaces. Extracted from the inventory location sweep (`docs/sweeps/LOCATION-DROPDOWN-UX-PLAN.md`) so that Phase 1 of that sweep could ship without the new primitive.

**Originally authored as:** Categories C, D, E of the location sweep plan. Phase 1 of that sweep (short/full location code split + static-cell cleanup) shipped using the existing native `<select>`. This document carries forward the primitive's shape, the per-module adapter pattern, and the open decisions into the broader system-wide sweep's backlog.

---

## Motivation

The native `<select>` used for location (and most module dropdowns today) has no search affordance. Options scale poorly. We want one canonical dropdown UI with an optional search bar — drop-in for dropdowns with more than a couple of options, while tiny 2-option selects (Import Status, Transport Type) stay native. Search, sort, grouping of option lists is a concern that belongs in the same sweep, which is why this is deferred: the primitive should land alongside the shared search/filter/grouping controls rather than in isolation.

---

## Grounded survey (as of extraction)

- **Dropdown primitives available today.** Two shallow wrappers only — `RecordGridCellSelect` (thin styled native `<select>`, `apps/web/modules/shared/engines/record-view/sections/cells/record-grid-cell-select.tsx`) and raw `<select>` with `RECORD_FIELD_CONTROL_CLASS_NAME`. **No combobox / searchable dropdown anywhere.**
- **Per-module options home today.** Nothing canonical. Option types live in domain; they're loaded by DB repo helpers, re-surfaced by `data/queries.ts` bags, and consumed inline by UI components. Inventory and imports both follow this pattern.
- **Inventory record view dropdown gating** is already in place (disabled until warehouse is selected) and filtering by `warehouseId` is already in place (`apps/web/modules/inventory/controllers/use-inventory-primary-section.ts`). Both behaviours transfer to the combobox wiring unchanged.

---

## Component · `RecordCombobox` primitive (shared engine)

**Location:** `apps/web/modules/shared/engines/record-view/sections/dropdowns/` (new subfolder).

**File:** `record-combobox.tsx`.

```ts
export function RecordCombobox<T>({
  options,
  value,
  onChange,
  placeholder,
  emptyState,
  disabled,
  invalid,
  required,
  size,
}: {
  options: Array<{
    value: string
    label: ReactNode
    searchText?: string
    meta?: T
  }>
  value: string | null
  onChange: (value: string, meta?: T) => void
  placeholder?: string
  emptyState?: ReactNode
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  size?: "compact" | "regular" | "wide"
}): JSX.Element
```

### Behaviour
- Trigger button shows the selected option's label (or placeholder). Styled with `RECORD_FIELD_CONTROL_CLASS_NAME` tokens so primary-section and grid renderings match.
- Popover contents: header **search input** (plain `<input>`, bound to local state, filtering wired up by the system-wide search utility once it lands — until then, the input is inert and clearly marked as deferred), then a scrollable option list.
- Keyboard: `Esc` closes, `Enter` selects focused, `↑/↓` navigate, `Tab` closes.
- ARIA: `combobox` role on trigger, `listbox` on panel.

### Positioning (and why it is orthogonal to dirty tracking)
- **Dirty-state tracking is unaffected by DOM position.** Dirty tracking is React state driven by `useRecordScopedSectionController` — selection fires `onChange` → controller updates its draft → section becomes dirty. This is identical to how `<select>` works today and remains true whether the popover is rendered inline or portalled. Dropdown changes join dirty tracking / local-change-pre-save the same way every other field does.
- **The real risk is clipping, not state.** A popover absolutely positioned inside the trigger's parent is clipped by ancestor `overflow-hidden` (`sections/structure/record-section-tokens.ts:12` on section items) and the grid's `overflow-x-auto` horizontal scroller (`sections/rows/record-section-grid.tsx:47`). Inventory primary section is safe inline; the imports inventory-rows grid is not.
- **Decision:** render the popover via a document-level portal (to `document.body`) with `position: fixed` positioning computed from the trigger's `getBoundingClientRect()`. Close on outside click, outside scroll, and `Esc`. Controller-side state is unchanged; only the popover DOM escapes the clipping ancestors. If we later measure that inline positioning is safe for the inventory primary section, we can add an `inline` escape hatch — but portal-first keeps a single code path.

### Shared helpers
- `useRecordComboboxDisclosure()` — open/close + focus-management hook.
- `matchRecordComboboxOption(option, query)` — pure predicate that the system-wide search sweep will fill in. Signature written, body is `() => true` at extraction time.

### Optional adoption
- `RecordGridCellSelect` stays for ≤2-option dropdowns (Import Status, Transport Type). Combobox is opt-in per call site.

### Blast radius
- New code only, 3–5 new files. Zero existing consumers touched at build time.
- Accessibility + keyboard nav are the primary complexity. Search hook is inert until the system-wide search utility lands.

---

## Per-module dropdown-options home

### Pattern
Each module gets a `data/dropdown-options/` folder. Files are named by **the option type the module exposes to dropdowns** (not by the source entity).

### Inventory
```
apps/web/modules/inventory/data/dropdown-options/
├── inventory-location-options.ts     — re-export InventoryLocationOption + toComboboxOption mapper
├── inventory-warehouse-options.ts    — re-export + mapper (future migration)
├── inventory-product-options.ts      — re-export + mapper (future migration)
└── index.ts
```

### Imports
```
apps/web/modules/imports/data/dropdown-options/
├── import-location-options.ts        — re-export InventoryLocationOption (post-normalization) + mapper
├── import-product-options.ts         — re-export + mapper (future migration)
├── import-warehouse-options.ts       — re-export + mapper (future migration)
└── index.ts
```

### Each file exports three things
1. The domain option type (`export type {...} from "@builders/domain"`).
2. `toComboboxOption(option) => { value, label, searchText, meta }` — the shape `RecordCombobox` accepts.
3. (Reserved) `matchComboboxOption(option, query)` — stub for future search. Returns `true` at extraction time; filled in by the system-wide search utility later.

### Type normalization (imports)
`apps/web/modules/imports/controllers/drafts.ts` still defines a UI-local `LocationOption` that duplicates `InventoryLocationOption` with a `label` alias and now a `shortCode` field (added in Phase 1 of the sweep). When this utility lands:
- Delete the UI-local `LocationOption` type and consume `InventoryLocationOption` directly from `@builders/domain`.
- `apps/web/modules/imports/data/queries.ts` stops emitting the `label` alias in its `locationOptions` bag — the combobox adapter supplies the display label.

### Blast radius
- New folders + files only. One UI-local type deleted (imports `LocationOption`). Zero type changes in domain or data layers.

---

## Wire-up · inventory + imports location dropdowns

When the primitive + adapter home land:

- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — replace the raw `<select>` for Location with `<RecordCombobox>`; options fed via `modules/inventory/data/dropdown-options/inventory-location-options.toComboboxOption`. The filter-by-warehouse + disable-until-warehouse-selected behaviours are already in place (shipped in Phase 1 of the location sweep).
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` — when the `warehouseId` draft field changes, clear `draft.locationId` if the current location no longer belongs to the new warehouse. See flag F1 below for where the helper lives.
- `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx` — replace the `<RecordGridCellSelect>` for the location column with `<RecordCombobox size="compact">`. Options fed from `modules/imports/data/dropdown-options/import-location-options`. Existing warehouse filter stays.
- No route / API / domain / DB changes — purely UI wire-up consuming the option shape + the adapters.

### Blast radius
- Exactly two call sites migrate. Other dropdowns (Warehouse, Product, Category, Import Status, Transport Type) unchanged and still render via `<select>` / `RecordGridCellSelect`. Future sweeps migrate them case-by-case using the same primitive + adapter pattern.

---

## Resolved decisions (carried forward from the sweep plan)

- **R6 — Type normalization:** the UI-local `LocationOption` in `imports/controllers/drafts.ts` is deleted and replaced with domain `InventoryLocationOption`.
- **R7 — Dropdown folder location:** `apps/web/modules/shared/engines/record-view/sections/dropdowns/` (consistent with sibling `cells/`, `panels/`, `rows/`).
- **R8 — Module-level option home:** `apps/web/modules/{module}/data/dropdown-options/` (co-located with `queries.ts` + `mutations.ts`).
- **R9 — Combobox component name:** `RecordCombobox`.
- **R10 — Popover positioning:** portal to `document.body` + `position: fixed`. Dirty tracking is unaffected because it lives in React controller state.
- **R11 — Loader architecture:** per-module `data/dropdown-options/` is for code organization, not SSR parallelism. Dashboard pages already `Promise.all` their options (max wall-clock, not sum). Progressive streaming is a separate sweep (React `<Suspense>` boundaries) and not in scope here.
- **R14 — Adapter files for 2-option selects:** `RecordGridCellSelect` stays native for Import Status / Transport Type, and they don't get adapter files.

---

## Open flags

1. **F1 — `applyDefaultLocationToImportRow` → domain predicate.** The function (at `apps/web/modules/imports/controllers/drafts.ts:62-80`) encodes a domain invariant ("a location belongs to exactly one warehouse; if a draft's `locationId` isn't in the selected warehouse, clear it"), but it's currently UI-shaped (operates on `ImportInventoryRowDraft` which carries `clientId` and other UI state). Per `packages/domain/CLAUDE.md` rule 4 ("functions are pure — accept plain data, return plain data"), domain functions shouldn't take UI draft types. **Proposed split:**
   - Extract `isLocationInWarehouse(locationId: string, warehouseId: string, locations: ReadonlyArray<{ id: string; warehouseId: string }>): boolean` to `packages/domain/src/flooring/inventory/`. This is the pure invariant and is testable at the domain level.
   - Keep a draft-shaped wrapper in UI (imports + new inventory controller version) that uses the predicate to decide whether to clear `locationId`. Once both modules have wrappers, consider lifting the wrapper to `apps/web/modules/shared/` — but not before.
2. **F5 — Keyboard-navigation scope for the portalled popover.** With the popover in `document.body`, arrow-key nav + focus trapping needs to work despite the trigger being in the panel's tab order. The combobox handles this internally (listbox focus management), but worth flagging: if a second popover primitive is introduced, the `useRecordComboboxDisclosure` hook should be factored to share the portal-management bits.
3. **F6 (new) — System-wide search hook integration point.** `matchRecordComboboxOption` is reserved for this. When the shared search/filter utility lands, the combobox should consume it directly rather than each call site wiring its own predicate. Confirm the hook name + signature when that utility is being designed.

---

## Related backlog (pick these up together)

- System-wide list-view search/sort/grouping controls.
- Shared search predicate / fuzzy matcher used by both list filters and this combobox.
- Per-dropdown config for filter, sort, and visible-field behaviour — each entry in a module's `data/dropdown-options/` folder should be able to declare its own defaults (already sketched in R11's deferred-streaming discussion).
