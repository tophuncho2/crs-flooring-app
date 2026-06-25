# Normalize the row#-search menu tab across all 9 list modules

## Context

The dispatched work (4 commits, `e6eace37`..`83f5d658`) relocated each module's record-number
exact-search bar (WO#, Inv#, PROD#, Adj#, PROP#, IMP#, JT#, ET#, Store#) out of the list
toolbar and into the table's gutter **TableOptions menu** as a tab. Because four branches authored
it in parallel from open flags, two cosmetic inconsistencies landed (surfaced by `/dig`):

1. **Body styling drift (visible).** `work-orders` and `inventory` wrap the search input in a
   module-local body component with a fixed width + case reset
   (`flex w-[15rem] flex-col normal-case tracking-normal`). The **other 7** inline a bare
   `<DebouncedSearchControl>` with no wrapper — so their menu search box renders at the panel's
   default width instead of the deliberate 15rem. This is the one difference a UI pass actually sees.
2. **Idiom drift (invisible).** Tab `key` is `"number"` in 5 modules but field-specific
   (`"invNumber"`, `"impNumber"`, `"propNumber"`, `"workOrderNumber"`) in 4; tab `active` uses three
   equivalent idioms (`value.trim().length > 0`, `value.length > 0`, `Boolean(value)`).

Outcome: one shared engine component is the single source of truth for the tab body (kills drift #1
and prevents its recurrence), and the `key`/`active` idiom is normalized by hand across all 9
(drift #2). Behavior is unchanged — same filter keys, same handlers, purely presentational.

This aligns with the repo's standing conventions: **consolidate shared, not per-module**
(`[[consolidate-shared-not-per-module]]`) and **new shared engine code lives in
`apps/web/engines/`** (`[[web-engines-convention]]`). The two module-local bodies become the shared one.

## Approach — one shared engine body, consumed by all 9

Extract the WO/inventory body verbatim into a single engine component and point every module at it.

### 1. Create the shared component (1 new file)

`apps/web/engines/list-view/toolbar/search/number-search-tab-body.tsx`

- Sibling of `debounced-search-control.tsx` (same `toolbar/search/` folder — `SortMenuBody`, the
  analog tab body, lives one folder over in `toolbar/sort/sort-menu.tsx`; placing this next to the
  control it wraps is the closer fit).
- Props: `{ value: string; onChange: (next: string) => void; placeholder?: string; ariaLabel?: string }`.
  `placeholder`/`ariaLabel` MUST be props (each module differs: "WO #", "Inv #", "PROD #", …) — do
  not hardcode them as the two existing bodies did.
- Body is exactly the existing bodies' markup (carry over the doc comment about the portal/case reset):

  ```tsx
  <div className="flex w-[15rem] flex-col normal-case tracking-normal">
    <DebouncedSearchControl value={value} onCommit={onChange} placeholder={placeholder} ariaLabel={ariaLabel} />
  </div>
  ```
  Keep `w-[15rem]` (the existing committed convention; `SortMenuBody`'s responsive
  `w-[min(20rem,calc(100vw-3rem))]` is a different control and not the target here).

### 2. Export it through the barrel (1 edit)

Add `export * from "./number-search-tab-body"` to
`apps/web/engines/list-view/toolbar/search/index.ts`. Upstream barrels (`toolbar/index.ts`,
`list-view/index.ts`) already re-export `./search` — no further barrel edits. Consumers import
`NumberSearchTabBody` from `@/engines/list-view`.

### 3. Delete the two module-local bodies (2 deletions)

- `apps/web/modules/work-orders/components/list/toolbar-controls/work-order-number-filter-body.tsx`
- `apps/web/modules/inventory/components/list/toolbar-controls/inventory-number-filter-body.tsx`

Confirmed single-importer (only their own client). Remove their imports from the two clients.

### 4. Repoint + normalize all 9 clients (9 edits — same pattern each)

In every `*-client.tsx`, the tab's `render` becomes the shared body, and `key`/`active` are unified:

```tsx
{
  key: "number",                              // uniform across all 9
  label: "WO #",                              // unchanged — module-specific
  active: <value>.trim().length > 0,          // uniform idiom across all 9
  render: () => (
    <NumberSearchTabBody
      value={<value>}
      onChange={<adapter>}                     // see below
      placeholder="WO #"
      ariaLabel="Search work orders by work order number"
    />
  ),
}
```

- **`<adapter>` differs by module, leave as-is:** modules with a dedicated handler pass it directly
  (`handleProdNumberChange`, `handleImpNumberChange`, `handlePropNumberChange`,
  `handleJobTypeNumberChange`, `handleEntityTypeNumberChange`, `handleStoreNumberChange`); modules on
  the generic helper pass `(next) => handleTextFilterChange("<key>", next)` (`work-orders`,
  `inventory`, `adjustments`).
- **Import swap:** add `NumberSearchTabBody` to the `@/engines/list-view` import. `work-orders` and
  `inventory` ALSO drop the deleted local-body import; the 7 inline modules keep importing
  `DebouncedSearchControl` only if they still use it elsewhere in their toolbar — **`job-types`,
  `entity-types`, `warehouse` no longer reference `DebouncedSearchControl` after this change, so
  remove that now-unused import** (the others — `adjustments`, `products`, `imports`, `properties`,
  `inventory`, `work-orders` — still use it for their remaining toolbar bars; keep it).
- `work-orders` (tabs: Sort · WO# · Date) and `inventory` (tabs: Sort · Inv#) keep their multi-tab
  arrays; only the number tab's `render`/`key`/`active` change.

Representative client paths (pattern is identical across all):
`apps/web/modules/{work-orders,inventory,adjustments,products,imports,properties,job-types,entity-types,warehouse}/components/list/*-client.tsx`

## Files

| Action | Path | Note |
|--------|------|------|
| create | `engines/list-view/toolbar/search/number-search-tab-body.tsx` | shared body, props-driven placeholder/ariaLabel |
| edit   | `engines/list-view/toolbar/search/index.ts` | add one barrel export |
| delete | `modules/work-orders/.../toolbar-controls/work-order-number-filter-body.tsx` | single-importer |
| delete | `modules/inventory/.../toolbar-controls/inventory-number-filter-body.tsx` | single-importer |
| edit   | 9 × `modules/<m>/components/list/<m>-client.tsx` | repoint render to shared body; unify `key`/`active`; fix imports |

No table-component (`*-table.tsx`) edits — the `tableOptions` prop plumbing is already correct and uniform.

## Out of scope / non-negotiables

- No behavior change: same filter keys, same handlers, same exact-`*NumberInt` match. Purely presentational.
- No schema / domain / data / application / api changes. No migration.
- `manufacturer` is excluded (it has no row#-search bar). Don't touch other toolbar bars
  (`adjustments` Inv#, products Color/Style/Naming, etc.) — only the row-number tab.
- DO NOT COMMIT — the user commits. Provide a ≤17-word commit message.

## Verification

1. `/check` green (build + typecheck + lint + test). Typecheck proves the shared component's props
   and all 9 call sites line up; lint proves no leftover unused `DebouncedSearchControl` import in
   `job-types`/`entity-types`/`warehouse`.
2. Grep guards: `rg "NumberFilterBody"` returns **only** the new engine file (both local bodies gone);
   `rg "key: \"(invNumber|impNumber|propNumber|workOrderNumber)\"" apps/web/modules` returns nothing
   (all unified to `"number"`).
3. UI pass (the live test already underway): open the gutter **Menu → number tab** on a previously-inline
   module (e.g. **products**) and on **inventory** — the search box is now the same 15rem width and
   styling in both. Type a number → rows filter, tab shows the active dot, menu stays open (auto-commit).
   Spot-check `job-types`/`entity-types`/`warehouse` (their number bar was the toolbar's main control).
