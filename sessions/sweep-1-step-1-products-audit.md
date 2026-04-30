# Sweep 1 — Step 1 — Products Module Audit

**Date:** 2026-04-30 · **Branch:** `staging` · **Plan:** [`sessions/v1-master-plan.md`](v1-master-plan.md) · **Author:** read-only audit, no code changes

---

## TL;DR

| Metric | Count |
|---|---|
| Products module files | 13 (.ts/.tsx) |
| Engine imports in products module + pages | **27** |
| Engine imports in canonical reference (imports module + pages) | 11 |
| Files needing edits in products | 9 of 13 + 2 of 3 pages = **11 files** |
| New files to create | 1 (data/list-products-request.ts, mirror of `list-imports-request.ts`) |
| Files that move directories | 1 (`product-primary-fields-section.tsx` → `record/sections/`) |
| Engine imports that LEGITIMATELY remain | 11 (record-view scaffolds + section controllers + `resolveRecordEntryReturnTo` page utility) |
| Engine imports that must be REPLACED | 16 (list-view shell + transport HTTP + delete confirmation msg) |

**Status:** Products has the right scaffolding (parallel `components/`, `controllers/`, `data/` dirs) but the list-view layer is fully on `engines/list-view/...` (DashboardListPageScaffold, DashboardListPageTable, DashboardListRowCell, useConfiguredTableState, etc.). Imports has been migrated to the new `apps/web/components/` + `apps/web/controllers/list-view` + `apps/web/query-policies` peer dirs. Records-view layer is mostly done (RecordDetailClientScaffold + RecordPrimarySection are intentionally kept on engine — confirmed by reading imports module).

