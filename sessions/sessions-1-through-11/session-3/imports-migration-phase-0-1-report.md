# Imports Migration — Phase 0 + Phase 1 Execution Report

Date: 2026-04-25
Plan: [docs/imports-migration-revised-plan.md](imports-migration-revised-plan.md)
Branch: staging
Scope: Pre-flight audit + close any primitive gaps under `apps/web/components/` blocking the imports module migration.

---

## Phase 0 — Pre-flight audit

### Smoke pages

Found at `apps/web/app/components-smoke/`:
- [`page.tsx`](apps/web/app/components-smoke/page.tsx) (catalog index)
- [`imports-list/page.tsx`](apps/web/app/components-smoke/imports-list/page.tsx)
- [`imports-record/page.tsx`](apps/web/app/components-smoke/imports-record/page.tsx)

All three import primitives changed in this phase. Routes type-check cleanly under `tsc --noEmit`.

### Primitive coverage matrix

| Capability | Status | Resolution |
|---|---|---|
| Multiline text input | Already shipped | [`textarea-cell.tsx`](apps/web/components/cells/textarea-cell.tsx) — added prior turn |
| SSR pagination via hrefs | Already supported | [`paginate-controls.tsx`](apps/web/components/features/paginate/paginate-controls.tsx) renders `<a>` when `previousPageHref` / `nextPageHref` are supplied; falls back to `<button>` callbacks otherwise |
| Notices surface (positive message) | Missing | **Added** `message?: ReactNode` to `ActionHeader` (Phase 1) |
| Row-click affordance on `Grid` | Missing | **Added** `onRowClick` + `getRowAriaLabel` to `Grid`; plumbed `onClick` + `ariaLabel` into `GridBodyRow` with full keyboard a11y (Phase 1) |

---

## Phase 1 — Closed primitive gaps

### 1. `ActionHeader.message`

[apps/web/components/headers/action-header.tsx](apps/web/components/headers/action-header.tsx)

- New optional prop: `message?: ReactNode`. Mirrors `error`'s contract — string renders a styled emerald notice block; `ReactNode` renders verbatim.
- Render order in the title column: title → status → summary → **message** → error. Both `message` and `error` can coexist.
- Visual treatment: `border-emerald-500/40 bg-emerald-500/10 text-emerald-800` (parity with the engine's `FormStatusNotices` positive variant).

### 2. `Grid.onRowClick` + `Grid.getRowAriaLabel`

[apps/web/components/grid/grid.tsx](apps/web/components/grid/grid.tsx) and [apps/web/components/grid/grid-row.tsx](apps/web/components/grid/grid-row.tsx)

- New optional props on `GridProps<TRow>`:
  - `onRowClick?: (row: TRow) => void`
  - `getRowAriaLabel?: (row: TRow) => string`
- Plumbed into `GridBodyRow` as `onClick?: () => void` + `ariaLabel?: string`.
- When `onClick` is set, the row gains:
  - `role="button"` and `tabIndex={0}`
  - `onKeyDown` activating on `Enter` and `Space` (with `preventDefault` to suppress page scroll on space)
  - `cursor-pointer`, `hover:bg-sky-500/[0.06]`, `focus-visible:ring-2 focus-visible:ring-sky-500/40`
- Backward-compatible: rows without `onRowClick` render exactly as before (no role, no tabIndex, no hover state). Ignored when `renderRow` is supplied (consumer takes full control).
- Replaces the engine's `ClickableTableRow` pattern.

---

## Verification

### Typecheck — `apps/web/components/` clean

```
cd apps/web && npx tsc --noEmit | grep -E "components/" | wc -l
→ 0 (matches in apps/web/components/)
```

The single hit on the substring `components/` is `modules/work-orders/list/work-orders-client.tsx` referencing a missing internal `../components/work-order-sync-modal` — pre-existing, unrelated.

### Smoke pages — clean

```
cd apps/web && npx tsc --noEmit | grep -E "components-smoke/" | wc -l
→ 0
```

All three smoke routes still compile.

### Test suite — no regressions

| | Test files | Tests |
|---|---|---|
| Baseline (pre-Phase-1, my changes stashed) | 10 failed / 36 passed (46) | 21 failed / 163 passed (184) |
| With Phase 1 changes | 10 failed / 36 passed (46) | 21 failed / 163 passed (184) |

Identical counts. Pre-existing failures live in `tests/shared/architecture-boundaries`, `tests/shared/package-scripts`, `tests/engines/record-view/*`, `tests/server/{auth,http}/*`, `tests/modules/imports/*`, `tests/modules/products/*`. None reference the files this phase touched. None were introduced by this phase.

### Repo-wide typecheck context

Total `apps/web` typecheck errors: 67 — all pre-existing, all in `app/api/admin/`, `modules/admin/`, `modules/work-orders/`, and `record-view/panel/`. No new errors introduced.

---

## Files touched this phase

- [`apps/web/components/headers/action-header.tsx`](apps/web/components/headers/action-header.tsx) — added `message` prop
- [`apps/web/components/grid/grid.tsx`](apps/web/components/grid/grid.tsx) — added `onRowClick`, `getRowAriaLabel`
- [`apps/web/components/grid/grid-row.tsx`](apps/web/components/grid/grid-row.tsx) — added `onClick`, `ariaLabel`, interactive role + keyboard handler

Already in-tree from prior work (committed `7c2c2e73`):
- [`apps/web/components/cells/textarea-cell.tsx`](apps/web/components/cells/textarea-cell.tsx)
- [`apps/web/components/cells/index.ts`](apps/web/components/cells/index.ts)

---

## Phase 1 acceptance status

- [x] `tsc --noEmit` clean for `apps/web/components/`
- [x] Existing tests show no new regressions vs. baseline
- [x] Smoke pages still type-check without errors

**Phase 1 complete.** Ready to proceed to Phase 2 (list view migration).
