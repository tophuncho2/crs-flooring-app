# Rich Dropdown Package — Plan

## Context

Today's grid cells use `DropdownCell` → `SelectDropdown` for single-pick selection. That works for one-dimensional pickers. It does **not** scale to:

- **WO material items**: pick a Category, then a Product filtered by that Category.
- **WO cut-logs**: filter Inventory by Section AND/OR Location, then pick the Inventory row.
- **(Future, out of scope here)** Management Company → Property → Template chain.

Step 6 of the prior sweep tried to cram Section + Location + Clear into the 240px Inventory cell. The result is cramped and the row blows past the viewport, making horizontal scroll feel broken. Step 5 tried to gate the Product cell behind Category and ended up hiding it when blank.

The right shape is a **single icon-trigger column** that opens a wide kanban-style panel — multiple filter sections on the left, the actual selection on the right. The same panel primitive serves both the WO material-item picker and the WO cut-log picker today (and the management-co/property/template flow later, with a 3-tier variant).

This plan stages the work in phases so the grid cells get their `RichPickerCell` before any server-side concerns.

## Hard scope (this plan)

1. UI primitives for the rich dropdown panel (kanban-style, configurable sections).
2. Controller hooks that own the panel's open/close state, per-section filter values, and the resolved selection.
3. Two consumers: WO material-items (Category → Product) and WO cut-logs (Section/Location → Inventory).
4. Per-instance configuration: each consumer declares its sections + which sections gate which.

## Out of scope (explicitly deferred)

- **Server-side search.** Everything is client-side over the seeded option arrays for now. Server-side search lands once mutations are solid + categories are cached.
- **Management-co / property / template variant.** The package is designed to support a 3-tier select-row variant later but we won't build or apply it now.
- **Caching strategy** for seeded options (categories, job types, UoMs). Separate sweep.
- **Solidifying WO material-item mutations.** Pre-req for server-side search but not for this UI work.

## Folder layout (no cramming, all new files)

### Components — `apps/web/components/rich-dropdowns/`

A new bucket sibling to `dropdowns/`. `dropdowns/` is for primitives (SelectDropdown, SearchDropdown). `rich-dropdowns/` is the composite layer — a panel that orchestrates multiple primitives.

```
apps/web/components/rich-dropdowns/
├── contracts/
│   ├── index.ts
│   ├── rich-picker-section.ts        # PickerSection<TOption> contract
│   ├── rich-picker-config.ts         # PickerConfig (sections, gating rules, layout)
│   └── rich-picker-result.ts         # PickerResult shape (selected ids per section)
├── rich-picker-cell.tsx              # Grid-cell trigger (icon + summary text)
├── rich-picker-panel.tsx             # The kanban panel (renders sections + selection col)
├── rich-picker-section.tsx           # One vertical column inside the panel
├── rich-picker-search-bar.tsx        # Per-section search input
├── rich-picker-option-list.tsx       # Scrollable option list (single + multi-select)
└── index.ts
```

Discipline (per `apps/web/components/CLAUDE.md`):
- Pure UI primitives. No imports from modules.
- Every primitive accepts `editable: boolean`.
- No baked-in chrome — consumer provides container.
- `contracts/` holds types only, no JSX.

### Controllers — `apps/web/controllers/rich-dropdowns/`

A new bucket mirroring the components bucket (per the controllers convention).

```
apps/web/controllers/rich-dropdowns/
├── use-rich-picker.ts                # Top-level controller per cell instance
├── use-rich-picker-section.ts        # Per-section filter + search state
└── index.ts
```

### Module-specific configurations

The panel is configurable, but each consumer needs a small adapter that wires its options + gating rules. These live in the module, NOT in the shared package:

**Work orders — material items (Category → Product):**
```
apps/web/modules/work-orders/components/record/material-items/pickers/
├── product-picker-cell.tsx           # Wraps RichPickerCell with category+product config
└── index.ts
```

**Work orders — cut logs (Section/Location → Inventory):**
```
apps/web/modules/work-orders/components/record/material-items/pickers/
├── inventory-picker-cell.tsx         # Wraps RichPickerCell with section/location/inventory config
└── (shares the pickers/ folder above)
```

The `pickers/` folder is the canonical home for module-specific picker adapters. New module-level bucket — keeps the section + row component files clean per "we will not cram current files."

## Architecture sketch

### `PickerSection<TOption>` contract

```ts
type PickerSection<TOption> = {
  key: string                                // stable id ("category", "product", "section", "location", "inventory")
  label: string                              // "Category", "Product", etc.
  kind: "filter" | "selection"               // filter narrows; selection is the value the cell holds
  loadOptions: () => ReadonlyArray<TOption>  // client-side resolver (server-side later)
  searchPlaceholder?: string
  // Gating: this section is enabled only when these other section keys have a value.
  enabledWhen?: ReadonlyArray<string>
  // For filter sections: clearing a downstream gating filter should also reset
  // the selection ("changing Category clears Product").
  clearsOnUpstreamChange?: boolean
}
```

