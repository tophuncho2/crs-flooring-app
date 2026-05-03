# Cut Log Side Panel — A-Class Single-Row Editor

## Context

Current per-row inline editing for work-order cut logs is brittle:
- Cells are cramped (Section/Location/Clear filters jammed into a 240px Inventory column)
- Circular commit button is non-canonical and ugly
- Edit-mode is implicit + auto-discards on click-off — confusing
- Per-row selection checkbox + section-level "Select All Eligible" + "Finalize Selected" couples editing with finalization
- Cut-log row is ~1700px wide; horizontal scroll feels broken
- Cross-WOMI batch state has known correctness bugs (deferred SSR-snapshot issue)

The new pattern: **single-row editing via a right-anchored side panel.** The cut-log row in the WOMI's expandable section becomes pure read-only display. Clicking a row opens a panel that owns the entire control stack — edit, save, finalize, void, delete — for that one cut log. No more batch UI; the worker's batch endpoint stays but is called with batches of one. Material items section is untouched. Inventory section is untouched.

This is the canonical "alternative record-view style" for expandable child rows. Built once here, reusable later.

## What this kills (deliberately)

- Per-row inline edit mode (`isEditing`, `enterEditMode`, `setField` for cells)
- Circular commit button + commit mutation per row
- Per-row destructive button + delete/void mutation per row
- Inline inventory + Section + Location dropdowns inside the row
- Per-row selection checkbox
- Section header's "Select All Eligible" + "Finalize Selected" buttons + their controller
- The `useFinalizeCutLogBatchSection` controller (no consumer left)
- The deferred SSR-snapshot finalize bug (no longer reachable)
- The deferred "lift per-WOMI state up" requirement (no longer needed)
- Per-row error bubbling — replaced by panel-local error display

**UX trade-off accepted:** users finalize one cut at a time. Worker still supports batches; UI doesn't. If bulk-finalize is ever needed back, add a separate "Finalize all pending on this WOMI" affordance later — does not gate this work.

## What stays

- Section header bulk Save / Discard / + Add Material Item (material items unchanged)
- Mutations in `data/mutations.ts` (createPendingCutLog, updatePendingCutLog, deletePendingCutLog, voidWorkOrderCutLog, finalizeWorkOrderCutLogBatch) — unchanged. Panel calls them with single-row payloads.
- `EligibleInventory` shape including `sectionCode` (still used inside the panel)
- Material items section + its controller
- Inventory section's cut-log primitives (out of scope — verify no shared dependency breaks)

## Locked behavior

| Action | Behavior |
|---|---|
| Click a cut-log row | Right-anchored side panel opens with row's data |
| Click footer "+ Add Cut Log" | Same panel opens in create mode (empty form) |
| Edit field | Form goes dirty; Save enables; Finalize disables (until clean) |
| Click Save (existing row) | PATCH `/cut-logs/:id`; panel **stays open** showing fresh server values; section refreshes |
| Click Save (new row) | POST `/cut-logs`; panel **closes**; section refreshes |
| Click Finalize | Available only when status=PENDING and form clean. POST batch with N=1; panel auto-closes; section refreshes |
| Click Void | Available when status=PENDING or FINAL. POST void; panel auto-closes; section refreshes |
| Click Delete | Available when status=PENDING. DELETE `/cut-logs/:id`; panel auto-closes; section refreshes |
| Click backdrop / press ESC / click X | Panel closes; unsaved edits discarded silently (no prompt) |
| Editable fields in panel | inventory, cut, isWaste, notes |
| Read-only fields in panel | status badge, cut #, coverage, before, after, seq, created, updated |

## File plan

### NEW — `apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/`

```
cut-log-edit-panel/
├── cut-log-edit-panel.tsx          (~150 lines: SidePanel shell + FieldSection layout + read-only header strip)
├── cut-log-edit-form-fields.tsx    (~120 lines: editable cells via FieldSection + RichDropdown for inventory)
├── cut-log-edit-action-buttons.tsx (~80 lines:  Save / Finalize / Void / Delete buttons + disabled rules)
├── inventory-rich-dropdown.tsx     (~100 lines: thin wrapper around RichDropdown — section + location filters + inventory options projected to RichDropdownOption shape)
└── index.ts                        (re-exports CutLogEditPanel)
```

Why split: the panel shell, the form fields, the action buttons, and the inventory rich-dropdown wiring are independent concerns. Splitting now keeps each file <150 lines and makes the file boundaries match the mental model. Per "we will not cram current files."

### NEW — `apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts`

Single controller for the panel lifecycle. Owns:
- `selectedCutLog: { workOrderItemId: string; cutLogId: string | null } | null` — null = closed; cutLogId null = create mode
- `form` — current editable values + dirty tracking
- All 4 mutations (create, update, delete, void) + finalize-batch-of-1
- `eligibleInventory` load (moved out of WorkOrderCutLogRow)
- Returns: `{ isOpen, mode, form, isDirty, isSaving, error, setField, save, finalize, void: voidAction, delete: deleteAction, open, close }`

