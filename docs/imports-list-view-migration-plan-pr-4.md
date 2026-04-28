# Imports List-View Migration — PR 4 Plan (Async RichDropdown + Products Pilot)

**As of:** 2026-04-28. **Status:** plan only — not executed.
**Supersedes:** the PR 4 portion of [imports-list-view-migration-plan-pr-4-6.md](imports-list-view-migration-plan-pr-4-6.md). The original plan targeted `SearchDropdown` (the simpler client-side filter primitive with the search box rendered above the trigger). Confirmed in code review that **`RichDropdown` is the dropdown the user wants async** — search bar inside the popover, clear button, title + optional subtitles per option. PR 4 retargets to `RichDropdown` and pivots the "primitive only / no consumer" recommendation: a real consumer (the products picker on import staged rows) ships in the same PR so the abstraction is validated against real shape.

---

## TL;DR

Extend `RichDropdown` with an optional `searchFn`. When provided, the in-popover search runs against the server (debounced, cached, abortable) instead of filtering an in-memory array. Build the React Query plumbing in a new shared controller `apps/web/controllers/dropdown-search/` so any dropdown — now and later — can opt in. Add a server-backed search for products. Add a `RichDropdownCell` cell wrapper. Pilot in the import staged-rows product picker.

**Headlines (estimate)**
- New files: **~8**
- Modified files: **~3**
- New deps: **0**
- Engine imports added/removed: **0**

---

## Why this PR is shaped this way

1. **The dropdown the user described already exists** — `RichDropdown` (`apps/web/components/dropdowns/rich-dropdown/rich-dropdown.tsx`). Search-in-popover, clear button, title + optional `subtitles[]` per option. It currently does client-side substring filtering across `title` + `subtitles`. The shape is right; the data path is the pain point.
2. **Products is the canonical "thousands of options" picker.** Today every record page eagerly server-fetches `productOptions` (entire product table) into the page payload to drive a picker that filters in memory. That's the actual scaling problem PR 4 solves.
3. **The abstraction is generic, not products-specific.** Manufacturers, locations, customers, work-order references, etc. will all want the same shape later. PR 4 lands the controller/cell/component once and the only per-module work for future adopters is a `searchFn` + a route.
4. **Bundling primitive + pilot in one PR validates the prop surface against real shape.** Splitting (4a primitive, 4b consumer) means 4a has no real-world test of the contract.

---

## Decisions baked in (recommendations — confirm before execute)

1. **`RichDropdown` (not `SearchDropdown`) is the dropdown that gains async support.** `SearchDropdown` stays as-is (separate primitive, simpler shape, still useful for small client-side filter cases). No deprecation in this PR.
2. **`searchFn` and static `options` are mutually exclusive on the prop surface.** `searchFn` provided ⇒ popover lists are driven by the search; the static `options` prop is ignored. `searchFn` omitted ⇒ today's client-side filter behavior. Single primitive, two modes, no flag soup.
3. **`seedOptions` carries the already-selected option.** When a row already has a `productId`, the trigger needs to render that product's title even before the user opens the popover (or types a query). Consumers pass a `seedOptions` array (typically the static eager-loaded list, or a per-row hydrated array) so the trigger lookup works. Inside the popover the search results take over.
4. **Eager `productOptions` loading stays in PR 4.** The record page continues to server-fetch the full product list. PR 4 uses it as `seedOptions` and as the source of `selectedProduct.stockUnit` (read for the unit cell). Removing the eager load is a separate sweep that requires resolving where stockUnit comes from when only the productId is known.
5. **Option side-channel (stockUnit, categoryId) lives on the consumer, not the option.** `RichDropdownOption` stays strict (`{ id, title, subtitles[], disabled? }`). The staged-rows section keeps its own `productId → ProductOption` lookup map (it already has one). Side data does not bleed into the shared dropdown contract.
6. **Category filter narrows the search via consumer-wrapped `searchFn`.** The component knows nothing about categories — it passes `q` to `searchFn`. The consumer closes over its row's `categoryFilterId` when constructing the `searchFn` reference: `const searchFn = useCallback((q) => searchProductsForDropdownRequest({ q, categoryId: row.categoryFilterId, limit: 50 }), [row.categoryFilterId])`.
7. **Single bundled PR, not a 4a/4b split.**

---

## Layered shape

### 1. Component primitive (extend)

**File:** `apps/web/components/dropdowns/rich-dropdown/rich-dropdown.tsx`

Add to `RichDropdownProps`:
```ts
searchFn?: (q: string, signal?: AbortSignal) => Promise<RichDropdownOption[]>
searchKey?: readonly unknown[]                  // React Query base key, e.g. ["products", "dropdown-search"]
searchDebounceMs?: number                       // default 300
seedOptions?: ReadonlyArray<RichDropdownOption> // for trigger label lookup
minQueryLength?: number                         // default 0; gate searches until query length crosses this
```