### `PickerConfig`

```ts
type PickerConfig<TOption> = {
  sections: ReadonlyArray<PickerSection<TOption>>
  // The single "selection" section's key — its current value is what the cell stores.
  selectionKey: string
  // Cell's display label given the selected option (e.g. product label).
  formatCellLabel: (selectedOption: TOption | null) => string
  // Optional: cell's icon when no selection.
  emptyIcon?: ReactNode
  // Optional: explicit panel size override (default: w=720px, h=480px).
  panelWidth?: number
  panelHeight?: number
}
```

### Behavior rules

- **Panel layout** — vertical kanban: each section is a column. Filter sections render before the selection section. Width auto-flexes; default size larger than current dropdowns (~720×480) so options aren't cut off at the bottom of the screen.
- **Filter selected → collapses to the picked option** (per user vision: "once option is selected its the only one that shows"). A small "× Change" affordance reopens the section.
- **Selection section never disappears.** If upstream filters aren't satisfied, it renders disabled with an empty list and a muted "—" placeholder. No "pick a category first" copy.
- **Cell trigger** — icon-only button with optional summary text. Clicking opens the panel. Re-click or ESC closes.
- **Each section owns its own search state** via `useRichPickerSection`. Top-level `useRichPicker` aggregates and exposes the panel-open state + the resolved selection.
- **No persistence** of filter values across panel close/reopen by default. Consumers can opt in via a config flag if needed (not in scope for v1).

### Grid integration

`RichPickerCell` slots into a single data column in the grid. Its width is the column's width. The panel pops out and is positioned by the underlying primitive (likely `SidePanel` or a new `Popover`). It does NOT inflate the row.

## Phased delivery

| Phase | Deliverable | Files | Verification |
|-------|-------------|-------|--------------|
| 1 | Contracts + primitive shells (no logic) | `components/rich-dropdowns/contracts/*`, primitive files with empty bodies + props | `pnpm typecheck` green |
| 2 | Controller hooks (`useRichPicker`, `useRichPickerSection`) | `controllers/rich-dropdowns/*` | typecheck + a tiny unit-style render in a sandbox page (or just typecheck) |
| 3 | Panel UI rendering + option-list rendering + search | full impl of primitives | render in isolation in a Storybook-style sandbox if it exists, else inline preview |
| 4 | `ProductPickerCell` + replace Category + Product columns in WO material items with a single `product` column | `pickers/product-picker-cell.tsx` + edit `work-order-material-items-section.tsx` layout | dev-server smoke: pick category → product list filters → pick product → save → reload shows the product label |
| 5 | `InventoryPickerCell` + replace Section/Location/Inventory in WO cut-logs with a single `inventory` column | `pickers/inventory-picker-cell.tsx` + edit `cut-log-row-layout.ts` + `work-order-cut-log-row.tsx` | dev-server smoke: open panel → filter by section → pick inventory → row commits |
| 6 | Cleanup — drop unused `sectionFilterCode`/`locationFilterCode`/`categoryFilterId` if no other consumer uses them | controller types + state | typecheck |

Phases 1–3 are pure infrastructure (no consumer impact). Phases 4–5 each replace columns in one consumer; both shrink the cut-log row's column count significantly, fixing the scroll/width issue along the way. Phase 6 is bookkeeping.

Each phase is a commit boundary.

## Open questions

1. **Panel anchor primitive** — is there a `Popover` primitive already, or do we adapt `SidePanel` (which slides in from a screen edge)? A row-anchored popover is a different shape than a side panel. If neither exists, we add `apps/web/components/popovers/` as another new bucket. **Need answer before Phase 1.**
2. **Cell width when nothing selected** — the panel-trigger cell needs a sensible empty-state width. Current Inventory column is 240px / Product is 220px. Picker cell can probably match the existing column widths. Confirm before Phase 4.
3. **Multi-WOMI category cache** — when 50 material-items each open a Product picker, we don't want each one to recompute a 10k-product filter list. The controller should accept memo'd `loadOptions`. Implementation detail; flag here so we don't forget.
4. **Search input — case-insensitive substring vs fuzzy?** Default to case-insensitive substring; can swap later. Confirm.
5. **Panel positioning when near screen edges** — auto-flip up vs scroll-into-view. Use a small util or rely on a CSS-only approach. Decide in Phase 3.

## What this plan does NOT touch

- Any other module's pickers (contacts, inventory list, etc.).
- The 3-tier mgmt-co/property/template variant.
- Any server-side search or caching.
- The cut-log SSR snapshot finalize bug (still deferred to its own sweep).
- The work-orders production v1 audit.

## Pre-requisites before starting Phase 1

- Confirm answers to open questions 1 + 2.
- Confirm the user wants this delivered as a single multi-commit PR, or split into "package" + "consumer adoption" PRs.
