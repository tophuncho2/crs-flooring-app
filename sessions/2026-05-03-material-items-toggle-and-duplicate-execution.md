# Material Items: section toggle + shared duplicate-row package · Execution Summary

Plan: `~/.claude/plans/analyze-the-modules-work-orders-director-abstract-treasure.md`
Branch: `staging`
Status: **executed** · awaiting browser smoke test · not committed

## What changed

Two scoped UI improvements on the work-orders Material Items surface, planned as two separate commits:

**Commit A — Section-level expand/collapse toggle replaces per-row chevron**
- New `leadingControl` slot on `ActionHeader` (top-left of the header row, before the title).
- Material Items section header renders `ExpandToggle` in that slot when there are items.
- 2-state behavior: collapse-all when every row is expanded; expand-all otherwise.
- Per-row chevron + the leading expand control column on the grid are removed entirely.
- `expandedRowIds: Set<string>` state remains; it still drives cut-log sub-grid visibility per row.

**Commit B — Shared `duplicate-row` feature package; Material Items consumer**
- New package at `apps/web/components/features/duplicate-row/` (mirrors the `cut-log-row` precedent: pure UI, no module imports, named exports only).
- Exports `buildDuplicatedRow<TForm>(source, { copy, defaults })` (pure helper) and `DuplicateRowButton` (icon button wrapping `RowActionButton` + an inline copy SVG).
- Material Items controller gets `duplicateItem(sourceItemId)`; copies `productId` + `categoryFilterId`, blanks `quantity` + `notes`, appends as a new local row that flows through the existing diff/save path.
- Per-row Duplicate button renders beside the X delete in the trailing-control cell. Trailing control widens from 64 → 116 px.

## Files

| Commit | Action | Path |
|---|---|---|
| A | Modify | `apps/web/components/headers/action-header.tsx` |
| A | Modify | `apps/web/modules/work-orders/components/record/material-items/material-items-section-header.tsx` |
| A | Modify | `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx` |
| B | Create | `apps/web/components/features/duplicate-row/build-duplicated-row.ts` |
| B | Create | `apps/web/components/features/duplicate-row/duplicate-row-button.tsx` |
| B | Create | `apps/web/components/features/duplicate-row/index.ts` |
| B | Modify | `apps/web/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section.ts` |
| B | Modify | `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx` |

## Per-file change notes

### Commit A

**`components/headers/action-header.tsx`** — Added optional `leadingControl?: ReactNode` prop. Wrapped the title in a `flex items-center gap-2` row that renders `leadingControl` flush-left of the title text (only when either is provided). Existing consumers pass no `leadingControl` and render unchanged.

**`modules/work-orders/.../material-items-section-header.tsx`** — Added three props (`allExpanded`, `onToggleAll`, plus the `itemsCount`-derived empty guard). Wires an `ExpandToggle` (reused from `apps/web/components/grid/expandable-rows/expand-toggle.tsx`) into the new `leadingControl` slot, only rendered when `itemsCount > 0`.

**`modules/work-orders/.../work-order-material-items-section.tsx`** — Dropped `leadingControls: [{ key: "expand", … }]` from `WORK_ORDER_MATERIAL_ITEMS_LAYOUT`. Removed the `if (control.kind === "expand")` branch in `renderParentControl`. Replaced the per-row `toggleExpanded` helper with a derived `allExpanded` flag and `toggleAll` callback (using `useCallback`). Passes both into the section header.

### Commit B

**`components/features/duplicate-row/build-duplicated-row.ts`** — `DuplicateRowConfig<TForm>` type + `buildDuplicatedRow<TForm extends object>(source, config)` pure helper. Produces a new object by copying selected keys from `source` and filling everything else from `config.defaults`.

**`components/features/duplicate-row/duplicate-row-button.tsx`** — `DuplicateRowButton` wraps `RowActionButton` with `tone="neutral"` and an inline copy-glyph SVG (matches project icon convention; no lucide). Honors `EditabilityContract`.

**`components/features/duplicate-row/index.ts`** — Barrel; named exports only.

**`modules/work-orders/.../use-work-order-material-items-section.ts`** — Added `duplicateItem(sourceItemId)` next to `removeItem`. Builds the duplicated form via `buildDuplicatedRow`, mints a new temp local id via the existing `createLocalRecordRowId("work-order-material-item")`, appends to the items array. Exports `duplicateItem` from the hook's return.

**`modules/work-orders/.../work-order-material-items-section.tsx`** — Imports `DuplicateRowButton` from `@/components/features/duplicate-row`. Trailing-control `width: 64` → `width: 116`. The `actions`-kind branch now renders BOTH buttons in a `flex items-center gap-1` wrapper: `DuplicateRowButton` (neutral) followed by the existing `RowActionButton` (destructive, X).

## Reused primitives — no new ones invented

| Need | Reused |
|---|---|
| Toggle button (header + previously per-row) | `apps/web/components/grid/expandable-rows/expand-toggle.tsx` |
| Generic row-action button | `apps/web/components/cells/row-action-button.tsx` |
| Editability contract | `apps/web/components/grid/contracts/grid-editability.ts` |
| Local row id factory | `apps/web/controllers/record/utils/record-row-ids.ts` |
| Section header chrome | `apps/web/components/headers/action-header.tsx` (extended with `leadingControl`) |

## Verification

| Check | Result |
|---|---|
| `tsc -p apps/web/tsconfig.json --noEmit` | **clean** (no output) |
| `eslint` on Commit A files | **clean** |
| `eslint` on Commit B files | **clean** |
| Browser smoke (Chrome MCP) | **not run** — manual checklist below |

### Manual smoke checklist

**Commit A**
1. Open a work order with several material items.
2. Top-left of the Material Items section card now shows a chevron toggle.
3. Click it → all rows expand together; each cut-log sub-grid renders.
4. Click again → all collapse together.
5. Per-row chevron at the row's left edge is gone.
6. With zero material items, no toggle is rendered in the header.

**Commit B**
1. With at least one saved material item, click the new Duplicate icon (left button in the trailing control).
2. A new row appears at the end of the grid with the same product + category filter pre-set, blank quantity + blank notes.
3. Save Material Items → the duplicate persists; both rows survive a reload.
4. Discard before saving → the duplicate is dropped.
5. The X delete button still works on both old and new rows.
6. While Save is in flight, both Duplicate and X are disabled (the existing `editable` guard).

## Suggested commit messages

**Commit A:**
```
ui(work-orders/material-items): section toggle replaces per-row chevron

- Add leadingControl slot to ActionHeader.
- Wire a section-level ExpandToggle in MaterialItemsSectionHeader that
  expands/collapses all rows together.
- Drop the leading expand control column from the material-items grid;
  keep expandedRowIds as the source of truth for cut-log sub-grid
  visibility.
```

**Commit B:**
```
ui(components/features): add duplicate-row package; wire into Material Items

- New apps/web/components/features/duplicate-row/ — buildDuplicatedRow
  generic helper + DuplicateRowButton (RowActionButton + copy icon).
- Material Items section gains a per-row Duplicate button beside delete;
  copies productId + categoryFilterId, blanks quantity + notes, follows
  the existing diff/save path.
```

## Out-of-scope follow-ups

- No keyboard shortcut for Duplicate (e.g. cmd-D on focused row).
- No confirmation dialog on Duplicate (reversible via Discard / Remove).
- No menu-style row-action dropdown — two adjacent buttons is the right level for now.
- WO cut-log section is untouched.
- Section toggle defaults to "all collapsed" on first render; no auto-expand for small N.
