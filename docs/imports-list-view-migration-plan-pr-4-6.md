# Imports List-View Migration — Forward Plan (PRs 4–6)

**As of:** 2026-04-27, after PR 3 ships clean. Companion to [imports-list-view-migration-progress.md](imports-list-view-migration-progress.md).

PRs 1–3 delivered: foundations, controller swap (SSR mode), and server-driven fetch mode with hydration. PRs 4–6 finish the canonical pattern: async dropdown primitive, mutation invalidation, and the pattern doc.

---

## PR 4 — Async dropdown primitive

**Goal:** make `SearchDropdown` the React Query–backed sibling to `RichDropdown`. Optional `searchFn` prop turns it into an async-backed dropdown for thousands-of-rows option sets. Static-enum dropdowns continue to use `RichDropdown`.

### Audit before building

The first task is a 5-minute audit: does any imports flow today need an async dropdown? The candidates are:
- Manufacturer picker on the import primary form.
- Warehouse picker on the import primary form.
- Product picker on staged-inventory rows.
- Location picker on staged-inventory rows.

Imports option counts today are small (handful of warehouses, dozens of manufacturers). They likely fit static `RichDropdown` fine. **If no imports flow needs async right now, the primitive ships standalone (no consumer in imports), validating the pattern for future modules.** This is the recommended path.

### Files

**New:**
- `packages/application/src/flooring/imports/search-imports-for-dropdown.ts` — `searchImportsForDropdownUseCase({ q, limit })` returning `{ id, label, sublabel? }[]`. Uses the same allowlist + validation pattern as `listImportsUseCase`.
- `apps/web/app/api/imports/dropdown-search/route.ts` — GET handler. Same `applyRoutePolicy` + `enforceQueryRateLimit` shape as the list route. Zod-validated query (`q: string, limit: number`). Returns `{ options: DropdownOption[] }`.

**Modified:**
- `apps/web/components/dropdowns/search-dropdown.tsx` — extend behind same prop surface per the components CLAUDE.md ("future hardening lands behind the same prop surface"). Add `searchFn?: (q: string) => Promise<DropdownOption[]>` and `searchDebounceMs?: number = 300`. When `searchFn` supplied, use React Query (`useQuery({ queryKey: [searchKey, q], queryFn: () => searchFn(q), placeholderData: keepPreviousData, enabled: q.length > 0 }`). When omitted, keep existing client-side filter behavior.

**Out:** no consumer wiring in imports unless the audit identifies a flow that needs it. If a flow does need it, replace its `RichDropdown` with `SearchDropdown` configured with `searchFn`.

### Verification
- Storybook-style example route or manual spike against the new `/api/imports/dropdown-search`.
- Debounce confirmed: typing fast → ≤1 fetch per ~300 ms.
- `keepPreviousData`: previous results stay visible while next query loads.

### Risks
- Choosing the right prop surface for `searchFn` so existing static-options consumers don't break. Mitigation: `searchFn` is optional; existing `options` prop continues to drive client-side filter.

---

## PR 5 — Mutation invalidation

**Goal:** imports list refreshes automatically after every mutation. No manual reload.

### Decisions baked in

- Invalidation lives in the **controller** that calls the mutation, not in `data/mutations.ts`. Per `apps/web/modules/CLAUDE.md`: data layer stays framework-free (no React Query coupling).
- `refetchOnWindowFocus: true` is already set globally in PR 1's `<AppProviders>`. Tab-return refresh works for free.
- **No list-level polling for imports.** Audit showed `mark-for-import` is the only async outbox flow today, and it lives on the record-detail page — not the list. Polling is genuinely speculative for imports' list view; deferred to whichever module actually has a list-level pending state (likely cut-logs or work-orders later).

### Files

**Modified:**
- `apps/web/modules/imports/controllers/use-imports-list-controller.ts` — wrap each mutation in `useMutation`:
  - `createImportRequest` → on success: `queryClient.invalidateQueries({ queryKey: IMPORTS_LIST_QUERY_KEY })`, set message ("Import created"), navigate to detail.
  - `updateImportRequest` → on success: invalidate + reconcile.
  - `deleteImportRequest` → on success: invalidate + navigate back to list.
  - `updateImportStagedInventoryRowsRequest` and `markStagedRowsForImportRequest` → invalidate (these affect the staged/live counts shown in the list row).
- The `setMessage`/`setPageError` setters from the simplified controller (PR 3) get wired up here. Replaces any stub message-passing.

### Verification
- Create an import via the create form → returns to list, list shows the new row without manual reload.
- Delete an import → list refreshes without the deleted row.
- Edit an import (primary fields, staged rows) → list row reflects the new data on return.
- Tab away and back → list refetches via `refetchOnWindowFocus`.