### MODIFY — `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx`

Drastically slimmed (~200 lines down from 350+). Becomes a pure read-only display + click handler:
- Remove all editable cell branches
- Remove `renderInventoryCell` (filters + dropdowns) entirely
- Remove `usePendingCutLogSection` import + use
- Remove `eligibleInventory` load
- Remove `onError` bubbling
- Add `onOpenPanel(cutLog)` prop; row's onClick fires it
- Add `onCreateNew()` prop wired to footer button
- Status badge + read-only cells stay
- Cells now use `renderCutLogReadOnlyCell` from the shared cut-log-row primitive

### MODIFY — `apps/web/modules/work-orders/components/record/material-items/cut-log-row-layout.ts`

- Drop `select` from leadingControls (no selection checkbox)
- Drop `commit` from leadingControls (no per-row commit button)
- Move `status` from leadingControls back to a data column (read-only display)
- No trailing controls (no destructive button)
- Result: pure data-column grid, ~50% narrower

### MODIFY — `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx`

- Add `selectedCutLog` state (drives panel open/close via `useCutLogEditPanel`)
- Render `<CutLogEditPanel>` once, alongside the Grid
- Pass `onOpenPanel` + `onCreateNew` callbacks to each `WorkOrderCutLogRow`
- Drop all finalize-related state: `useFinalizeCutLogBatchSection` import + use, `isSelectionActive`, `isFinalizingInFlight`, `cutLogError` aggregation, `getCutLogErrorHandler`, `errorCallbacksRef`
- Drop finalize-related props from `MaterialItemsSectionHeader`

### MODIFY — `apps/web/modules/work-orders/components/record/material-items/material-items-section-header.tsx`

- Drop `selectedCount`, `eligibleSelectedCount`, `eligibleCount`, `canToggleSelection`, `isSelectionActive`, `isFinalizingInFlight`, `onToggleSelectAll`, `onFinalize` from props
- Drop the `extraActions` Fragment (Finalize button + SelectAllButton both gone)
- Header reverts to: title, summary (item count only), actions=[discard, save, addItem]

### DELETE — entire files

- `apps/web/modules/work-orders/components/record/material-items/cut-log-row-controls.tsx` — every export becomes unused (selection / status / commit / destructive renderers)
- `apps/web/modules/work-orders/controllers/record/material-items/use-finalize-cut-log-batch-section.ts` — no consumer
- `apps/web/modules/work-orders/controllers/record/material-items/use-pending-cut-log-section/` — entire folder. After the panel controller takes over, the only piece worth keeping is the `PendingCutLogForm` type, which moves into the panel controller's types.

### Critical files referenced (for execution)

- `apps/web/components/nav/side-panel.tsx` — primitive (`side="right"`)
- `apps/web/components/dropdowns/rich-dropdown/rich-dropdown.tsx` — for inventory + section + location selects
- `apps/web/components/fields/field-section.tsx` + `apps/web/components/layout-grid/cell-at.tsx` + `apps/web/components/fields/form-field.tsx` — invisible 8-col grid layout
- `apps/web/components/cells/{number-cell,text-cell,checkbox-cell}.tsx` — editable cells inside FormFields
- `apps/web/components/features/cut-log-row/cut-log-row.tsx` — `renderCutLogReadOnlyCell` for the row
- `apps/web/components/badges/cut-log-status-badge.tsx` — status badge in panel + row
- `apps/web/modules/work-orders/data/mutations.ts` — all 4 mutations + `finalizeWorkOrderCutLogBatchRequest` + `listEligibleInventoryRequest`
- `apps/web/modules/template-sync/components/template-sync-button.tsx` — closest precedent for "SidePanel hosting a form"

## Implementation phases (each = 1 commit)

| Step | Description | Lines touched |
|---|---|---|
| 1 | Build panel infrastructure: `cut-log-edit-panel/` folder + `use-cut-log-edit-panel` controller. Not wired in yet. Pure new code. | ~600 new |
| 2 | Wire panel into `WorkOrderMaterialItemsSection`. Add `selectedCutLog` state + render `<CutLogEditPanel>`. Cut-log row gets `onOpenPanel` callback. Old inline-edit chrome still present (parallel). Smoke-test: panel opens with correct row data, save/finalize/void/delete all work. | ~80 changed |
| 3 | Strip `work-order-cut-log-row.tsx` to read-only. Remove inline editable cells + filters + inventory load. Update `cut-log-row-layout.ts`: drop selection + commit leading controls, move status to data column, drop destructive trailing. Add row click handler. | ~200 deleted |
| 4 | Strip `MaterialItemsSectionHeader` of finalize props + buttons. Strip section file of finalize state + `useFinalizeCutLogBatchSection`. | ~100 deleted |
| 5 | Delete dead files: `cut-log-row-controls.tsx`, `use-finalize-cut-log-batch-section.ts`, `use-pending-cut-log-section/` folder. Move the `PendingCutLogForm` type into the panel controller if still needed. | ~700 deleted |
| 6 | Verification: typecheck full repo, smoke in browser dev server (open existing PENDING cut → edit → save → values refresh; create new → save → closes + appears; finalize → closes + becomes FINAL; void FINAL → closes + becomes VOID; delete PENDING → closes + disappears; clicking backdrop discards unsaved). | 0 |

