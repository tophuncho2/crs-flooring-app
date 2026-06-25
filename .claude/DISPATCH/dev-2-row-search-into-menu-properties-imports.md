# dev-2-row-search-into-menu-properties-imports — Install the TableOptions menu and relocate PROP# / IMP# row-number search into it

## How to use this brief (receiving session, read first)
1. **Run `/engine` FIRST.** Before touching anything, invoke the engine skill ("rip") to do your own end-to-end research and validate this brief against the live code. The code is the source of truth — where this file and the code disagree, trust the code and note the discrepancy in your response.
2. **Read the ⚑ Flags section below** and make the calls listed there as you execute (don't stop to poll — surface decisions as you go).
3. **Honor mode.** If you are in PLAN mode: produce the plan and stop. If you are in AUTO mode: execute. Either way, research-and-validate against live code *before* acting.

## Intent for this session
Install the shared `TableOptions` gutter "Menu" into the **properties** and **imports** list views by copying the pattern already in inventory (the list client builds a `TableOptionsConfig` → the table component accepts it as a prop → forwards it to `<DataTable>`, which already renders the menu when the prop is present). Then move each module's record-number exact-search bar (**PROP #**, **IMP #**) out of the toolbar and into that menu as a tab, so the row-number search lives in one consistent place. Done = both modules have the menu installed and the PROP#/IMP# bar relocated into it, with `/check` green. This is a pure client/UI change — no engine internals are edited (`TableOptions` already exists and is consumed read-only).

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **Tab key/label:** field-specific (`key: "propNumber"`/`"impNumber"`, `label: "PROP #"`/`"IMP #"`) vs a generic `"Search"` label. Decide and keep the choice consistent across both modules.
- ⚑ **Single tab vs future-proof shape:** install a single number-search tab now, or structure the `tabs` array so a Sort tab could be added later? Scope here is only the row# search — confirm a single-tab array is acceptable.
- ⚑ **Tab body layout:** wrap the control in a small padded container (e.g. a `p-4` div) so it doesn't float in the popover, or render the barest control? Match the menu's existing visual density (check how inventory's tab body is padded).
- ⚑ **Menu close behavior:** the search auto-commits on debounce, so the menu can stay open — no Apply button and no `close()` call. Confirm that's the intended UX vs an explicit Apply.
- ⚑ **Active-dot logic:** light the tab when `propNumberValue` / `impNumberValue` is non-empty (mirrors inventory's `active: sorts.length > 0`). Confirm trim semantics (e.g. `value.length > 0` vs `value.trim().length > 0`).
- ⚑ **Toolbar reflow:** confirm the toolbar still looks balanced after the bar is removed — properties keeps **text search + StateSearchControl**; imports keeps **text search + warehouse filter chip + add-import button**.

## Scope
**In:**
- Install the `TableOptions` gutter menu in the properties and imports list views.
- Relocate the PROP# / IMP# exact-number search out of the toolbar and into a menu tab.

**Out:**
- Do not touch any other module.
- Do not move any other control. Properties' text search + StateSearchControl stay in the toolbar; imports' text search + warehouse filter chip + add-import button stay in the toolbar.
- No engine-internal edits — `TableOptions` and `DataTable`'s menu rendering already exist and are consumed read-only.
- No schema / domain / data / API changes.

## Files you own (do not edit anything outside this list)
| File | Why |
| --- | --- |
| `apps/web/modules/properties/components/list/properties-client.tsx` | Build the `TableOptionsConfig`, relocate the PROP# bar into its tab, remove it from the toolbar, pass `tableOptions` to the table. |
| `apps/web/modules/properties/components/list/properties-table.tsx` | Add the `tableOptions?` prop and forward it to `<DataTable>`. |
| `apps/web/modules/imports/components/list/imports-client.tsx` | Build the `TableOptionsConfig`, relocate the IMP# bar into its tab, remove it from the toolbar, pass `tableOptions` to the table. |
| `apps/web/modules/imports/components/list/imports-table.tsx` | Add the `tableOptions?` prop and forward it to `<DataTable>`. |

(The columns + toolbar-control files in each module are **read-only reference** — do not edit them.)

## Layer-by-layer map
Only two layers are in play — **Module directory** and **Pages** (this is a pure client/UI change). No Schema / Domain / Data / Application / API rows.

### Reference: the install pattern to copy (inventory — already has the menu)
- `inventory-table.tsx`: imports `type TableOptionsConfig` from `@/engines/list-view`; adds `tableOptions?: TableOptionsConfig` to its props (~line 33); passes `tableOptions={tableOptions}` to `<DataTable>` (~line 44). `DataTable` already renders the menu in the gutter when the prop is present (`data-table.tsx` ~241–244) — **no engine edits**.
- `inventory-client.tsx` (~lines 214–233): builds a `useMemo<TableOptionsConfig>` with a `tabs` array; each tab = `{ key, label, active, render }`.

### Properties — `properties-client.tsx`
- **Import (line 4)** — add `type TableOptionsConfig` to the existing `@/engines/list-view` import. `DebouncedSearchControl` is already imported here. **Do NOT add `SortMenuBody`** — no Sort tab is in scope and an unused import fails lint.
- **Keep the existing state/handlers**, just relocate their use into the tab render fn: `propNumberValue` (~line 115 = `filters.propNumber?.[0] ?? ""`) and `handlePropNumberChange` (~lines 117–123).
- **Build the `tableOptions` useMemo** (insert after the list controller, ~after line 159): a single tab `{ key: "propNumber" (or chosen key), label, active: propNumberValue.length > 0, render: () => <DebouncedSearchControl value={propNumberValue} onCommit={handlePropNumberChange} placeholder="PROP #" ariaLabel=... /> }`. Dep array `[propNumberValue, handlePropNumberChange]`.
- **Remove the PROP# `DebouncedSearchControl` from the toolbar** (~lines 204–209).
- **Pass `tableOptions` to `<PropertiesTable>`** (~line 242).
- **Stays in toolbar:** the properties text search + `StateSearchControl` (state filter).

### Properties — `properties-table.tsx`
- Props (~lines 8–15: `rows`, `onOpenProperty`, `pagination`) lack `tableOptions` — add `tableOptions?: TableOptionsConfig` (import the type from `@/engines/list-view`) and forward it to `<DataTable>` (~lines 18–26).

### Imports — `imports-client.tsx`
- **Import (line 4)** — add `type TableOptionsConfig` to the existing `@/engines/list-view` import. `DebouncedSearchControl` is already imported here. **Do NOT add `SortMenuBody`.**
- **Keep the existing state/handlers**: `impNumberValue` (~line 101 = `filters.impNumber?.[0] ?? ""`) and `handleImpNumberChange` (~lines 103–109).
- **Build the `tableOptions` useMemo** (insert ~after line 140): a single tab `{ key: "impNumber" (or chosen key), label, active: impNumberValue.length > 0, render: () => <DebouncedSearchControl value={impNumberValue} onCommit={handleImpNumberChange} placeholder="IMP #" ariaLabel=... /> }`. Dep array `[impNumberValue, handleImpNumberChange]`.
- **Remove the IMP# `DebouncedSearchControl` from the toolbar** (~lines 182–187).
- **Pass `tableOptions` to `<ImportsTable>`** (~line 211).
- **Stays in toolbar:** the imports text search + warehouse filter chip + add-import button.

### Imports — `imports-table.tsx`
- Props (~lines 12–31: `rows`, `onOpenImport`, `pagination`) lack `tableOptions` — add `tableOptions?: TableOptionsConfig` (import the type from `@/engines/list-view`) and forward it to `<DataTable>` (~lines 22–31).

### Gotchas
- Add **only** `type TableOptionsConfig` to the engine import — **not** `SortMenuBody` (no Sort tab; an unused import fails lint).
- The `render` fn may receive a `close` param — the search bars don't need it; ignore it. `DebouncedSearchControl` auto-commits on debounce, so there is no Apply button.
- **Toolbar reflow:** removing one bar from the first toolbar cell (a `flex-col gap-2` stack) compacts naturally — no CSS change expected, but do a visual pass.
- `DebouncedSearchControl` is already imported in both clients — don't re-import it.

> Line numbers above are from a snapshot — re-validate against live code during `/engine` and trust the code where it differs.

## Migration (if schema changes)
None — no schema changes.

## Done means
- `/check` green (build + typecheck + lint + test).
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits).