### Risks
- Optimistic vs. invalidation-based update: invalidation triggers a full refetch (~100 ms latency). For UX parity with today, this is fine. Optimistic updates are a future enhancement.
- Race: if a user navigates away from the list before the invalidation refetch completes, the in-flight request is canceled cleanly by React Query's gcTime. No leak.

---

## PR 6 — Canonical pattern doc

**Goal:** one short doc that the next module sweep follows mechanically, so inventory / work-orders / templates can adopt the pattern with no fresh design.

### File

- `docs/architecture/list-view-canonical-pattern.md` — covers:
  1. The `ListInput<TFilters>`/`ListOutput<TRow>` contract (`packages/application/src/list-view/contracts.ts`).
  2. Where the use case lives: `packages/application/src/<scope>/<module>/list-<module>.ts`. Allowlist constants exported alongside.
  3. Where the repo function lives: `packages/db/src/<scope>/<module>/read-repository.ts`. Imports' precedent: `listImportsForListView`.
  4. GET route shape: `/api/<module>/route.ts`. `applyRoutePolicy` (toolSlug) + `enforceQueryRateLimit` + Zod query validator + use case + `routeJson`.
  5. Module data wrapper: `apps/web/modules/<module>/data/list-<module>-request.ts`. Typed `listFn` + `parseSearchParams` + `QUERY_KEY` constant.
  6. Page shape: thin async server component. `requireToolAccess`, `getResolvedUserTablePreference`, `parseSearchParams`, prefetch via use case, `<HydrationBoundary>`.
  7. Client component: `useServerListController({ mode: "fetch", queryKey, listFn, initialSearchQuery, initialSort, initialGroupField, initialPage, pageSize, tableKey, initialTablePreferences, allowedSortFields, allowedGroupFields })`.
  8. Mutation invalidation pattern (from PR 5).
  9. Where polling fits when a module needs row-level pending state (extending `usePendingWorkflowPolling` to the list level).
- References imports as the precedent. Each section points to the actual file in the imports module.

No code changes. Doc-only.

### Verification
- Doc reviewed for completeness against imports as precedent.
- Test: run an inventory pilot adoption (separate sweep) and confirm the doc is sufficient with no design questions left over.

---

## Sequencing recommendation

Three PRs, in this order:

1. **PR 4** first if a current imports flow benefits — otherwise small primitive-only PR.
2. **PR 5** independent of PR 4. Could ship before PR 4 if PR 4's audit takes time.
3. **PR 6** last, after PRs 4 and 5 are in (so the doc reflects what's actually shipped).

**Alternative:** PR 4 + PR 5 bundled into one if both turn out small (PR 4 audit shows no consumer + PR 5 is mechanical). Trade-off: cleaner scope vs. fewer PRs to review.

---

## Decisions still open (for user input)

These are flagged in the AskUserQuestion at the end of this turn:

1. **PR 4 scope:** build the primitive even if no imports flow needs an async dropdown today, vs defer until a module that does.
2. **PR 4 + PR 5 packaging:** ship as separate PRs vs one bundled PR.
3. **PR 5 polling:** include a list-level polling pass to validate the pattern, vs skip and revisit when the first module that needs it migrates.

---

## Risks across PR 4–6

- **`SearchDropdown` extension** could break existing static-options consumers if the prop surface change isn't perfectly additive. Mitigation: keep `searchFn` strictly optional; existing `options` prop unchanged.
- **Mutation invalidation timing:** `invalidateQueries` triggers a refetch which momentarily marks the list as stale. With React Query's `placeholderData` keeping the old rows visible, users see no flicker. If they do, narrow the invalidation scope.
- **Doc rot:** PR 6's canonical doc should reference actual files. As the engine deletes during follow-up sweeps, file paths in the doc could drift. Mitigation: paths use `<module>` placeholders + concrete imports examples.

---

## Out of scope for PRs 4–6 (explicitly deferred)

- Deletion of orphaned `listImports()` in `@builders/db` (PR 3 leftover; cheap follow-up).
- Deletion of engine `transport/*`, `table-preference-client.ts` (depends on other modules migrating off engine).
- Migration of any other module's list view (inventory next, per intent).
- Realtime push (SSE/WebSocket) — polling + invalidation continues to be sufficient.
- Imports record-view migration.

---

## Definition of done for the imports list-view migration

After PR 6 lands:
- `rg "modules/shared/engines" apps/web/modules/imports/components/list apps/web/modules/imports/data` returns zero hits. ✓ (achieved in PR 3)
- Imports list runs server-driven search/sort/group/paginate via fetch + React Query. ✓ (PR 3)
- Imports list refreshes on mutation success. (PR 5)
- The contract in `packages/application/src/list-view/`, the controller in `apps/web/controllers/list-view/`, the transport in `apps/web/transport/`, the feature controls in `apps/web/components/features/`, and `SearchDropdown` are all in place and adopted by imports. (PRs 1, 2, 3, 4)
- Canonical-pattern doc written so the inventory sweep can follow without redesign. (PR 6)