After step 5, net-net the codebase is **smaller** despite the new feature — dead inline-edit chrome dwarfs the new panel.

## Design choices recommended

1. **Panel default width** — `w-96` (~384px). Wider than template-sync's `w-80` because we're hosting a form with multiple fields including a search dropdown. Override via `widthClassName` if it feels narrow.

2. **Panel header** — title shows cut log number ("CUT-0000027") for existing rows, "New cut log" for create mode. Subtitle shows status badge for existing rows.

3. **Panel form layout** — `FieldSection` (8-col invisible grid). Suggested cell placement:
   - Row 1: Status badge (col 1-3, read-only) + Cut # (col 4-8, read-only display)
   - Row 2: Inventory rich dropdown (col 1-8, full-width — needs the room for search)
   - Row 3: Cut number cell (col 1-3) + isWaste checkbox (col 4-5) + Coverage read-only (col 6-8)
   - Row 4: Before / After / Seq (3 read-only cells, col 1-3, 4-5, 6-8)
   - Row 5: Notes (col 1-8, multi-line)
   - Row 6: Created / Updated (col 1-4, 5-8)

4. **Inventory rich dropdown** — single dropdown, but with section + location filter chips/dropdowns ABOVE the search field inside the popover. Picking a filter narrows the option list. Clearing the filter restores it. Cleaner than three side-by-side dropdowns; uses RichDropdown's built-in popover.

5. **Action buttons** — bottom strip pinned to panel footer. Layout:
   - Left: Delete (PENDING only) or Discard (drafts) — destructive, secondary
   - Right: Cancel (close) + Save + Finalize (PENDING only, disabled when dirty) + Void (PENDING + FINAL)
   
   Disabled-state tooltips for Finalize ("Save changes before finalizing"), Void ("Already voided"), etc.

6. **Dirty tracking** — diff form vs server snapshot (or initial empty for create mode). Save enabled iff dirty + valid. Finalize enabled iff PENDING + clean.

7. **Click-outside-to-close** — `SidePanel`'s backdrop button already handles this. Combined with discard-on-close = no prompt needed.

8. **Eligible inventory load** — moves into the panel controller. Loaded lazily when panel opens (per workOrderItemId). Cached for the panel's lifetime; refetched on next open.

9. **Form errors** — section header's error slot is no longer the right home for cut-log mutation errors (since cut-log editing is now panel-scoped, not section-scoped). Errors render INSIDE the panel below the action buttons. Section header stays clean.

10. **Section refresh after panel save** — panel calls a `publishCutLogs(updatedRows)` callback up to the parent, same pattern as `publishMaterialItems`. Parent re-renders the section with fresh data.

11. **Concurrency** — single panel = single edit. While save is in flight, panel buttons disabled. Closing during save = aborts the close (panel stays open until mutation settles).

## Open questions

None remaining. Sound bites locked: stay-open-on-save, auto-close-on-terminal-actions, void-PENDING+FINAL, footer-button-create-flow, click-anywhere-row, no-finalize-checkboxes-anywhere.

## Verification

After each commit:
- `pnpm typecheck` (full repo, since some changes touch shared types)
- `grep` for old symbol names (`useFinalizeCutLogBatchSection`, `usePendingCutLogSection`, `renderCutLogCommitControl`, etc.) — confirm zero references after step 5

Final smoke (manual in dev server):
1. Open a work order with PENDING cut logs. Click a row → panel opens right-anchored. Edit cut → Save → panel stays open + values refresh + section row updates.
2. Click "+ Add Cut Log" → panel opens empty. Pick inventory + cut → Save → panel closes + new row appears.
3. With clean PENDING cut → click Finalize → panel closes + status becomes FINAL.
4. Open a FINAL cut → click Void → panel closes + status becomes VOID.
5. Open a PENDING cut → click Delete → confirm → panel closes + row disappears.
6. Open a row, edit a field, click backdrop → panel closes silently, edits discarded, row unchanged.
7. Confirm: no Select All Eligible button visible. No Finalize Selected button. No selection checkbox in row. No circular commit button. No inline destructive button.
8. Confirm material items section still saves/discards/adds normally.
9. Confirm inventory section's cut-log row still works (out of scope — should be untouched).

## Follow-up sweeps (out of scope, acknowledged)

- Bulk-finalize affordance (if ever needed back) — separate UX, separate sweep
- Server-side search inside RichDropdown for inventory — once mutations are solid + categories cached
- Mgmt-co/property/template 3-tier picker — totally separate
- Apply same panel pattern to other expandable child rows in the system — comes later if/when needed
