# dev-1-row-search-into-menu-wo-inventory — Relocate WO# and Inv# row-number search from toolbar into the TableOptions menu

## How to use this brief (receiving session, read first)
1. **Research first.** Before touching anything, run `/engine` (the engine skill — "rip") to do your own end-to-end research and validate this brief against the live code. The code is the source of truth: if anything here disagrees with what you find, trust the code and note the discrepancy in your plan. Every path:line in this brief is a snapshot and must be re-confirmed.
2. **Read the ⚑ Flags section** — those are decisions to make and gaps to close. Resolve them as you go (drive, don't poll); don't hand them back as a menu.
3. **Honor your mode.** PLAN mode → produce the plan and stop. AUTO mode → execute the plan. Either way, research-and-validate against live code *before* acting.

## Intent for this session
Both the work-orders and inventory list views already host the TableOptions gutter "Menu" (from `@/engines/list-view`). The record-number exact-search bars — **WO #** and **Inv #** — still sit in their module toolbars. Move each of those single search bars **out of the toolbar and into the TableOptions menu as a new tab**, for both modules, so row-number search always lives in one consistent place (the menu). Done = both bars relocated, each menu tab shows an active dot when a value is set, and `/check` is green. Only the WO#/Inv# bars move — every other toolbar search bar stays put.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **Tab label/key.** Use the real row identifier (label "WO #" / "Inv #", keys `workOrderNumber` / `invNumber`) vs a unified generic label like "Row #" / "Search". Decide and keep it consistent across both modules.
- ⚑ **Tab insertion order.** WO currently has tabs `[Sort, Date]`; inventory has `[Sort]`. Where does the number-search tab go — after Sort? after Date? first? Keep Sort's prominence in mind.
- ⚑ **New tab-body shape/styling.** Copy `ScheduledForFilterBody`'s vertical container, or use the barest single-control body with no presets/Clear? Pick the simplest shape that renders cleanly in the popover.
- ⚑ **Toolbar card reflow.** Each number bar leaves a 4-control card at 3 controls — confirm the card still looks balanced. No code-required change expected, but do a visual pass.
- ⚑ **Persistence + clear behavior.** Verify the filter keys `workOrderNumber` / `invNumber` are still in the module's FILTERABLE_FIELDS list so nuqs URL serialize/deserialize keeps working after the move; verify "Clear all" still clears the relocated filter; confirm the popover-hosted control behaves (focus, and the active dot via `Boolean(value)`).

## Scope
**In:**
- Relocate the WO#/Inv# `DebouncedSearchControl` into a TableOptions menu tab for both modules.
- Create the two new filter-body components (one per module).

**Out:**
- Do not touch any other module.
- Do not move any other toolbar search bar — WO's Unit Type / Unit # / Description and inventory's Roll # / Dye Lot / Note all stay in the toolbar.
- No engine-internal edits — TableOptions already exists and is consumed read-only.
- No schema / domain / data / application / api changes.

## Files you own (do not edit anything outside this list)
Work-orders:
- **EDIT** `apps/web/modules/work-orders/components/list/work-orders-client.tsx`
- **CREATE** `apps/web/modules/work-orders/components/list/toolbar-controls/work-order-number-filter-body.tsx` (new tab body)
- **READ-ONLY ref** `apps/web/modules/work-orders/components/list/work-orders-table.tsx`

Inventory:
- **EDIT** `apps/web/modules/inventory/components/list/inventory-client.tsx`
- **CREATE** `apps/web/modules/inventory/components/list/toolbar-controls/inventory-number-filter-body.tsx` (new tab body)
- **READ-ONLY ref** `apps/web/modules/inventory/components/list/inventory-table.tsx`

Pattern reference (read-only): `apps/web/modules/work-orders/components/list/toolbar-controls/scheduled-for-filter-body.tsx` — a pure body component hosted as a menu tab.
Contract reference (read-only): `apps/web/engines/list-view/table/options/contracts/table-options-contract.ts` — `TableOptionsTab = { key, label, render, active? }`; the `render` fn may receive a `close` param (contract line ~15) which these number bodies don't need — ignore it, same as `ScheduledForFilterBody`.

## Layer-by-layer map
This is a pure **Module directory + Pages** client/UI change. No Schema / Domain / Data / Application / API rows.

### `work-orders-client.tsx`
- **tableOptions tabs array** built at ~lines 283–320 (currently `"sort"` ~286–298, `"date"` ~299–310). Add the new number-search tab here; add its driving value to the `useMemo` dependency array (~lines 313–319).
- **WO# bar to REMOVE from toolbar**: ~lines 407–412 — `<DebouncedSearchControl value={workOrderNumberValue} onCommit={(next) => handleTextFilterChange("workOrderNumber", next)} placeholder="WO #" ... />`.
- **State/handler that travels with it:** `workOrderNumberValue` (derived ~line 174 = `filters.workOrderNumber?.[0] ?? ""`); handler `handleTextFilterChange("workOrderNumber", next)` (defined ~215–224); filter key `"workOrderNumber"`. These stay in the client; the tab body receives `value` + an `onChange` that calls the same handler.
- **Toolbar card holding it:** ~lines 393–424 (4 controls: Unit Type, Unit #, WO #, Description). Removing WO # leaves 3 — no empty-card risk; the `rounded-tl-none` seam (~line 394) stays.

### `inventory-client.tsx`
- **tableOptions tabs array** at ~lines 214–233 (currently one `"sort"` tab ~217–229). Add the new tab as the second tab (or per ⚑ order flag); add its driving value to the dep array (~line 232).
- **Inv# bar to REMOVE**: ~lines 430–435 — `<DebouncedSearchControl value={invNumberValue} onCommit={(next) => handleTextFilterChange("invNumber", next)} placeholder="Inv #" ... />`.
- **State/handler:** `invNumberValue` (derived ~line 247 = `filters.invNumber?.[0] ?? ""`); handler `handleTextFilterChange("invNumber", next)` (~349–355); filter key `"invNumber"`.
- **Toolbar card:** ~lines 422–453 (4 controls: Roll #, Inv #, Dye Lot, Note). Removing Inv # leaves 3 — fine; the `rounded-tl-none` seam (~line 423) stays.

### New tab bodies
Mirror `scheduled-for-filter-body.tsx` (a pure body component, no `close` usage). Simplest shape: just the `DebouncedSearchControl`, no presets, no Clear. Suggested tab object shape (adjust to live contract):
```ts
{
  key: "workOrderNumber",
  label: "WO #",
  active: Boolean(workOrderNumberValue),
  render: () => (
    <WorkOrderNumberFilterBody
      value={workOrderNumberValue}
      onChange={(next) => handleTextFilterChange("workOrderNumber", next)}
    />
  ),
}
```
Inventory's tab mirrors this with `invNumber` / "Inv #" / `invNumberValue` / `InventoryNumberFilterBody`.

### Gotchas (re-validate)
- No shared draft state between toolbar and menu — `DebouncedSearchControl` owns its own draft; the `value` prop is the source of truth (from `filters`), and `onCommit`/`onChange` flows to the same filter-change handler. Moving into a tab body keeps that contract intact.
- Verify visually that `DebouncedSearchControl` renders correctly inside the popover (sizing, spacing, focus).
- Confirm `"workOrderNumber"` / `"invNumber"` are in `WORK_ORDERS_LIST_FILTERABLE_FIELDS` / `INVENTORY_FILTERABLE_FIELDS` so nuqs URL serialize/deserialize still works after relocation.
- Confirm "Clear all" still clears the relocated filter (handler chain is unchanged, but verify end to end).

## Migration (if schema changes)
None — no schema changes.

## Done means
- `/check` green (build + typecheck + lint + test).
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits).
