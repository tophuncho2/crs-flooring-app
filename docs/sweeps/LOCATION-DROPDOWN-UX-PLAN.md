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

## Category A · Remove the Section tile from the inventory record view primary section

### Changes
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — delete the `<RecordFormField label="Section">` block in the left pane.
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` — stop threading `sectionName`.
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` — delete the `activeSectionName` computation and its return.
- `InventoryLocationOption.sectionNumber` stays in domain — harmless, potentially useful for future grouping/search.

### Blast radius
- Three files in the inventory module. No domain, no DB, no route changes. Zero downstream consumers of `activeSectionName`.
- **Out of scope unless confirmed.** The inventory list view still has a "Section" column (`inventory-client.tsx:53`, `inventory-table.tsx:107`). Plan-default: leave it in the list view. See open flags.

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
- `apps/web/modules/inventory/components/list/inventory-client.tsx` + `inventory-table.tsx` — location column + cell read `row.locationShortCode`. Column label stays "Location".
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — dropdown option labels use `shortCode`. Add a new read-only **"Full Location"** tile in the left pane showing `selectedLocation.locationCode` (full code).
- `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx` — dropdown option labels use `shortCode`. Grid does **not** get a separate full-code field; warehouse column already supplies warehouse context. See open flags if you want it added.

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
- Implementation choice: native positioning inside the record panel (no portal) to avoid z-index fights with the dirty-section mechanics of `RecordMultiSectionPanel`. If positioning complications arise, fall back to a portal keyed to the panel root.

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

### Blast radius
- New folders + files only. Zero type changes in domain or data layers. Each module's existing `data/queries.ts` still returns the same option bags; the new files are thin UI-side adapters consuming those bags.

---

## Category E · Wire inventory + imports location dropdowns into the combobox

- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — replace the raw `<select>` for Location with `<RecordCombobox>`; options fed via `modules/inventory/data/dropdown-options/inventory-location-options.toComboboxOption`. Add the "Full Location" tile introduced in Category B.
- `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx` — replace the `<RecordGridCellSelect>` for the location column with `<RecordCombobox size="compact">`. Options fed from `modules/imports/data/dropdown-options/import-location-options`.
- No route / API / domain / DB changes — purely UI wire-up consuming the Category B option shape + the Category D adapters.

### Blast radius
- Exactly two call sites migrate. Other dropdowns (Warehouse, Product, Category, Import Status, Transport Type) unchanged and still render via `<select>` / `RecordGridCellSelect`. Future sweeps can migrate them case-by-case using the same primitive + adapter pattern.

---

## Execution order (low → high risk)

1. **Category A** — Section tile removal. Purely deletive, three module files. Leaves a green baseline.
2. **Category B** — Location short/full split: domain + data + UI cascade. Foundation for C and E.
3. **Category D** — Create per-module `data/dropdown-options/` folders + adapter files. Structural prep, no behaviour change.
4. **Category C** — Build `RecordCombobox` primitive in shared engines (no consumers yet).
5. **Category E** — Migrate the two location dropdowns (inventory + imports) to `RecordCombobox` using the adapters from D.

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

## Open flags for confirmation

1. **Section list column.** The "Section" column in the inventory list view is currently separate from this sweep. Plan-default: **keep it**. Say otherwise if you want it dropped alongside the record-view tile.
2. **Full-Location in the imports grid.** Plan-default: **no separate full-code field inside the imports grid row** (warehouse column + the location cell's short form is enough). Flag if you'd rather see both.
3. **Folder location for `dropdown-options/`.** Plan-default: under `data/` (co-located with `queries.ts` + `mutations.ts`). Alternative: under `components/` as a pure UI-adapter layer. Pick one so it's consistent across modules going forward.
4. **Component name.** Plan-default: `RecordCombobox`. Alternatives considered: `RecordSearchSelect`, `RecordDropdown`. Pick the name we'll standardize on.
