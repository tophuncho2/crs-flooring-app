# adjustments-list-actionbar — Migrate the Adjustments list view onto the ListActionBar toolbar engine

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` (scope it to the adjustments module list view) to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval. AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
Migrate the adjustments list view's legacy `ListToolbar` chrome onto the shared `ListActionBar` engine, mirroring the already-migrated products and job-types clients. This is a pure frontend toolbar-chrome swap — the backend is untouched. Done means the adjustments list renders the `[Adjustments][x of x adjustments][Clear] … [Filter ▾][Search ▾]` header band (NO create button) with `/check` green.

## ⚑ Flags — decisions to make / potential gaps

1. **No create button** — adjustments are created only from inventory / work-order record views; confirm none is added and `ListCreateButtonPortal` is NOT imported.
2. **No Sort tool** — no sort UI exists for adjustments; confirm leaving it out of the `ListActionBar` children (the DataTable gutter `tableOptions` still handles Adj # search independently).
3. **Adj # stays in the DataTable gutter** — `tableOptions.tabs[0]` at lines 243–261 hosts the `NumberSearchTabBody` for adjNumber. It must NOT move into the Search menu. `hasActiveSearchTool` excludes `adjNumberValue`; the combined `hasActiveFilters` includes it so `Clear-all` still resets it.
4. **No message/pageError block** — adjustments has no module list-controller hook; do NOT add a message block. No `message` or `pageError` destructure exists and none should be added.
5. **`initialSearchQuery` orphan** — prop at line 93, wired to `useFetchListController` at line 139; leave as-is. Do NOT surface a `SearchControl` for it — that is not this session's debt.
6. **Engine-migration convention** — mirror canonical shape head-to-toe; defer alignment tests and `modules/shared` doc cleanup per standard sweep convention; DO NOT COMMIT; commit message ≤17 words.

## **HARD RULE — search bars go in the SEARCH menu ONLY, never the Filter menu.**
Filter holds only the warehouse / category / product pickers. SEARCH holds the four `DebouncedSearchControl` text bars. Prior sessions have repeatedly misplaced free-text search bars into the Filter menu — do not repeat that.

## Scope

**In:** `apps/web/modules/adjustments/components/list/adjustments-client.tsx` — tear down the legacy hand-built card + `ListToolbar` block (lines 266–351), replace with `<ListActionBar>` + two `<ToolbarMenuButton>` children (Filter: pickers; Search: text bars), split the active-filter boolean into three vars.

**Out:**
- All backend layers — untouched.
- Engine primitive files — consume only, do not edit.
- Reference clients (products-client.tsx, job-types-client.tsx) — read-only references.
- `apps/web/app/dashboard/adjustments/page.tsx` — RSC loader, untouched.
- `apps/web/modules/adjustments/index.ts` — module barrel (primitives library consumed by work-orders + inventory), untouched.
- `…/controllers/use-adjustment-reconcile.ts` — untouched.
- `…/data/mutations.ts`, `…/data/list-adjustments-request.ts` — untouched.
- `…/components/list/table/adjustment-row-actions.tsx` — row-level split-off (`onSplitOff`) stays here, untouched.
- `…/components/list/table/adjustments-list-columns.ts`, `…/components/list/table/adjustments-row-cell.tsx` — untouched.
- `…/components/list/adjustments-table.tsx` — thin DataTable wrapper, untouched (removed bits are inline in adjustments-client.tsx, not husk files).
- `…/components/row/` — record-view cluster, untouched.
- Any other module still on `ListToolbar` — not this session's job.
- Engine-wide message-block extraction — deferred, not this session.

## Files you own (do not edit anything outside this list)

| File | Action |
|---|---|
| `apps/web/modules/adjustments/components/list/adjustments-client.tsx` | PRIMARY — tear down + rebuild toolbar block |

Read-only references (validate the pattern, do not edit):
- `apps/web/engines/list-view/toolbar/action-bar/list-action-bar.tsx`
- `apps/web/engines/list-view/toolbar/action-bar/toolbar-menu-button.tsx`
- `apps/web/engines/list-view/toolbar/action-bar/list-create-button-portal.tsx` (confirm NOT used here)
- `apps/web/modules/products/components/list/products-client.tsx`
- `apps/web/modules/job-types/components/list/job-types-client.tsx`

## Layer-by-layer map

### Engine primitives (consume, do not edit)
- `apps/web/engines/list-view/toolbar/action-bar/list-action-bar.tsx` — `<ListActionBar label rowCount total rowCountLabel hasActiveFilters onClearAll>`
- `apps/web/engines/list-view/toolbar/action-bar/toolbar-menu-button.tsx` — `<ToolbarMenuButton label icon active>` (body as children)

### Target file — `adjustments-client.tsx`

**Tear down (lines 266–351):**
- The outer hand-built card `<div className="mx-4 rounded-xl border …">` and everything inside it.
- Custom blue "Adjustments" label `<span>` (lines 268–271).
- `<ListToolbar className="pt-0" showDivider={false}>` (line 273).
- LEFT `ListToolbarCell` (lines 274–307): four `DebouncedSearchControl` (Roll # / Inv # / Dye lot / Note) + `ClearAllFiltersButton` + `ListRowCount` in a `ListToolbarBottomRow`.
- RIGHT `ListToolbarCell` (lines 312–349): `WarehousePicker` + `CategoryPicker` + `ProductPicker`.

**Import changes:**

Remove from `@/engines/list-view` import (line 4):
- `ListRowCount`, `ListToolbar`, `ListToolbarBottomRow`, `ListToolbarCell`, `ClearAllFiltersButton`

Add to `@/engines/list-view` import:
- `ListActionBar`, `ToolbarMenuButton`

Add new lucide-react import (file currently has none):
```ts
import { Search, SlidersHorizontal } from "lucide-react";
```

**Active-filter boolean split** — replace the current single `hasActiveFilters` (lines 214–234) with three derived booleans:

```ts
const hasActiveFilterTool =
  Boolean(selectedWarehouseId) ||
  Boolean(selectedCategoryId) ||
  Boolean(selectedProductId);

