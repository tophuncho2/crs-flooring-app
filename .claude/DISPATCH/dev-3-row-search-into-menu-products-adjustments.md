# dev-3-row-search-into-menu-products-adjustments — Install the TableOptions menu and relocate PROD# / Adj# row-number search into it

## How to use this brief (receiving session, read first)
1. **Research first.** Before touching anything, run `/engine` (the engine skill — "rip") to do your own end-to-end research and validate this brief against the live code. The code is the source of truth: where this file and the code disagree, trust the code and note the discrepancy in your plan.
2. **Read the Flags.** The `⚑ Flags` section lists decisions and potential gaps you must settle as you go. Do not silently skip them.
3. **Honor mode.** PLAN mode → produce a plan and stop. AUTO mode → execute. Either way, research-validate against live code *before* acting.

## Intent for this session
Install the TableOptions gutter menu into the **products** and **adjustments** list views by copying the existing inventory pattern (the client builds a `TableOptionsConfig` → the table component accepts a `tableOptions?` prop → forwards it to `<DataTable>`). Then relocate each module's exact record-number search bar — **PROD #** in products, **Adj #** in adjustments — out of the toolbar and into that menu as a tab, so row-number search lives in one consistent place. Done = both modules have the menu installed and the PROD#/Adj# bar relocated, with `/check` green.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **Tab key/label:** `"number"` + `"PROD #"` / `"number"` + `"Adj #"` vs a generic label like `"Record #"` or `"Search"`. Decide and keep it consistent across both modules.
- ⚑ **Tabs array shape:** A single number-search tab now, or structure the `tabs` array so a Sort tab could be added later? Confirm a single tab is acceptable for this scope (the user scope is just the row-number search).
- ⚑ **Menu close behavior:** After typing a number, leave the menu open so users can keep browsing, or auto-close via the render `close` callback. Default leans **open**.
- ⚑ **Active-dot logic:** Light the tab when `prodNumberValue` / `adjNumberValue` is non-empty (mirrors inventory's Sort tab `active: sorts.length > 0`). Confirm trim semantics (`value.trim().length > 0`).
- ⚑ **Placeholder copy inside the menu:** Keep `"PROD #"` / `"Adj #"` or expand to `"Search by …"`. Minor; defer to design.
- ⚑ **Toolbar reflow:** Confirm the toolbar looks balanced after each bar leaves (card height + alignment with the section tab above), and confirm the adjustments **Inv#** bar truly stays in the toolbar (it is a reference field, not the record's own number).

## Scope
**In:**
- Install the `TableOptions` primitive (from `@/engines/list-view`) into the products and adjustments list views.
- Relocate the **PROD #** / **Adj #** exact-number search bar out of the toolbar and into the menu as a tab.

**Out:**
- Do not touch any other module.
- Do not move any other search bar. Products **Color / Style / Naming** + the module text search stay in the toolbar. Adjustments **Roll# / Inv# / Dye lot / Note** stay in the toolbar — **Inv# explicitly stays** (it is a reference field, not the record's own number; the record's number is Adj#).
- No engine-internal edits. `TableOptions` / `TableOptionsConfig` already exist and are consumed read-only.
- No schema / domain / data / application / API changes. This is a pure client/UI change.

## Files you own (do not edit anything outside this list)
**Products**
- `apps/web/modules/products/components/list/products-client.tsx` — build the `tableOptions` config; remove the PROD# bar; pass the prop to the table.
- `apps/web/modules/products/components/list/products-table.tsx` — add `tableOptions?: TableOptionsConfig` prop + `<DataTable>` pass-through.
- `apps/web/modules/products/components/list/products-list-columns.ts` and `toolbar-controls/*` — **read-only reference**, no edit expected.

**Adjustments**
- `apps/web/modules/adjustments/components/list/adjustments-client.tsx` — build the `tableOptions` config; remove the Adj# bar; pass the prop to the table.
- `apps/web/modules/adjustments/components/list/adjustments-table.tsx` — add `tableOptions?: TableOptionsConfig` prop + `<DataTable>` pass-through.
- Note: adjustments has **no** `toolbar-controls/` subdir — all controls are inline in `adjustments-client.tsx`.

## Layer-by-layer map
Only the **Module directory** and **Pages** layers are touched — pure client/UI change. No Schema / Domain / Data / Application / API rows.

**Install pattern to copy (from inventory, which already has the menu — read-only reference):**
- `inventory-table.tsx`: imports `type TableOptionsConfig` from `@/engines/list-view` (~line 4); adds `tableOptions?: TableOptionsConfig` to its props (~line 18/33); passes `tableOptions={tableOptions}` to `<DataTable>` (~line 44). `DataTable` already renders the menu in the gutter when the prop is present (`data-table.tsx` ~241–244) — **no engine edits needed**.
- `inventory-client.tsx` (~lines 214–233): builds a `useMemo<TableOptionsConfig>` with a `tabs` array. Each tab = `{ key, label, active, render }`. The `render` fn returns the search control; it may receive a `close` param — search bars don't need it, so ignore it (don't call `close()`).