Behavior change inside the component:
- If `searchFn` is provided: drive the popover list from the new controller hook (item 2 below). Trigger label lookup walks `seedOptions` first, then current search results. Static `options` prop is ignored; type-system can't reject this without a discriminator, so add a runtime dev-mode warning when both are passed.
- If `searchFn` is omitted: behave exactly as today. Zero behavior change for any current consumer.

Search-input UX inside the popover does not change visually. Loading indicator on the right edge of the search input while `isFetching` is true. Empty state messaging stays via `emptyMessage`.

### 2. Shared controller (new home)

**Folder:** `apps/web/controllers/dropdown-search/` (called out in `apps/web/controllers/CLAUDE.md` as a legitimate bucket; the folder doesn't exist yet).

Files:
- `use-dropdown-search.ts` — React Query–backed:
  ```ts
  export function useDropdownSearch({
    searchFn,
    searchKey,
    query,
    debounceMs = 300,
    enabled = true,
    minQueryLength = 0,
    staleTimeMs,
  }: DropdownSearchInput): DropdownSearchOutput
  ```
  Internally:
  - Debounces `query` to a delayed `debouncedQuery`.
  - `useQuery({ queryKey: [...searchKey, debouncedQuery], queryFn: ({ signal }) => searchFn(debouncedQuery, signal), enabled: enabled && debouncedQuery.length >= minQueryLength, placeholderData: keepPreviousData, staleTime: staleTimeMs })`.
  - Returns `{ options, isLoading, isFetching, error, debouncedQuery }`.
- `contracts/dropdown-search-input.ts` — `DropdownSearchInput`/`DropdownSearchOutput` types.
- `index.ts` — re-exports.

No new `CLAUDE.md` file (the parent `controllers/CLAUDE.md` already documents this bucket).

### 3. Cell wrapper (new file)

**File:** `apps/web/components/cells/rich-dropdown-cell.tsx`

Mirrors `dropdown-cell.tsx` but wraps `RichDropdown`:
```ts
export type RichDropdownCellProps = CellProps<string | null> & {
  options?: ReadonlyArray<RichDropdownOption>
  searchFn?: RichDropdownProps["searchFn"]
  searchKey?: readonly unknown[]
  seedOptions?: ReadonlyArray<RichDropdownOption>
  placeholder?: string
}
```
- Editable mode: renders `<RichDropdown>` and forwards.
- Static (`editable: false`) mode: looks up the value across `seedOptions` first, then `options`, renders title text. Same pattern as `DropdownCell`.

### 4. Server — products dropdown search

**Repo addition:** `packages/db/src/flooring/products/read-repository.ts`
- `searchProductsForDropdown({ q, limit, categoryId? }, client?)` returning `Array<{ id, name, style, color, manufacturerName, categoryId, stockUnit }>` (raw record shape — application layer reshapes for the dropdown contract).
- Substring match across `name`, `style`, `color`, `manufacturer.companyName` (case-insensitive). Optional `categoryId` filter. `take` capped (default 50, max 100). Order by `name asc`.

**Use case:** new file `packages/application/src/flooring/products/search-products-for-dropdown.ts`
- `searchProductsForDropdownUseCase({ q, limit, categoryId? }) → Promise<RichDropdownOption[]>` (or, more accurately, a structurally-compatible shape — application layer should not import `RichDropdownOption`; it returns `{ id, title, subtitles[] }` shaped as a domain DTO, the route layer hands it to the client which casts to the dropdown option shape).
- Validates `q` non-empty, max length ~50; `limit` ∈ [1, 100]; `categoryId` is a UUID if provided.
- `title` = `buildFlooringProductDisplayName(product)`. `subtitles` = `[manufacturerName, [style, color].filter(Boolean).join(" / ")]` (skipping empty subtitles).

**Route:** new file `apps/web/app/api/products/dropdown-search/route.ts`
- GET. `applyRoutePolicy` (toolSlug TBD — likely `"warehouse"` mirroring the imports route). `enforceQueryRateLimit`. Zod query validator. Use case. `routeJson({ options: [...] })`.

### 5. Module data wrapper

**File:** `apps/web/modules/products/data/search-products-for-dropdown-request.ts`
- `searchProductsForDropdownRequest({ q, limit, categoryId? }) → Promise<RichDropdownOption[]>`. Wraps `requestJson`. Builds `URLSearchParams` from the input. No `"use client"` directive (per the lesson from PR 5: keep wrappers framework-agnostic so server callers can import them too).
- Exports `PRODUCTS_DROPDOWN_SEARCH_QUERY_KEY = ["products", "dropdown-search"] as const` for callers to thread into the controller as `searchKey`.

### 6. Pilot consumer

**File:** `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx`

Swap the product cell:
```tsx
case "product":
  return (
    <RichDropdownCell
      editable={editable}
      value={row.productId || null}
      onChange={(next) => onRowFieldChange(index, "productId", next ?? "")}
      seedOptions={productOptions.map(toRichOption)}
      searchFn={(q, signal) =>
        searchProductsForDropdownRequest({
          q,
          limit: 50,
          categoryId: row.categoryFilterId ?? undefined,
          signal,
        })
      }
      searchKey={[...PRODUCTS_DROPDOWN_SEARCH_QUERY_KEY, row.categoryFilterId ?? null]}
      placeholder="Select product"
      ariaLabel={`Row ${index + 1} product`}
    />
  )
```

Open detail: `searchKey` includes `row.categoryFilterId` so React Query caches per-category-filter slices independently. The `searchFn` reference is recreated per render, but React Query keys off `searchKey` + `q`, not function identity — no thrash.

### 7. Tests (cheap additions)

- `apps/web/tests/components/dropdowns/rich-dropdown-async.test.tsx` — render `<RichDropdown searchFn={mock} />`, type into the search box, assert mock called with debounce, results render.
- `apps/web/tests/controllers/dropdown-search/use-dropdown-search.test.ts` — debounce timing, `placeholderData`, abort on rapid retype.
- (Optional) `apps/web/tests/modules/products/search-products-for-dropdown-request.test.ts` — URL param building.

---

## Open questions to land before execute

1. **Static `productOptions` removal** — keep eager load in PR 4 (recommended), or rip it out in this PR? Removal cascades into stockUnit lookup and the trigger label path. Recommendation: **keep**; do removal as a separate sweep after the record-view migration starts.
2. **`RichDropdownOption` data side-channel** — extend type with `data?: unknown`, or keep consumer-side lookups (recommended)? Recommendation: **consumer-side**.
3. **Category filter behavior** — wrap `searchFn` per-row with `categoryFilterId` baked in (recommended). Confirm UX: does typing while a category filter is set show only matches in that category? (yes, that's the current behavior in client-mode; preserve it).
4. **Existing `SearchDropdown` (the simpler one)** — leave alone (recommended), or also extend with `searchFn`? Recommendation: **leave alone**.
5. **Single bundled PR** vs split (4a primitive / 4b consumer). Recommendation: **bundled**.
6. **Route auth scope** — confirm `toolSlug: "warehouse"` matches the existing imports route policy, and is the right scope for "any user who can pick products in any context" (manufacturers' product picker, work-orders, etc.). May need to be `null` (any authenticated user) or a more granular slug. Flagged for review when route lands.
7. **`minQueryLength` default** — `0` (search empty = list top-N alphabetically) vs `1` or `2` (gate the network call until the user types). Recommendation: **0**, with `limit: 50` server-side cap. Cheap. Lets users browse without typing if the list is small enough.

---

## Verification plan (when executed)

- `pnpm typecheck` — expect no new errors over baseline (57 in web workspace).
- `pnpm test` — all baseline tests still pass; new tests pass.
- Dev server smoke:
  - Open an import record → click product cell → popover shows the search input + clear button + first ~50 products.
  - Type "vinyl" → after ~300ms, network shows one `GET /api/products/dropdown-search?q=vinyl&limit=50` → results repaint.
  - Set category filter → reopen → searches now narrow to that category (URL shows `&categoryId=…`).
  - Select a product → trigger shows the title; reopen → that product is highlighted.
  - Clear button (visible when a value is selected) → emits `null`; trigger goes back to placeholder.
  - Rapid typing → at most one in-flight request at a time (abort on retype), `keepPreviousData` shows previous results during the new query.
  - Navigate away with the popover open → no errors / abort warnings in console.

---

## Risks

- **Prop-surface bloat on `RichDropdown`** — five new optional props (`searchFn`, `searchKey`, `searchDebounceMs`, `seedOptions`, `minQueryLength`). Mitigation: all optional, default behavior unchanged when omitted.
- **Eager `productOptions` load doesn't go away in this PR.** If real users have many thousands of products, the record page still server-fetches them all. PR 4 makes the *picker* fast under that load (search hits a narrow query), but doesn't fix the page payload size. Followed up in a separate sweep.
- **Search-input focus management.** When `placeholderData: keepPreviousData` swaps in new results, the search input must keep focus. React Query handles this naturally (no remount), but worth verifying.
- **Abort behavior on rapid retype.** Important for not flooding the API. The use case will involve a large `LIKE` over flooring product rows; concurrent requests should cancel old ones.

---

## Out of scope

- Eager-load removal (separate sweep).
- Async upgrade of `SearchDropdown` (separate PR if ever).
- Other dropdown-using modules (manufacturers, locations, customers) adopting `searchFn` — they wire up when their respective list views or record views migrate.
- `DROPDOWN_FRESHNESS_*` presets in `apps/web/query-policies/` — `useDropdownSearch` takes `staleTimeMs` directly today; presets land if/when a second consumer wants the same tuning.
- PR 6 (canonical pattern doc).

---

## Definition of done

- `RichDropdown` accepts `searchFn` and renders async-driven options behind it.
- `useDropdownSearch` exists in the new shared controller home.
- `RichDropdownCell` exists and consumers can drop it into a `Grid` cell with one prop swap.
- Products dropdown-search route + use case + repo function exist and return `RichDropdownOption`-shaped results.
- Import staged-rows product cell renders via `RichDropdownCell` against the live route.
- Manual smoke pass on the dev server confirms the verification plan items.
- Typecheck + tests at baseline.
