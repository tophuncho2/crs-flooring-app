# list-view-toolbar-engine-primitive — redesign + cage the list-view toolbar into the list-view engine as one reusable right-anchored primitive, proven on four modules

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-1 worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/engine` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode → produce a plan and STOP for approval.
   - AUTO mode → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
The list-view toolbars are ugly and crowded today. Redesign them into a single clean, long-term, reusable toolbar primitive that lives in the list-view engine (`apps/web/engines/list-view`), then prove it by migrating four modules onto it. The toolbar's preserved strength is that tools stay directly visible — no click into a menu to reach a tool. The new layout sits inline with the existing `back` button but anchored RIGHT: right-to-left it reads `+ [module]` create button (far top-right of screen), then Search, then Filter, then Sort. Each button owns its own anchored options menu/popover for its controls. After the toolbar moves up, the page's data table shifts upward to fill the gap. "Done" = the new caged toolbar primitive exists in the engine and the four modules (job types, entity types, warehouses, payments) render through it, with `/check` green.

Design-for-but-DO-NOT-build-now: grouping, column show/hide, column ordering, CSV export/print, and Sort itself (Sort only exists in inventory + work orders today, neither of which is in this set). Leave the slots clean so those plug in later without rework.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **Create-button new home.** User wants the `+ [module]` create button at the TOP-RIGHT OF THE SCREEN (not the list toolbar's top-right). Options: (a) the app-shell `HeaderControls` portal — global, needs a new page-action portal slot + context/portal injection; (b) a per-page page-header region in each list page's outer container; (c) keep an `ml-auto` toolbar cell but restyled. Editing the app shell IS permitted if (a) wins (`apps/web/app/dashboard/layout.tsx`, `modules/app-shell/components/header-controls.tsx`) — but flag it as the deciding factor. Resolve with the user.
- ⚑ **Where the `x of x {module}` count + `clear` button land** once pulled out of `ListToolbarBottomRow`. Candidates: a page-header region, a list-header above the table, or a table footer beside pagination. Note: `ListRowCount` is wrapped per-module to inject the module name ("3 of 10 Job Types") — wherever it lands must preserve name injection or move to a label slot.
- ⚑ **Options-menu per module after the new toolbar.** Job Types / Entity Types / Warehouses each have a single-tab `TableOptions` today; Payments has NONE. KEEP the `TableOptions` primitive itself, but it has nothing left to hold once the new toolbar is done — so REMOVE it from each module after that module's toolbar is rebuilt. EXCEPTION: CSV export/print is coming this weekend, triggered from the table menu. So for any list view that HAS a menu, replace the menu BODY with placeholder text like "pending csv export" rather than ripping it fully. Decide per module: which keep a menu shell for the CSV stub vs which lose the menu entirely (does Payments stay menu-less until CSV lands?). Removing the menu from a module also removes the DataTable leading-gutter header (DataTable renders it whenever `tableOptions` is passed) — confirm that's intended, especially for Payments.
- ⚑ **Table-label placement / composition.** Users + User Login Activity (READ-ONLY reference) have NO toolbar and put a blue table label just above the table on the LEFT, plain `rounded-md` (no border seam, nothing attaches below). That's the target for a module's label ONCE it has no inline search encasing to attach to. Decide how the label sits while a module STILL has a search bar (search currently has an encasing the label attaches above/onto, `rounded-t-md` seam) vs when search moves into its own anchored menu and the label drops to the clean Users-style top-left position.
- ⚑ **Search's new location + debounce standard.** Once the inline toolbar encasing is gone, where does search live — its own anchored Search menu in the right cluster, or a minimal stub? Also standardize debounce: the four modules are inconsistent today (`SearchControl` vs `DebouncedSearchControl`); pick one. Respect existing per-module URL keys (`?q=` / `?<field>Number=` / `?amount=`) — do not rename them.
- ⚑ **Sort slot future-proofing.** Design the right cluster so a Sort button + its menu (`SortMenuBody` already exists in `toolbar/sort/`) drops in later for inventory/work-orders without rework — but build NO sort into these four. The four have zero sort config today, so adding `?sorts=` later is additive; audit before enabling.

## Scope
In:  Build the new right-anchored, button-per-tool caged toolbar primitive inside `apps/web/engines/list-view` (each button with its own anchored menu/popover; clean slots for the count/clear, search, filter, and a future sort + table/CSV menu). Then migrate four module list views onto it, in order: job types → entity types → warehouses → payments. Shift each page's data table up to fill the freed gap. Relocate the create button to the screen top-right per the resolved flag. Empty the `TableOptions` menus per the resolved flag (CSV stub vs remove).

Out: The `back` button above list views (UNTOUCHED). Sort/grouping/column-show-hide/column-ordering/CSV-export internals (design-for only, build NONE now). Users + User Login Activity modules (reference only). Inventory, Work Orders, Products list views (sort/options references only). Schema / migrations / domain / data / application / api layers — NO schema edits this round; this is a UI-engine + module-wiring task only.

## Files you own (do not edit anything outside this list)
- `apps/web/engines/list-view/` (whole engine) — where the new caged toolbar primitive is built: `index.ts` barrel; `toolbar/list-toolbar/` (ListToolbar, ListToolbarCell, ListToolbarBottomRow, ListRowCount, list-toolbar-tall-card); `toolbar/search/`, `toolbar/filter/`, `toolbar/sort/`, `toolbar/paginate/`; `table/data-table.tsx`; `table/options/table-options.tsx` + `table/options/contracts/table-options-contract.ts`; `client/use-server-list-controller.ts`, `client/url-bindings/nuqs-bindings.ts`.
- `modules/job-types/` — list view only (client, table, controller, `components/list/toolbar-controls/` + `sub-controls/`).
- `modules/entity-types/` — list view only (same shape).
- `modules/warehouse/` — list view only (same shape).
- `modules/payments/` — list view only (same shape; the outlier — two filter bars, no full-text search, no TableOptions).
- `apps/web/app/dashboard/{job-types,entity-types,warehouse,payments}/page.tsx` — the four list pages.
- IF the create-button flag lands on the app shell: `apps/web/app/dashboard/layout.tsx` + `modules/app-shell/components/header-controls.tsx` (adding a page-action portal slot). Permitted, but it is the deciding flag.

## Layer-by-layer map
Public API is `@/engines/list-view` (barrel re-exports `./client ./table ./toolbar ./policies`) — every module imports only from it (no deep imports), so collision risk is low; module-local toolbar controls are unique per module.

**Engine — `apps/web/engines/list-view/`**
- Toolbar primitives already caged: `toolbar/list-toolbar/` = ListToolbar (`list-toolbar.tsx`), ListToolbarCell (`list-toolbar-cell.tsx`, enforces items-stretch so top/bottom slots grow to the tallest), ListToolbarBottomRow (`list-toolbar-bottom-row.tsx`), ListRowCount (`list-row-count.tsx`), `list-toolbar-tall-card.tsx`.
- `toolbar/search/` = SearchControl, DebouncedSearchControl, StateSearchControl, NumberSearchTabBody (NumberSearchTabBody is ONE shared component every module's menu uses — changes hit all consumers at once).
- `toolbar/filter/` = FilterControl, FilterToolbar, FilterChipStrip, EnumFilterChip, PickerFilterChip, ClearAllFiltersButton.
- `toolbar/sort/` = SortMenuBody (`sort-menu.tsx`), SortToggle (future Sort slot wires here).
- `table/data-table.tsx` = universal DataTable; the `tableOptions` prop renders a leading gutter header to host the menu trigger even with no row actions.
- `table/options/table-options.tsx` = the TableOptions primitive (AnchoredPanel + tab strip); contract at `table/options/contracts/table-options-contract.ts` (TableOptionsTab {key,label,render(close),active?}, TableOptionsConfig {tabs,ariaLabel?}). KEEP the primitive.
- `client/use-server-list-controller.ts` (useFetchListController) + `client/url-bindings/nuqs-bindings.ts` (parseAs for q, sort, sortField, sorts, page).

**Current toolbar assembly (all four share this shape, to be replaced):** `[Module]Client` → container card → blue title tab rendered ABOVE ListToolbar (`rounded-t-md`, `border-b-0`, seats above the toolbar) → `ListToolbar(pt-0, showDivider=false)` → left `ListToolbarCell` wraps search + `ListToolbarBottomRow{left: [Module]ClearAll (conditional on hasActiveFilters), right: [Module]RowCount "x of y ModuleName"}` inside a `rounded-md` border inner card → right `ListToolbarCell` (`ml-auto`) holds `Add[Module]Button` → then `[Module]Table` → DataTable (+`tableOptions`).

**Module dir — the four migrating clients (list page at `apps/web/app/dashboard/<name>/page.tsx`; client/table/controller under `modules/<name>/`):**
- Job Types: `modules/job-types/components/list/job-types-client.tsx:52-210` (search ~169, clear ~175, count ~180, add ~186, TableOptions "JT #" NumberSearchTabBody ~111-130). Search YES · Filters NO · Sort NO · Options menu YES (1 tab). URL: `?q=`, `?jobTypeNumber=`, `?page=`.
- Entity Types: `modules/entity-types/components/list/entity-types-client.tsx:52-210` (TableOptions "ET #" ~111-130). Search YES · Filters NO · Sort NO · Options menu YES. URL: `?q=`, `?entityTypeNumber=`, `?page=`.
- Warehouses: `modules/warehouse/components/list/warehouse-client.tsx:52-187` (TableOptions "Store #" ~110-129). Search YES · Filters NO · Sort NO · Options menu YES. URL: `?q=`, `?storeNumber=`, `?page=`.
- Payments (OUTLIER): `modules/payments/components/list/payments-client.tsx:51-172`. NO full-text search; instead TWO `DebouncedSearchControl` filter bars ("Payment #" + "Amount", ~128-139). Add button ~151 (`ml-auto self-start`). Count ~142, clear ~141. NO TableOptions at all (table ~156-169 passes none → no gutter header). Sort NO. URL: `?paymentNumber=`, `?amount=`, `?page=` (no `?q=`, no `?sorts=`).

**Reference (READ-ONLY — replicate the no-toolbar label pattern, do NOT edit):** Users `modules/users/components/list/users-client.tsx:17-62` and User Login Activity `modules/user-activity/components/list/user-activity-client.tsx:20-64`. Pattern: NO ListToolbar; container `min-h-screen space-y-3`; `mx-4` wrapper; `pb-2` holds a blue label span (`inline-block rounded-md border bg-blue-500/15 px-3 py-1`) ABOVE the table; then bare DataTable + pagination. Label is plain `rounded-md` (no border seam) because nothing attaches below it.

**App-shell (only if the create-button flag lands here):** dashboard layout `apps/web/app/dashboard/layout.tsx:16-56` mounts `<NavRail/>` + a `fixed right-0 top-3 z-50 …` wrapper holding `<HeaderControls/>` + `{children}`. HeaderControls `modules/app-shell/components/header-controls.tsx:1-12` is a flex `justify-between` bar with portal slots `<div id="record-back-button-slot" className="contents"/>` and `<div id="record-stepper-slot" className="contents"/>` (used on record-detail pages). A `page-action-slot`-style portal here is the candidate host for a screen-top-right create button; the alternative is a per-page page-header region in each list page's outer container.

## Migration order
Prove the primitive in this exact order — each module fully migrated (new toolbar + table shifted up + menu emptied per flag) before the next:
job types → entity types → warehouses → payments.
(Job types, entity types, warehouses are the homogeneous trio; payments is the outlier — land it last once the primitive is proven, since it has no full-text search, two filter bars, and no TableOptions today.)

## Notes / gotchas
- `@/engines/list-view` barrel is the single public API; refactoring the barrel/props requires an engine rebuild before modules see changes — run build (via `/check`) BEFORE typecheck to dodge stale dist.
- URL contracts differ per module (`?q=` / `?<field>Number=` / `?amount=`); respect existing keys. The four have zero sort config today, so adding `?sorts=` later is additive — audit before enabling.
- DataTable renders the leading gutter header whenever `tableOptions` is passed (even with no row actions) — removing the menu from a module removes that gutter; confirm intended (esp. Payments, which has none today).
- `ListToolbarCell` enforces items-stretch (top + bottom slots grow to the tallest) — height math can break when recomposing the inline cluster; test mixed-height controls.
- `ListRowCount` is wrapped per-module to inject the module name ("3 of 10 Job Types") — relocating the count must preserve name injection or switch to a label slot.
- `NumberSearchTabBody` is one shared engine component used by every module's menu — changes hit all consumers at once.

## Done means
- NO schema edits this round
- /check green (build + typecheck + lint + test) — build BEFORE typecheck (engine stale-dist)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
