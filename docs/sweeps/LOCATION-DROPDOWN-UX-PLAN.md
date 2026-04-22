# Sweep plan — inventory location display split + canonical combobox dropdown

Scoped to **inventory** and **imports** modules. Five categories, each independently shippable, ordered low-→high risk. Blast radius is called out per category. Prisma migrations: **none**.

Sibling of `CURRENT.PLAN.md` (the per-row `isImported` sweep); runs after that sweep is merged, because step B touches the same `InventoryRow` / `ImportInventoryRow` shapes.

---

## Context

Three UX complaints motivate this sweep:

1. The **Section field** on the inventory record view's main section is redundant — the location dropdown already encodes section + rafter + level, and the warehouse tile already conveys warehouse context.
2. The **location column / cell / dropdown** everywhere currently renders the full `W{n}-S{n}-R{n}-L{n}` code. That's noisy in a dense grid and redundant with the separate warehouse context. The user wants the location cell to show only `R{n}-L{n}` and a separate field/tile to show the full code for the selected location.
3. The **native `<select>`** used for location (and most other module dropdowns) has no search affordance. Options scale poorly. The user wants one canonical dropdown UI with an optional search bar — drop-in for dropdowns with more than a couple of options, while tiny 2-option selects (Import Status, Transport Type) stay native.

This plan also establishes a **per-module home for dropdown-option adapters**, so each module that owns a dropdown type (locations, products, warehouses, categories…) has a predictable place for the adapter file that maps the domain option type → the canonical combobox-option shape.

---

## Grounded survey (what's in the repo today)