const hasActiveSearchTool =
  Boolean(invNumberValue) ||
  Boolean(rollNumberValue) ||
  Boolean(dyeLotValue) ||
  Boolean(noteValue);
// adjNumberValue intentionally excluded — Adj # lives in the DataTable gutter

const hasActiveFilters =
  hasActiveFilterTool || hasActiveSearchTool || Boolean(adjNumberValue);
// adjNumberValue included here so ListActionBar's Clear-all still resets the gutter search
```

**Compose — replace lines 266–351 with:**

```tsx
<div className="mx-4">
  <ListActionBar
    label="Adjustments"
    rowCount={rows.length}
    total={total}
    rowCountLabel="adjustments"
    hasActiveFilters={hasActiveFilters}
    onClearAll={handleClearAll}
  >
    <ToolbarMenuButton
      label="Filter"
      icon={SlidersHorizontal}
      active={hasActiveFilterTool}
    >
      <div className="flex w-[15rem] flex-col gap-2">
        <WarehousePicker {/* prop wiring unchanged */} />
        <CategoryPicker {/* prop wiring unchanged */} />
        <ProductPicker {/* prop wiring unchanged, category-scoped via handleCategoryChange */} />
      </div>
    </ToolbarMenuButton>

    <ToolbarMenuButton
      label="Search"
      icon={Search}
      active={hasActiveSearchTool}
    >
      <div className="flex w-[15rem] flex-col gap-2">
        <DebouncedSearchControl {/* Roll # — props unchanged */} />
        <DebouncedSearchControl {/* Inv # — props unchanged */} />
        <DebouncedSearchControl {/* Dye lot — props unchanged */} />
        <DebouncedSearchControl {/* Note — props unchanged */} />
      </div>
    </ToolbarMenuButton>
  </ListActionBar>

  <AdjustmentsTable {/* props unchanged */} />
</div>
```

> Wire all picker and search-control props exactly as they appear in the torn-down block — no prop changes. `handleCategoryChange` at line 189 (cascade-clears productId) wires to `CategoryPicker` unchanged.

**Keep unchanged (zero edits):**
- `EngineAdjustmentFilters` type (lines 43–52)
- `toEngineFilters` / `toAppFilters` (lines 54–83)
- Props signature (lines 86–103), including `initialSearchQuery` at line 93
- `useRouter` / `useRecordEntryNavigation` / `returnTo` / `router` (lines 108–110)
- `adaptedListFn` (lines 113–120)
- Full `useFetchListController` + all destructures (lines 122–146)
- `selected*Id` / `*Value` locals (lines 148–155)
- `warehouseLabel` / `categoryLabel` / `productLabel` useMemos (lines 157–178)
- All `handle*` callbacks (lines 180–211), including `handleClearAll` (lines 236–238 — correctly does NOT call `onSearchQueryChange` because there is no full-text search)
- `tableOptions` with `NumberSearchTabBody` for Adj # in `tabs[0]` (lines 243–261)
- `AdjustmentsTable` JSX (lines 353–378)

**Gotcha — do NOT nest a self-triggering `FilterControl` inside a `ToolbarMenuButton`** (button-in-a-button + double popover). Pickers compose directly in the Filter body.

## Migration (if schema changes)
None — frontend-only, no schema change.

## Done means
- `/check` green (build + typecheck + lint + test)
- The adjustments list renders `[Adjustments][x of x adjustments][Clear] … [Filter ▾][Search ▾]` — no create button, no legacy card border.
- Filter menu holds only: `WarehousePicker`, `CategoryPicker`, `ProductPicker`.
- Search menu holds only: Roll # / Inv # / Dye lot / Note `DebouncedSearchControl` bars.
- Adj # `NumberSearchTabBody` remains in the DataTable gutter `tableOptions.tabs[0]` — untouched.
- `hasActiveFilterTool` / `hasActiveSearchTool` / `hasActiveFilters` are three separate booleans.
- No `ListCreateButtonPortal`, no `message`/`pageError` block, no `SearchControl` added.
- Commit message ≤17 words ready — DO NOT COMMIT (user commits).