**Products change points (`products-client.tsx`):**
- Build the `tableOptions` `useMemo` after `handleClearAll` (~line 209). Single tab: `key: "number"`, `label: "PROD #"`, `active: prodNumberValue.trim().length > 0`, `render` returns the `DebouncedSearchControl` for PROD#.
- **Remove** the PROD# bar at ~lines 245–250: `<DebouncedSearchControl value={prodNumberValue} onCommit={handleProdNumberChange} placeholder="PROD #" … />`. Its wiring (value `prodNumberValue`, handler `handleProdNumberChange`, filter key `prodNumber`) moves into the tab `render` fn.
- **Bars that stay (unchanged):** Color ~251–255 (`handleColorChange`), Style ~257–261 (`handleStyleChange`), Naming ~263–267 (`handleNamingAddonChange`), plus the module text search.
- Pass `tableOptions` to `<ProductsTable>` (~lines 293–306).

**Products change points (`products-table.tsx`):**
- `ProductsTableProps` (~lines 8–12) lacks `tableOptions` — add it (`tableOptions?: TableOptionsConfig`) and add the `@/engines/list-view` import (not yet present).
- Add `tableOptions={tableOptions}` to the `<DataTable>` JSX (~lines 20–28, after `pagination`).

**Adjustments change points (`adjustments-client.tsx`):**
- Build the `tableOptions` `useMemo` after `handleClearAll` (~line 238). Single tab: `key: "number"`, `label: "Adj #"`, `active: adjNumberValue.trim().length > 0`, `render` returns the `DebouncedSearchControl` for Adj#.
- **Remove** the Adj# bar at ~lines 252–256: `<DebouncedSearchControl value={adjNumberValue} onCommit={(next) => handleTextFilterChange("adjNumber", next)} placeholder="Adj #" … />`. Its wiring (value `adjNumberValue`, `handleTextFilterChange("adjNumber", …)`, filter key `adjNumber`) moves into the tab `render` fn.
- **Bars that stay (unchanged):** Roll# ~258–262, Inv# ~264–268 (**DO NOT MOVE** — reference field), Dye lot ~270–274, Note ~276–280.
- Pass `tableOptions` to `<AdjustmentsTable>` (~lines 335–359).

**Adjustments change points (`adjustments-table.tsx`):**
- Props (~lines 9–19) lack `tableOptions` — add it (`tableOptions?: TableOptionsConfig`) and add the `@/engines/list-view` import (not yet present).
- Add `tableOptions={tableOptions}` to the `<DataTable>` JSX (~lines 22–31, after `pagination`).

**Gotchas:**
- `TableOptionsConfig` is exported from the `@/engines/list-view` barrel — add the import to each client + table file (it is **not** yet imported in these files; do not assume it's present).
- The render fn may receive a `close` param — search bars don't need it; ignore it (don't call `close()`).
- Toolbar reflow: removing one bar from each multi-bar card leaves the card elastic (`flex-col gap-2`) — it should compact cleanly with no CSS change. Do a visual pass to confirm.
- `DataTable` needs **no** change — it's a drop-in prop.

## Migration (if schema changes)
None — no schema changes.

## Done means
- `/check` green (build + typecheck + lint + test).
- Commit message ≤17 words ready (**DO NOT COMMIT** — the user commits).