**Dashboard pages:** All 3 product pages already import their UI from `@/modules/products/...`. The only engine reference in pages is `resolveRecordEntryReturnTo` from `@/modules/shared/engines/common/record-entry` — and the canonical imports pages keep that same import (it's the intentional residual). So the user's directive "ensure dashboard/pages import from modules" is already satisfied for components; the remaining engine usage is one utility line per page that mirrors imports.

---

## 1. Products module file inventory

| File | Status | Engine imports |
|---|---|---|
| `apps/web/modules/products/components/list/products-client.tsx` | 🟡 Heavy refactor | 9 (DashboardListPageScaffold, DashboardListPageControls, DashboardCardTitle, FormStatusNotices, TablePaginationControls, useConfiguredTableState, GroupedRowTree type, TablePreferencePayload type, FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME) |
| `apps/web/modules/products/components/list/products-table.tsx` | 🟡 Heavy refactor | 6 (DashboardListPageTable, DashboardListRowCell, renderDashboardRowCells, renderGroupedTableRows, ClickableTableRow + TableEmptyRow + TablePaginationControls, GroupedRowTree type) |
| `apps/web/modules/products/components/record/product-create-client.tsx` | 🟢 Keep | 2 (RecordCreateClientScaffold + buildRecordDetailHref — both intentional, mirror imports) |
| `apps/web/modules/products/components/record/product-detail-client.tsx` | 🟢 Keep | 1 (RecordDetailClientScaffold — intentional, mirror imports) |
| `apps/web/modules/products/components/record/product-primary-fields-section.tsx` | 🟡 Move + refactor | 8 (RecordFormField, RecordPrimaryPane, RecordPrimarySection, RecordPrimaryFieldsGrid, RecordPrimaryFieldCell, etc.) — ALL replaced in imports's `import-primary-fields-section.tsx` by `apps/web/components/{layout-grid,fields,cells}` |
| `apps/web/modules/products/components/record/product-record-panel.tsx` | 🟢 Keep | 2 (RecordMultiSectionPanel + RecordPrimarySectionInstance — intentional; `buildDeleteConfirmationMessage` also intentional, mirror imports) |
| `apps/web/modules/products/controllers/use-product-primary-section.ts` | 🟢 Keep | 1 (engines/record-view — intentional, mirror imports's `useImportPrimarySection`) |
| `apps/web/modules/products/controllers/use-products-list-controller.ts` | 🟡 Refactor | 1 (`useRecordEntryNavigation`) — imports keeps this same import; could keep |
| `apps/web/modules/products/data/mutations.ts` | 🔴 Refactor | 2 (`requestJson`, `withMutationMeta`) — imports has migrated to `@/transport` instead |
| `apps/web/modules/products/data/queries.ts` | 🟡 Refactor | 1 (`withLoaderTiming`) — imports keeps this same import |
| **Missing:** `data/list-products-request.ts` | 🔴 Create | — Mirror of `list-imports-request.ts`; defines `LIST_PRODUCTS_PAGE_SIZE`, `LIST_PRODUCTS_QUERY_KEY`, `parseProductsListInputFromSearchParams`, `listProductsRequest` |

**Pages (separate from module):**

| File | Status | Engine imports |
|---|---|---|
| `apps/web/app/dashboard/products/page.tsx` | 🟡 Refactor | 0 — but uses old `getProductsPageData()` direct-fetch + `parseServerTableQueryState`; canonical uses `prefetchQuery` + `HydrationBoundary` |
| `apps/web/app/dashboard/products/new/page.tsx` | 🟢 Keep | 1 (`resolveRecordEntryReturnTo` — intentional, mirror imports) |
| `apps/web/app/dashboard/products/[id]/page.tsx` | 🟢 Keep | 1 (`resolveRecordEntryReturnTo` — intentional, mirror imports) |

Legend: 🟢 keep as-is or trivial · 🟡 refactor in place · 🔴 create new / move directory

---

## 2. Reference-module migration patterns

### Imports (canonical — most-migrated, per session-3)

**List-view client (`imports-client.tsx`)** uses:
- `@/components/headers` (SectionHeader)
- `@/components/features/search` (SearchControl)
- `@/components/features/sort` (SortToggle)
- `@/controllers/list-view` (`useServerListController`)
- `@/query-policies` (`LIST_FRESHNESS_STANDARD`)
- `@builders/application` (typed list filters)
- `@builders/domain` (page size const, ImportRow, TablePreferencePayload type)
- Module-local `data/list-imports-request.ts` for query key + request fn
- Module-local `controllers/use-imports-list-controller.ts` for navigation + UI state

**List-view table (`imports-table.tsx`)** uses:
- `@/components/grid` (`Grid`, `GridEmpty`, `GridLayout`)
- `@/components/features/paginate` (`PaginateControls`)
- `@builders/domain` (`formatStableDate`)
- Module-local controller for typed row

**Record-view scaffolds (`import-detail-client.tsx`, `import-record-panel.tsx`, `import-create-client.tsx`):**
- KEEP `@/modules/shared/engines/record-view` imports (RecordDetailClientScaffold, RecordCreateClientScaffold, RecordMultiSectionPanel, RecordPrimarySectionInstance)
- KEEP `buildDeleteConfirmationMessage` from `engines/common/feedback/confirm-delete`
- KEEP `buildRecordDetailHref` from `engines/common/record-entry`

**Record-view section (`import-primary-fields-section.tsx`):**
- USES `@/components/layout-grid` (`CellAt`)
- USES `@/components/fields` (`FieldSection`, `FormField`)
- USES `@/components/cells` (`TextCell`, `TextareaCell`, `SelectCell`, `DropdownCell`)
- NO engine imports

**Section controller (`use-import-primary-section.ts`):**
- KEEP `@/modules/shared/engines/record-view` import (the controller hook `useRecordScopedSectionController` lives there — intentional)

### Templates (15 engine imports — partially migrated)

Templates list-view uses the same pattern as imports for `_client.tsx` (`SectionHeader`, `SearchControl`, `SortToggle`) AND `_table.tsx` (`Grid`, `PaginateControls`). However templates still imports `useConfiguredTableState`, `TablePreferencePayload`, and `useRecordEntryNavigation` from engine — partially migrated.

### Work-orders (1 engine import — most migrated)

WO list-view is the cleanest — only one engine import survives. Uses identical pattern to imports.

### Inventory (15 engine imports)

Similar partial-migration state as templates.

**Conclusion:** Use **imports** as the primary template (richest reference, most stable), reference **work-orders** for the cleanest list-view pattern, and reference **templates** for the simpler list shape (no record nesting like staged-inventory-rows).

---

## 3. Migration mapping (where each engine import goes)

| Current engine import | Target replacement |
|---|---|
| `engines/list-view/scaffold/dashboard-list-page-scaffold` (DashboardListPageScaffold) | Inline JSX (per imports-client.tsx pattern) using `@/components/headers` + bespoke layout — no scaffold needed |
| `engines/list-view/controls/dashboard-list-page-controls` (DashboardListPageControls) | Replace with `@/components/features/search`, `@/components/features/sort` directly |
| `engines/list-view/table/table-shell` (TablePaginationControls, ClickableTableRow, TableEmptyRow) | `@/components/features/paginate` (PaginateControls) + `@/components/grid` (Grid + GridEmpty) |
| `engines/list-view/table/dashboard-list-page-table` (DashboardListPageTable) | `@/components/grid` (Grid) |
| `engines/list-view/table/dashboard-list-row-cell` (DashboardListRowCell) | `@/components/grid` row rendering inside `GridLayout` |
| `engines/list-view/table/render-dashboard-row-cells`, `render-grouped-table-rows` | `Grid`'s built-in row rendering + grouping (per imports-table.tsx) |
| `engines/list-view/controllers/use-configured-table-state` | `@/controllers/list-view` (`useServerListController`) |
| `engines/list-view/controllers/use-table-controls` (GroupedRowTree type) | Type lives elsewhere now — check if `useServerListController` exposes equivalent or if grouping is handled at a different layer |
| `engines/list-view/controllers/table-preferences` (TablePreferencePayload type) | `@builders/domain` (already re-exported per imports-client.tsx line 11) |
| `engines/common/display/accent-styles` (FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME) | Audit consumers — likely stays in shared, this is a CSS const, low priority. May keep. |
| `engines/common/display/dashboard-card-title` (DashboardCardTitle) | `@/components/headers` (SectionHeader) — imports doesn't use a DashboardCardTitle, uses SectionHeader instead |
| `engines/common/feedback/notices` (FormStatusNotices) | Audit `@/components/feedback` — likely already has equivalent |
| `engines/common/transport/http` (requestJson) | `@/transport` (`http.ts`) |
| `engines/common/transport/mutation` (withMutationMeta) | `@/transport` (`mutation.ts`) |
| `engines/common/application/loader-timing` (withLoaderTiming) | KEEP — imports keeps this import (intentional residual) |
| `engines/common/record-entry` (resolveRecordEntryReturnTo, useRecordEntryNavigation, buildRecordDetailHref) | KEEP — imports keeps these (intentional residual) |
| `engines/record-view` (RecordDetailClientScaffold, RecordCreateClientScaffold, RecordMultiSectionPanel, RecordPrimarySectionInstance, RecordPrimarySection, RecordFormField, RecordPrimaryPane, RecordPrimaryFieldsGrid, RecordPrimaryFieldCell, RECORD_FIELD_CONTROL_CLASS_NAME, RECORD_TEXTAREA_CONTROL_CLASS_NAME, useRecordScopedSectionController) | **Mixed** — KEEP scaffolds (Client + Detail + Multi-section + PrimaryInstance + section controller hook). REPLACE primary-section primitives (RecordFormField, RecordPrimaryPane, RecordPrimaryFieldsGrid, RecordPrimaryFieldCell, RecordPrimarySection, control class consts) with `@/components/{layout-grid,fields,cells}` per imports's `import-primary-fields-section.tsx` |
| `engines/common/feedback/confirm-delete` (buildDeleteConfirmationMessage) | KEEP — imports keeps this (intentional residual) |

---

## 4. Coverage_per_unit rule wiring (Step 3 of plan)

**Domain rule already exists** at `packages/domain/src/flooring/categories/rules.ts`:
- Function: `categoryRequiresCoveragePerUnit(slug)`
- Returns true for: `vinyl-plank`, `carpet-tile`, `covebase`, `pad`

**Already imported in products-primary-fields-section.tsx:13:**
```ts
import { categoryRequiresCoveragePerUnit, type ProductCreateForm } from "@builders/domain"
```

So the import is wired. Need to verify in Step 3 how the cell currently uses (or fails to use) this rule:
- UI: does the form show validation errors or disable the cell when inapplicable?
- Server-side: does `packages/application/src/flooring/products/` reject saves where the rule is violated?

**Open question for the user (deferred to Step 3):** if the rule is already wired in UI but missing server-side, the work shrinks. If neither side enforces it, both layers get added.

---

## 5. Open questions surfaced by the audit

1. **`FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME`** is a CSS const used across modules. Imports does NOT import it (it uses bespoke styling). Strategy: (a) leave as engine import (low cost), or (b) migrate to `apps/web/components/` button styles. Recommend (a) — it's a const, not a component.

2. **`DashboardCardTitle`** vs `SectionHeader` — they may have visual differences. When migrating products list, do we use `SectionHeader` (matches imports/templates/work-orders) or recreate the `DashboardCardTitle` look? Recommend `SectionHeader` for consistency.

3. **`FormStatusNotices`** — does `apps/web/components/feedback/` already have an equivalent? Need to check during Step 4.

4. **`useConfiguredTableState` vs `useServerListController`** — these may have different state shapes. Migration may require remapping how products' list state is read (search query, sort direction, group state). Templates keeps `useConfiguredTableState`; imports/work-orders use `useServerListController`. Recommend `useServerListController` (canonical / future-direction).

5. **Products page (server) currently uses `parseServerTableQueryState` + direct `getProductsPageData()` call.** Imports uses `parseImportsListInputFromSearchParams` + `prefetchQuery` + `HydrationBoundary`. The canonical pattern is the latter. Migration adds React Query SSR hydration to products list page. **Confirm:** include this upgrade in Sweep 1 (yes — it's part of "off engine"), or scope just to engine extraction?

6. **`grouping` parser default keys.** Products page allows group keys `["category", "manufacturer", "style", "color"]`; imports allows `["warehouse", "manufacturer"]`. The grouping mechanism (engine-style vs `useServerListController`) differs. May need to confirm grouping still works after migration — or accept that group support is engine-only and products loses grouping during migration (deferred to post-V1 list-view sweep).

---

## 6. File-by-file plan for Steps 2–7

### Step 2 — Move record view sections off engine
- Create `apps/web/modules/products/components/record/sections/` directory
- Move `product-primary-fields-section.tsx` → `record/sections/product-primary-fields-section.tsx`
- Refactor that file to use `@/components/{layout-grid,fields,cells}` instead of engine record-view primitives (mirror `import-primary-fields-section.tsx`)
- Update import paths in `product-record-panel.tsx`

### Step 3 — Wire coverage-per-unit cell
- Verify UI behavior in `product-primary-fields-section.tsx` — does the cell respect `categoryRequiresCoveragePerUnit`?
- If not, add: required validation when category matches, disabled + null persist when not
- Add zod validator in `packages/application/src/flooring/products/` create + update use cases (server-side enforcement)
- Per resolved Open Q §1: existing rows on non-required categories — leave value untouched

### Step 4 — Replace list-view layer
- Refactor `products-client.tsx` to use `@/components/headers,features/search,features/sort` + `@/controllers/list-view` + `@/query-policies` (mirror `imports-client.tsx`)
- Refactor `products-table.tsx` to use `@/components/grid,features/paginate` (mirror `imports-table.tsx`)
- Create `apps/web/modules/products/data/list-products-request.ts` (mirror `list-imports-request.ts`)
- Update `products/page.tsx` to use `prefetchQuery` + `HydrationBoundary` (per Open Q §5; recommend yes)

### Step 5 — Replace transport in `data/mutations.ts`
- Swap `engines/common/transport/http` → `@/transport`
- Swap `engines/common/transport/mutation` → `@/transport`

### Step 6 — Verify pages
- `grep -r "modules/shared/engines" apps/web/app/dashboard/products` — should return only the 2 `resolveRecordEntryReturnTo` lines (intentional, mirror imports)

### Step 7 — Don't delete from `modules/shared/`
- Per CLAUDE.md, leave shims with any consumer.
- After Step 6 passes, run typecheck — if it passes, we're done with Sweep 1.
- Whether the engine list-view files become candidates for deletion is a follow-up sweep (templates/properties/etc. still consume them).

---

## 7. Verification (when Steps 2–7 ship)

- `npm run typecheck` (or repo equivalent) passes
- `grep -rn "modules/shared/engines" apps/web/modules/products apps/web/app/dashboard/products` returns only intentional residuals (resolveRecordEntryReturnTo, RecordDetailClientScaffold + family, useRecordScopedSectionController, withLoaderTiming, buildDeleteConfirmationMessage, useRecordEntryNavigation, buildRecordDetailHref)
- Manual smoke: create a product with category `vinyl-plank` + blank coverage_per_unit → reject. Create with non-required category → cell disabled, save succeeds. List view renders with UoM columns + paginates + sorts.

---

## 8. Things this audit did not verify

- Did not run typecheck.
- Did not run dev server to verify runtime behavior.
- Did not check if `FormStatusNotices` has a direct equivalent in `apps/web/components/feedback/` — need to look during Step 4.
- Did not inspect the current `useConfiguredTableState` vs `useServerListController` API signatures — direct comparison happens at refactor time (Step 4).
- Did not verify that grouping UX (`["category", "manufacturer", "style", "color"]`) survives migration to `useServerListController`. May need to defer grouping to post-V1.