- **Domain option type.** `packages/domain/src/flooring/inventory/types.ts:116` — `InventoryLocationOption { id, warehouseId, locationCode, sectionNumber, warehouseName }`. `locationCode` is the full `W{n}-S{n}-R{n}-L{n}` string, produced by `formatFullLocationCode` in `packages/domain/src/flooring/inventory/formatters.ts:30`.
- **DB normalizers.**
  - `packages/db/src/flooring/inventory/read-repository.ts:50` — `buildLocationCode` calls the domain formatter; `listInventoryOptions` at line 310 pre-computes `locationCode` for every option.
  - `packages/db/src/flooring/imports/read-repository.ts:54` — `formatImportLocationCode` is a local duplicate of the same formula (hasn't adopted the domain helper); options pre-compute at line 263.
- **UI consumers of the full code.**
  - Inventory list column + cell: `inventory-client.tsx:54` and `inventory-table.tsx:112` show `row.locationCode`.
  - Inventory primary section `<select>` option labels: `inventory-primary-fields-section.tsx:149` renders `{location.locationCode}`.
  - Imports inventory-rows grid `<RecordGridCellSelect>`: `import-inventory-rows-section.tsx` renders `{location.label}`, where `label = location.locationCode` from `modules/imports/data/queries.ts:121`.
- **Section field on the record view.** `inventory-primary-fields-section.tsx` renders a dedicated "Section" tile wired to `activeSectionName`, computed in `use-inventory-primary-section.ts` from `selectedLocation.sectionNumber ?? record.sectionNumber`.
- **Dropdown primitives available today.** Two shallow wrappers only — `RecordGridCellSelect` (thin styled native `<select>`, `modules/shared/engines/record-view/sections/cells/record-grid-cell-select.tsx`) and raw `<select>` with `RECORD_FIELD_CONTROL_CLASS_NAME`. **No combobox / searchable dropdown anywhere.**
- **Per-module options home today.** Nothing canonical. Option types live in domain; they're loaded by DB repo helpers, re-surfaced by `data/queries.ts` bags, and consumed inline by UI components. Inventory and imports both follow this pattern.

---

## Category A · Remove redundant static cells (section + import status)

### A.1 · Section tile (inventory record view)
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — delete the `<RecordFormField label="Section">` block in the left pane.
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` — stop threading `sectionName`.
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` — delete the `activeSectionName` computation and its return.
- `InventoryLocationOption.sectionNumber` stays in domain — harmless, potentially useful for future grouping/search.

### A.2 · Import Status tile (inventory record view, per R15)
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — delete the `<RecordFormField label="Import Status">` block. Drop the `formatImportedAsStatus` import if no remaining usage in this file.
- Rationale: the tile is read-only; status is only editable from the imports inventory-rows section.

### A.3 · Import Status column (inventory list view, per R15)
- `apps/web/modules/inventory/components/list/inventory-client.tsx` — delete the `status` column definition.
- `apps/web/modules/inventory/components/list/inventory-table.tsx` — delete the `status` cell renderer. Drop `StatusPill`, `getImportedStatusFieldClass`, and `formatImportedAsStatus` imports if no remaining usage in this file.

### Blast radius
- Five files in the inventory module. No domain, no DB, no route changes. Zero downstream consumers of `activeSectionName`.
- The inventory list view's "Section" column (`inventory-client.tsx`, `inventory-table.tsx`) stays (locked by R1).

---

## Category B · Split location code into SHORT (`R{n}-L{n}`) + FULL (`W{n}-S{n}-R{n}-L{n}`)

### Domain
- New formatter in `packages/domain/src/flooring/inventory/formatters.ts`:
  ```ts
  export function formatLocationRafterLevel(input: { rafter: number; level: number }): string {
    return `R${input.rafter}-L${input.level}`
  }
  ```
  Auto-exported via the inventory barrel.
- `InventoryLocationOption` gains `shortCode: string` (full `locationCode` kept for compatibility).
- `InventoryRow` gains `locationShortCode: string`.
- `ImportInventoryRow` gains `locationShortCode: string`.
- Imports domain adopts `formatFullLocationCode` from the inventory domain — drop the duplicated local helper in the imports normalizer so there's one source of truth for the full format.

### Data
- `packages/db/src/flooring/inventory/read-repository.ts` — normalizer emits `locationShortCode`; `listInventoryOptions` sets both `locationCode` (full) and `shortCode`.
- `packages/db/src/flooring/imports/read-repository.ts` — normalizer emits `locationShortCode` via `formatLocationRafterLevel`; `formatImportLocationCode` deleted in favour of `formatFullLocationCode`.
- `apps/web/modules/imports/data/queries.ts` — the `getImportFormOptions` location loader threads `shortCode` into the bag passed to the UI.

### UI
- `apps/web/modules/inventory/components/list/inventory-client.tsx` + `inventory-table.tsx` — existing Location column + cell read `row.locationShortCode`. Column label stays "Location". Add a second column `fullLocation` reading `row.locationCode` (full `W{n}-S{n}-R{n}-L{n}`), `defaultHidden: true` — follows the existing `cost` / `freight` / `notes` hidden-by-default pattern and is toggleable via the columns manager.
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — dropdown option labels use `shortCode`. Add a new read-only **"Full Location"** tile in the left pane showing `selectedLocation.locationCode` (full code). "Full Location" is the canonical label everywhere — the plan no longer references "full warehouse code".
- `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx` — dropdown option labels use `shortCode`. Grid does **not** get a separate full-code field; the import's top-level warehouse plus the short code in the location cell is sufficient.

### Blast radius
- Domain: +2 fields, +1 formatter. Additive, non-breaking.
- Data: 2 normalizer functions + 2 option emitters touched. **No Prisma schema change.**
- Web: 4 UI touch-points (list cell, list column config, inventory primary section, imports grid).
- Test fixtures under `apps/web/tests/**` may need an added `locationShortCode` field for hygiene. `tsconfig.json` excludes `tests/` so no typecheck pain.
- Any external parser of `row.locationCode` still gets the full form (unchanged).

---

## Category C · Canonical search-capable combobox primitive (shared engine)

### New primitive
Location: `apps/web/modules/shared/engines/record-view/sections/dropdowns/` (new subfolder).

File: `record-combobox.tsx`.

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
- Popover contents: header **search input** (plain `<input>`, bound to local state, filtering intentionally **stubbed**, clearly marked as deferred to the future table-controls + search sweep), then a scrollable option list.
- Keyboard: `Esc` closes, `Enter` selects focused, `↑/↓` navigate, `Tab` closes.
- ARIA: `combobox` role on trigger, `listbox` on panel.

### Positioning (and why it is orthogonal to dirty tracking)
- **Dirty-state tracking is unaffected by DOM position.** Dirty tracking is React state driven by `useRecordScopedSectionController` — selection fires `onChange` → controller updates its draft → section becomes dirty. This is identical to how `<select>` works today and remains true whether the popover is rendered inline or portalled. Dropdown changes join dirty tracking / local-change-pre-save the same way every other field does.
- **The real risk is clipping, not state.** A popover absolutely positioned inside the trigger's parent is clipped by ancestor `overflow-hidden` (`sections/structure/record-section-tokens.ts:12` on section items) and the grid's `overflow-x-auto` horizontal scroller (`sections/rows/record-section-grid.tsx:47`). Inventory primary section is safe inline; the imports inventory-rows grid is not.
- **Decision:** render the popover via a document-level portal (to `document.body`) with `position: fixed` positioning computed from the trigger's `getBoundingClientRect()`. Close on outside click, outside scroll, and `Esc`. Controller-side state is unchanged; only the popover DOM escapes the clipping ancestors. If we later measure that inline positioning is safe for the inventory primary section, we can add an `inline` escape hatch — but portal-first keeps a single code path.

### Shared helpers
- `useRecordComboboxDisclosure()` — open/close + focus-management hook.
- `matchRecordComboboxOption(option, query)` — pure predicate reserved for future search wiring. Signature written, body is `() => true` for now.

### Optional adoption
- `RecordGridCellSelect` stays for ≤2-option dropdowns (Import Status, Transport Type). Combobox is opt-in per call site.

### Blast radius
- New code only, 3–5 new files. Zero existing consumers touched.
- Accessibility + keyboard nav are the primary complexity. Search stub is inert so has zero runtime behaviour to test.

---

## Category D · Per-module dropdown-options home

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
├── import-location-options.ts        — re-export LocationOption draft type + mapper
├── import-product-options.ts         — re-export + mapper (future migration)
├── import-warehouse-options.ts       — re-export + mapper (future migration)
└── index.ts
```

### Each file exports three things
1. The domain option type (`export type {...} from "@builders/domain"`).
2. `toComboboxOption(option) => { value, label, searchText, meta }` — the shape `RecordCombobox` accepts.
3. (Reserved) `matchComboboxOption(option, query)` — stub for future search. Returns `true` for now.

### Type normalization (imports)
- `apps/web/modules/imports/controllers/drafts.ts:23` currently defines a UI-local `LocationOption` that duplicates `InventoryLocationOption` with a redundant `label` alias. As part of this category, delete the UI-local type and consume `InventoryLocationOption` directly from `@builders/domain`. `modules/imports/data/queries.ts` stops emitting the `label` alias in its `locationOptions` bag — the combobox adapter supplies the display label.

### Blast radius
- New folders + files only. One UI-local type deleted (imports `LocationOption`). Zero type changes in domain or data layers. Each module's existing `data/queries.ts` still returns the same option bags (minus the `label` alias for imports); the new files are thin UI-side adapters consuming those bags.

---

## Category E · Wire inventory + imports location dropdowns into the combobox

- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — replace the raw `<select>` for Location with `<RecordCombobox>`; options fed via `modules/inventory/data/dropdown-options/inventory-location-options.toComboboxOption`. **Filter options by `draft.warehouseId`** (mirroring `import-inventory-rows-section.tsx:103-105`) so only locations in the selected warehouse show. Add the "Full Location" tile introduced in Category B.
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` — when the `warehouseId` draft field changes, clear `draft.locationId` if the current location no longer belongs to the new warehouse. This mirrors `applyDefaultLocationToImportRow` in `apps/web/modules/imports/controllers/drafts.ts:62-80`. Lift that helper to a shared location-draft utility once we have a second consumer (see flag F1 below).
- `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx` — replace the `<RecordGridCellSelect>` for the location column with `<RecordCombobox size="compact">`. Options fed from `modules/imports/data/dropdown-options/import-location-options`. Existing warehouse filter stays.
- No route / API / domain / DB changes — purely UI wire-up consuming the Category B option shape + the Category D adapters.

### Blast radius
- Exactly two call sites migrate. Other dropdowns (Warehouse, Product, Category, Import Status, Transport Type) unchanged and still render via `<select>` / `RecordGridCellSelect`. Future sweeps can migrate them case-by-case using the same primitive + adapter pattern.

---

## Execution order

### Phase 1 — shipping now (no new primitives, native `<select>` stays)
1. **Category A** — Section tile + Import Status tile/column removal (A.1 + A.2 + A.3).
2. **Category B** — Location short/full split: domain + data + UI cascade (list column, hidden full column, record-view tile, option labels via `label = shortCode`).
3. **Bonus (from Category E):** disable inventory record view location `<select>` until a warehouse is chosen (R13 / F3). One-line controller change + one attribute on the `<select>`.

### Phase 2 — backlog (dropdown design)
4. **Category D** — Create per-module `data/dropdown-options/` folders + adapter files. Normalize UI-local `LocationOption` in `imports/controllers/drafts.ts` onto domain `InventoryLocationOption`.
5. **Category C** — Build `RecordCombobox` primitive in `modules/shared/engines/record-view/sections/dropdowns/`.
6. **Category E** — Migrate the two location dropdowns (inventory + imports) to `RecordCombobox` using the adapters from D. Extract `isLocationInWarehouse` predicate to domain; refactor `applyDefaultLocationToImportRow` + add the inventory equivalent (clear `locationId` on warehouse change).

Each step is a standalone commit. You can pause at any boundary.

---

## Verification gates

- `@builders/{domain,db,application}` build clean after each step.
- `@builders/web` typecheck baseline holds (inventory + imports files must remain at zero errors; only pre-existing work-orders/admin errors remain).
- Regression greps:
  - After B: `grep -rn "locationCode" apps/web/modules/inventory apps/web/modules/imports` → zero hits in list cells and dropdown labels (migrated to `shortCode` / `locationShortCode`); full code appears only in the new tile.
  - After A: `grep -rn "activeSectionName\|sectionName" apps/web/modules/inventory` → only the list-view references remain (if kept per open flag).
- Dev smoke:
  - Inventory list shows `R{n}-L{n}` in the Location column; a new inventory record has the Full Location tile showing `W{n}-S{n}-R{n}-L{n}`.
  - Inventory record view Location combobox opens, search bar appears but is inert, keyboard navigation works, selecting an option stamps both the short form in the cell and the full form in the Full Location tile.
  - Imports inventory-rows section location cell shows `R{n}-L{n}`; combobox behaves identically.
  - Save → record-view reconciles with updated location fields.

---

## Resolved decisions (from user review)

These were open flags in the prior revision. Locked in here so the plan body is the single source of truth.

- **R1 — Section column in inventory list view:** keep it.
- **R2 — Full-Location column in inventory list view:** add it as `defaultHidden: true` (toggleable via the columns manager). Not a separate concern from Category B; baked into the UI bullet above.
- **R3 — Full-Location in the imports grid row:** do **not** add. The import's top-level warehouse plus the short code in the location cell is enough.
- **R4 — Inventory record view location dropdown:** filter by `draft.warehouseId`; clear `locationId` when warehouse changes so a stale location can't survive a warehouse switch (Category E).
- **R5 — Terminology:** the full `W{n}-S{n}-R{n}-L{n}` string is always "Full Location". Drop any "full warehouse code" phrasing.
- **R6 — Type normalization:** the UI-local `LocationOption` in `imports/controllers/drafts.ts` is deleted and replaced with domain `InventoryLocationOption` (Category D).
- **R7 — Dropdown folder location:** `apps/web/modules/shared/engines/record-view/sections/dropdowns/` (consistent with sibling `cells/`, `panels/`, `rows/`).
- **R8 — Module-level option home:** `apps/web/modules/{module}/data/dropdown-options/` (co-located with `queries.ts` + `mutations.ts`).
- **R9 — Combobox component name:** `RecordCombobox`.
- **R10 — Popover positioning:** portal to `document.body` + `position: fixed`. Dirty tracking is unaffected because it lives in React controller state.
- **R11 — Loader architecture:** per-module `data/dropdown-options/` is for code organization, not SSR parallelism. Dashboard pages already `Promise.all` their options (max wall-clock, not sum). Progressive streaming is a separate future sweep (React `<Suspense>` boundaries) and not in scope here.
- **R12 — Full-Location list column key + label:** `{ key: "fullLocation", label: "Full Location", defaultHidden: true, groupable: true }` (resolves F2).
- **R13 — Inventory record view location `<select>` when no warehouse is selected:** disabled with placeholder "Select warehouse first" (resolves F3). Imports grid keeps its current behaviour (warehouse always present on the import row, so the edge case rarely surfaces).
- **R14 — Adapter files for 2-option selects:** no — `RecordGridCellSelect` stays native for Import Status / Transport Type, and they don't get adapter files (resolves F4).
- **R15 — Import Status cell removal from inventory:** delete both the record-view tile and the list-view column. Status is read-only from the inventory module; editing lives exclusively on the imports inventory-rows section.

---

## Open flags / questions (Phase 2)

All Phase 1 flags are resolved (see R12–R15). The remaining flags only apply when Phase 2 is picked up.

1. **F1 — `applyDefaultLocationToImportRow` → domain predicate.** The function (at `apps/web/modules/imports/controllers/drafts.ts:62-80`) encodes a domain invariant ("a location belongs to exactly one warehouse; if a draft's `locationId` isn't in the selected warehouse, clear it"), but it's currently UI-shaped (operates on `ImportInventoryRowDraft` which carries `clientId` and other UI state). Per `packages/domain/CLAUDE.md` rule 4 ("functions are pure — accept plain data, return plain data"), domain functions shouldn't take UI draft types. **Proposed Phase 2 split:**
   - Extract `isLocationInWarehouse(locationId: string, warehouseId: string, locations: ReadonlyArray<{ id: string; warehouseId: string }>): boolean` to `packages/domain/src/flooring/inventory/`. This is the pure invariant and is testable at the domain level.
   - Keep a draft-shaped wrapper in UI (imports + new inventory controller version) that uses the predicate to decide whether to clear `locationId`. Once both modules have wrappers, consider lifting the wrapper to `apps/web/modules/shared/` — but not before. Confirm split is acceptable.
2. **F5 — Keyboard-navigation scope for the portalled popover.** With the popover in `document.body`, arrow-key nav + focus trapping needs to work despite the trigger being in the panel's tab order. The combobox handles this internally (listbox focus management), but worth flagging: if you ever introduce a second popover primitive, the `useRecordComboboxDisclosure` hook should be factored to share the portal-management bits.
