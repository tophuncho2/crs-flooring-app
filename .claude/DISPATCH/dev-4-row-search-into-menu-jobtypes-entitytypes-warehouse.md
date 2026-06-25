# dev-4-row-search-into-menu-jobtypes-entitytypes-warehouse — Install the TableOptions menu and relocate JT# / ET# / Store# row-number search into it

## How to use this brief (receiving session, read first)
1. **Research first.** Before touching anything, run `/engine` (the engine skill — "rip") to do your own end-to-end research and validate this brief against live code. The code is the source of truth: where this file and the code disagree, trust the code and note the discrepancy in your plan. Re-confirm every path:line cited below — line numbers drift.
2. **Read the Flags.** The `⚑ Flags` section lists decisions to make / potential gaps. Resolve them as you go (drive, don't poll); surface any you genuinely cannot call.
3. **Honor mode.** PLAN mode → produce the plan and stop. AUTO mode → execute. Either way, research-validate FIRST.

## Intent for this session
Install the TableOptions gutter "Menu" into three small read-only list modules — job-types, entity-types, warehouse — by copying the inventory pattern (client builds a `TableOptionsConfig` → table accepts a `tableOptions` prop → forwards it to `<DataTable>`). Then relocate each module's exact record-number search bar (JT #, ET #, Store #) OUT of the toolbar and INTO that menu as a single tab, so the row-number search lives in one consistent place. job-types and entity-types are near-identical twins — the same edit applies near-verbatim to both; warehouse is the same shape with `storeNumber`. Done = all three installed + relocated, `/check` green.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **Tab key/label per module:** field-specific (`"JT #"` / `"ET #"` / `"Store #"`) vs a single uniform label (e.g. `"Number"`) across all three. Recommend keeping all three consistent since the functionality is identical — confirm the choice.
- ⚑ **Single tab now vs future-proof array:** install one number-search tab only, or structure the `tabs` array to admit a Sort tab later? These modules have no sort UI today; confirm the minimal single-tab install is acceptable (user scope is just the row# search).
- ⚑ **Tab render shape:** inline the `DebouncedSearchControl` directly in the `render` fn vs extract a small per-module body component (e.g. `job-types-number-filter-body`). Inline is fine for one control; decide.
- ⚑ **Active-dot logic:** light the tab when the number value is non-empty (`jobTypeNumberValue.trim().length > 0`, etc.), mirroring inventory's `active: sorts.length > 0` — confirm.
- ⚑ **Menu close behavior:** `DebouncedSearchControl` auto-commits on debounce, so the menu stays open (no Apply / `close()` call) — confirm that's the intended UX.
- ⚑ **Toolbar readability:** confirm each toolbar still reads well after the number bar leaves (the module text search + clear/row-count bottom row remain in all three).

## Scope
**In:**
- Install the `TableOptions` primitive (from `@/engines/list-view`) into job-types, entity-types, and warehouse list views.
- Relocate the JT# / ET# / Store# exact-number search into a single menu tab in each of those three modules.

**Out:**
- Do not touch any other module.
- Do not move the module text search or the clear/row-count bottom row — they stay in the toolbar.
- No engine-internal edits. `TableOptions` already exists in `@/engines/list-view` and `DataTable` already renders it when the prop is present — consume read-only.
- No schema / domain / data / application / API changes.

## Files you own (do not edit anything outside this list)
Job-types:
- `apps/web/modules/job-types/components/list/job-types-client.tsx` — build `tableOptions`, remove JT# bar from toolbar, pass prop to table.
- `apps/web/modules/job-types/components/list/job-types-table.tsx` — accept + forward the `tableOptions` prop to `<DataTable>`.

Entity-types:
- `apps/web/modules/entity-types/components/list/entity-types-client.tsx` — build `tableOptions`, remove ET# bar from toolbar, pass prop to table.
- `apps/web/modules/entity-types/components/list/entity-types-table.tsx` — accept + forward the `tableOptions` prop to `<DataTable>`.

Warehouse:
- `apps/web/modules/warehouse/components/list/warehouse-client.tsx` — build `tableOptions`, remove Store# bar from toolbar, pass prop to table.
- `apps/web/modules/warehouse/components/list/warehouse-table.tsx` — accept + forward the `tableOptions` prop to `<DataTable>`.

**Read-only reference (do not edit):** each module's `table/*-list-columns.ts` and `toolbar-controls/` directory. The inventory list (`apps/web/modules/inventory/components/list/inventory-client.tsx` + `inventory-table.tsx`) is the copy-from reference — it already has the menu.

## Layer-by-layer map
Pure **Module dir + Pages** change — client/UI only. No Schema / Domain / Data / Application / API rows.

### Install pattern to copy (from inventory — already has the menu)
- **`inventory-table.tsx`:** imports `type TableOptionsConfig` from `@/engines/list-view`, adds `tableOptions?: TableOptionsConfig` to its props, and passes `tableOptions={tableOptions}` to `<DataTable>` (~line 44). `DataTable` already renders the menu in the gutter when the prop is present (`data-table.tsx` ~lines 241–244) — **no engine edits**.
- **`inventory-client.tsx` (~lines 214–233):** builds a `useMemo<TableOptionsConfig>` with a `tabs` array; each tab = `{ key, label, active, render }`.

**Confirmed:** none of the three target table components accept `tableOptions` yet — each imports only `DataTable` + `PaginateContract`. For each table: add `import type { TableOptionsConfig }` (same `@/engines/list-view` barrel), add `tableOptions?: TableOptionsConfig` to props, pass it to `<DataTable>`.

**General client edit (applies to all three):** add `type TableOptionsConfig` to the `@/engines/list-view` import; confirm `useMemo` is imported (add if missing). Do **NOT** import `SortMenuBody` — there is no Sort tab and an unused import fails lint.

### job-types (`job-types-client.tsx`)
- KEEP (relocate into the tab `render` fn): `jobTypeNumberValue` (~line 97 = `filters.jobTypeNumber?.[0] ?? ""`); `handleJobTypeNumberChange` (~lines 99–105).
- Build `tableOptions` `useMemo`: single tab `{ key, label, active: jobTypeNumberValue.trim().length > 0, render: () => <DebouncedSearchControl value={jobTypeNumberValue} onCommit={handleJobTypeNumberChange} placeholder="JT #" ariaLabel=… /> }`. Dep array `[jobTypeNumberValue, handleJobTypeNumberChange]`.
- REMOVE the JT# `DebouncedSearchControl` from the toolbar: ~lines 148–153 (inside `ListToolbar` ~141–169). After removal the cell still has the text search (`JobTypesListSearch`) + the bottom row — safe, not empty.
- Pass `tableOptions` to `<JobTypesTable>`.

### entity-types (`entity-types-client.tsx`) — identical shape
- KEEP: `entityTypeNumberValue` (~line 97); `handleEntityTypeNumberChange` (~lines 99–105).
- REMOVE the ET# bar: ~lines 148–153. `placeholder="ET #"`. The text search (`EntityTypesListSearch`) + bottom row remain.
- Same `tableOptions` build + table prop + import additions as job-types.

### warehouse (`warehouse-client.tsx`)
- KEEP: `storeNumberValue` (~line 96 = `filters.storeNumber?.[0] ?? ""`); `handleStoreNumberChange` (~lines 98–104).
- REMOVE the Store# bar: ~lines 131–136 (inside `ListToolbar` ~127–147). `placeholder="Store #"`. The text search + bottom row remain.
- Same `tableOptions` build + table prop + import additions.

### Gotchas
- All three are read-only lists (`onOpenRow`, no `rowActions`) — simple gutter; the menu trigger drops in cleanly.
- After removing the number bar, each toolbar still has a text search + clear/row-count bottom row — no empty-toolbar problem; no CSS change expected.
- Add ONLY `type TableOptionsConfig` to the engine import — NOT `SortMenuBody`. Verify `useMemo` is imported in each client before using it.
- `DataTable` needs NO change — it is a drop-in prop.

## Migration (if schema changes)
None — no schema changes.

## Done means
- `/check` green (build + typecheck + lint + test).
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits).
