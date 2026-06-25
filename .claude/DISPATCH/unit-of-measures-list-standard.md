# unit-of-measures-list-standard — Bring the Unit-of-Measures list view up to the standard list-view structure

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/engine` (scope it to the list-view engine + the unit-of-measures module list view) to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided. The SCOPE decision (Flag 1) is load-bearing — settle it BEFORE writing code.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval. AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
Bring the unit-of-measures list view into structural alignment with the canonical list-view pattern exemplified by the `user-activity` and `users` modules: split out a `table/` subfolder (columns + row-cell), fix the layout chrome (drop the double-border outer div and `SectionHeader`, adopt the `min-h-screen / mx-4 / inline title-pill` shape), align the date formatter, and wire pagination as far as the frontend-only constraint allows. FRONTEND-ONLY: backend packages (`packages/domain`, `packages/application`, `packages/db`) and every API route must NOT change. "Done" means UoM's list view mirrors the canonical module structure as far as the frontend-only constraint allows, with `/check` green.

## ⚑ Flags — decisions to make / potential gaps

**Flag 1 — SCOPE (load-bearing, settle FIRST):**
How far does "bring up to standard" go under the frontend-only constraint? Three options the research surfaced — present all three to the user; do NOT pick one yourself:

- **(A) Full standard with real server pagination** — `useFetchListController` + `HydrationBoundary` on the page + a `list-unit-of-measures-request.ts` that calls the API and returns `ListOutput<T>` with server-side slicing. This REQUIRES adding `UnitOfMeasureListRow` to `@builders/domain`, a `listUnitOfMeasuresUseCase` in `@builders/application`, and `skip`/`take` params in `packages/db/src/flooring/unit-of-measures/read-repository.ts`, plus updating the API route. ALL of that is backend — it violates the frontend-only constraint as written. If the user wants A, the constraint must change.

- **(B) Structural standard only (fully frontend-safe)** — Split the `table/` subfolder, fix layout chrome (drop `SectionHeader` + outer container div, adopt `div.min-h-screen.space-y-3 > div.mx-4 > inline title pill`), pass a `pagination` prop to `DataTable`. Keep the current SSR `initialRows` approach (no `useFetchListController`, no real pagination). Clean, genuinely frontend-only.

- **(C) Frontend-only adapter with client-side pagination** — Add `data/list-unit-of-measures-request.ts` that calls the existing `/api/unit-of-measures`, reads `{ unitOfMeasures }` off the response, and returns `{ rows: unitOfMeasures, total: unitOfMeasures.length }`. Wire `useFetchListController` + `HydrationBoundary` on the page. Pagination controls appear but always render all rows (page 1 of 1) until the backend supports slicing. Acceptable only if UoM's row volume stays small enough that fetching all rows on every load is tolerable.

**Flag 2 — Is `users` a target?**
Evidence says `users` is ALREADY fully on-standard (same structure/controller/pattern as `user-activity`), making it a READ-ONLY reference, not a target. Confirm with the user before starting, then leave `apps/web/modules/users/**` and `apps/web/app/dashboard/users/page.tsx` entirely untouched.

**Flag 3 — Date formatter:**
UoM's `createdAt` currently renders with `formatStableDateTime`; the canonical standard (`user-activity`, `users`) uses `formatEasternDateTime`. Both are exported from `@builders/domain`. Pick one consistently and apply it in `table/unit-of-measures-row-cell.tsx`. If the user has no preference, the standard wins (`formatEasternDateTime`), but surface the choice before committing.

**Flag 4 — Row type ownership:**
The canonical standard derives its row type from `@builders/domain` (e.g. `UserActivityListRow`, `UserListRow`). Under the frontend-only constraint you cannot add `UnitOfMeasureListRow` to domain, so the module-local `types.ts` `UnitOfMeasureRow` stays as the controller/table generic. Non-standard but functional — note the delta in your plan.

**Flag 5 — `abbreviation` column:**
`UnitOfMeasureRow` has a `name`, `abbreviation`, and `createdAt` field. The current inline column const (`unit-of-measures-table.tsx:7-10`) only renders `name` and `createdAt` — `abbreviation` is absent. Verify with the user whether that omission is intentional before the split. If intentional, keep it out of the new columns file; if not, add it.

**Flag 6 — Engine convention reminders:**
Mirror the canonical folder structure head-to-toe; build module-local only where the engine falls short. Defer alignment tests and `modules/shared` doc cleanup (same convention as prior sweeps). DO NOT COMMIT — the user always commits. Provide a commit message of ≤17 words when done.

---

## Scope

**In:**
- Split `table/` subfolder: extract `unit-of-measures-list-columns.ts` and `unit-of-measures-row-cell.tsx` out of the monolithic table file.
- Fix layout chrome in `unit-of-measures-client.tsx`: drop `SectionHeader` import + the outer `rounded-xl border bg-[var(--panel-background)]` container div; adopt `div.min-h-screen.space-y-3 > div.mx-4 > inline title-pill span + Table` shape.
- Pass a `pagination` prop to `DataTable` in `unit-of-measures-table.tsx`.
- Align the date formatter choice (Flag 3).
- Wire `useFetchListController` + `HydrationBoundary` on the page if option C is chosen (Flag 1).
- Add `data/list-unit-of-measures-request.ts` if option C is chosen (Flag 1).

**Out:**
- ALL backend: `packages/domain/**`, `packages/application/**`, `packages/db/**`, every file under `apps/web/app/api/unit-of-measures/`, `apps/web/app/api/users/`, `apps/web/app/api/user-activity/` — do NOT touch.
- The list-view engine internals (`apps/web/engines/list-view/**`, incl. `DataTable`, `PaginateContract`, `useFetchListController`) — consumed only, do NOT modify.
- `apps/web/engines/common/headers/section-header.tsx` — the component stays for its other consumers; only stop importing it from UoM client.
- Reference modules `apps/web/modules/users/**`, `apps/web/modules/user-activity/**`, and their pages — READ-ONLY reference, do NOT edit.
- Any new backend constructs (use cases, list-view domain rows, DB skip/take params, updated API routes) — blocked by frontend-only constraint unless Flag 1 resolves to option A with a scope change.

---

## Files you own (do not edit anything outside this list)

```
apps/web/app/dashboard/unit-of-measures/page.tsx          ← edit only if option C (HydrationBoundary)
apps/web/modules/unit-of-measures/components/list/unit-of-measures-client.tsx   ← layout fix
apps/web/modules/unit-of-measures/components/list/unit-of-measures-table.tsx    ← slim down; add pagination prop
apps/web/modules/unit-of-measures/components/list/table/unit-of-measures-list-columns.ts   ← NEW
apps/web/modules/unit-of-measures/components/list/table/unit-of-measures-row-cell.tsx      ← NEW
apps/web/modules/unit-of-measures/types.ts                ← if row-type alignment needed (Flag 4)
apps/web/modules/unit-of-measures/data/queries.ts         ← only if option C touches it
apps/web/modules/unit-of-measures/data/list-unit-of-measures-request.ts         ← NEW, only if option C
```

---

## Layer-by-layer map

### Gold-standard reference (READ-ONLY)

**user-activity page** `apps/web/app/dashboard/user-activity/page.tsx:11-44`
Parse `searchParams` → `new QueryClient()` → `prefetchQuery({ queryKey:[...USER_ACTIVITY_LIST_QUERY_KEY, initialInput], queryFn })` → `<HydrationBoundary state={dehydrate(queryClient)}><UserActivityClient initialPage={initialInput.page}/></HydrationBoundary>`.

**user-activity client** `apps/web/modules/user-activity/components/list/user-activity-client.tsx:20-64`
`useFetchListController<Row, Record<string,never>>({ mode:"fetch", queryKey:[...QUERY_KEY], listFn, initialPage, pageSize, tableKey:"user-activity-main", freshness: LIST_FRESHNESS_STANDARD })`. Layout: outer `div.min-h-screen.space-y-3 > div.mx-4 > inline title-pill span + Table`.

**user-activity table** `apps/web/modules/user-activity/components/list/user-activity-table.tsx:8-24`
Receives `rows` + `pagination?: PaginateContract`, both passed to `DataTable`. No inline column const, no inline renderCell.

**user-activity table subfolder**
- `…/list/table/user-activity-list-columns.ts` — column definitions
- `…/list/table/user-activity-row-cell.tsx` — row renderer

**user-activity request** `apps/web/modules/user-activity/data/list-user-activity-request.ts:1-55`
`parse*FromSearchParams` → `build*SearchString` → `async list*Request(input): Promise<ListOutput<T>>` (calls `/api/user-activity`) → `*_LIST_QUERY_KEY`.

`users` equivalents follow the byte-for-byte same pattern:
- Page: `apps/web/app/dashboard/users/page.tsx:1-44`
- Client: `apps/web/modules/users/components/list/users-client.tsx:1-62` (`tableKey:"users-main"`)
- Table: `…/users-table.tsx`
- Columns: `…/list/table/users-list-columns.ts`
- Cell: `…/list/table/users-row-cell.tsx`
- Request: `apps/web/modules/users/data/list-users-request.ts:1-48`

---

### Target — unit-of-measures (what dev-2 edits)

**Current page** `apps/web/app/dashboard/unit-of-measures/page.tsx:1-22`
Calls `getUnitOfMeasuresPageData()` (re-exported via `modules/unit-of-measures/data/queries.ts:1-5`), renders `<UnitOfMeasuresClient initialRows={pageData.data}/>`. No `QueryClient`, no `prefetchQuery`, no `HydrationBoundary`. Pure SSR — if scope stays at B, the page changes minimally or not at all.

**Current client** `apps/web/modules/unit-of-measures/components/list/unit-of-measures-client.tsx:1-20`
Receives `initialRows: UnitOfMeasureRow[]` (all rows, no pagination). No controller hook. Renders `<SectionHeader title="Unit Of Measures"/>` (from `@/engines/common`) + `<UnitOfMeasuresTable rows={initialRows}/>` inside an outer `rounded-xl border bg-[var(--panel-background)]` div.
- **Fix needed:** drop `SectionHeader` import + the outer container div (DataTable renders its own `rounded-xl border bg-[var(--panel-background)]` wrapper at `apps/web/engines/list-view/table/data-table.tsx:207` — the outer div causes double-border). Adopt `div.min-h-screen.space-y-3 > div.mx-4 > inline title-pill span + <UnitOfMeasuresTable/>`.

**Current table** `apps/web/modules/unit-of-measures/components/list/unit-of-measures-table.tsx:1-34`
`DataTable<UnitOfMeasureRow>` with an INLINE column const `UNIT_OF_MEASURES_LIST_COLUMNS` (lines 7-10) and an INLINE `renderCell` switch (lines 22-33). No `table/` subfolder. No `pagination` prop.
- **Fix needed:** extract columns to `table/unit-of-measures-list-columns.ts`; extract renderCell to `table/unit-of-measures-row-cell.tsx`; add `pagination?: PaginateContract` prop and thread it to `DataTable`.

**Current row type** `apps/web/modules/unit-of-measures/types.ts`
Module-local `UnitOfMeasureRow` with `name`, `abbreviation`, `createdAt`. The inline column const only surfaces `name` and `createdAt` — verify `abbreviation` omission with user before splitting (Flag 5).

**Date formatter gap**
UoM uses `formatStableDateTime`; standard uses `formatEasternDateTime`. Both from `@builders/domain`. Resolve per Flag 3.

**Backend blocker (read-only awareness)**
`apps/web/app/api/unit-of-measures/route.ts:16` returns `{ unitOfMeasures: await listUnitOfMeasures() }` — flat array, no `total`, no `page`/`pageSize` params, different response key from the `ListOutput<T>` contract the engine expects. No `listUnitOfMeasuresUseCase` exists in `@builders/application`. No skip/take in `packages/db/src/flooring/unit-of-measures/read-repository.ts`. This is the blocker that prevents option A without a backend scope change.

---

## Migration (if schema changes)
None — frontend-only, no schema change.

---

## Done means
- `/check` green (build + typecheck + lint + test)
- `table/` subfolder created with columns + row-cell extracted from the monolithic table file
- Layout chrome corrected: no double-border, `SectionHeader` no longer imported by UoM client, `min-h-screen / mx-4 / inline title-pill` shape matches the reference
- `pagination` prop wired into `DataTable` call in `unit-of-measures-table.tsx`
- Date formatter consistent with the chosen option (Flag 3 resolved)
- Flag 1 scope decision recorded and honored (option B = structural only, or option C = adapter, or option A = backend scope expanded)
- Reference modules (`users`, `user-activity`) untouched
- Backend packages and API routes untouched
- Commit message ≤17 words ready — DO NOT COMMIT, the user commits
