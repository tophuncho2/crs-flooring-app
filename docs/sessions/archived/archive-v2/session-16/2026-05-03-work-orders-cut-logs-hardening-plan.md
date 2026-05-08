# Work Orders — Material Items / Cut Logs Hardening Sweep

## Context

We just finished a sweep that replaced section-level save/discard with per-row inline triggers on the cut-logs grid (commits 1772ee → e684f3). The shared cut-log primitives were extracted to `apps/web/components/{features/cut-log-row,badges,cells}` and inventory adopted the same row.

That sweep left known flaws on the work-orders side. Before moving to the bigger initiatives (list-view filtering, files migration, rich dropdowns, primary section, templates package, production v1 audit), we need to solidify the cut-log row UI + the controllers underneath it. This plan hardscopes the **work-orders material-items / cut-logs section** and ships in 6 small, layered commits.

## In-Scope (this plan)

1. **#2** Cut-log row layout reorder
2. **#3** Section button reorder
3. **#7** `components/record/material-items/` decomposition (mid-grain)
4. **#4** `controllers/` reorganization → `list/` + `record/{section}/`
5. **#5** `use-pending-cut-log-section.ts` (524 lines) extraction → 4-file folder
6. **#12** Category required before Product (clear product on category change)
7. **#14** Cut-log inventory filter: mutually exclusive Section / Location dropdowns
8. **#6** Decision answer: `use-work-orders-list-mutations.ts` stays in `controllers/list/`

## Out-of-Scope (deferred — see "Follow-up sweeps" at end)

#1 SSR-snapshot finalize bug · #8 production v1 module audit · #9 list-view search/sort/group/filter · #10 rich dropdowns · #11 templates/properties/management-cos package · #13 warehouse caching · #15 files migration

---

## Step 1 — Cut-log row layout reorder + section button reorder

**Files:**
- [apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx) — `WO_CUT_LOG_LAYOUT` lines 43–63
- [apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx) — ActionHeader actions array lines 251–313

**Cut-log row — new column order (left → right):**

| # | Column | Source | Notes |
|---|--------|--------|-------|
| 1 | Selection checkbox | (existing) | unchanged |
| 2 | Circular finalize button | moved from trailing-3 | leading position now |
| 3 | Status badge | moved from trailing-1 | right of circular |
| 4 | CUT # | (existing) | |
| 5 | INVENTORY | (existing) | |
| 6 | CUT | (existing) | |
| 7 | COVERAGE | (existing) | |
| 8 | BEFORE | (existing) | |
| 9 | AFTER | (existing) | |
| 10 | SEQ | (existing) | |
| 11 | NOTES | (existing) | |
| 12 | WASTE | moved from position 5 | right of NOTES |
| 13 | DELETE / VOID | moved from trailing-2 | left of CREATED |
| 14 | CREATED | (existing) | |
| 15 | UPDATED | (existing) | |

The `GridLayout` primitive auto-generates headers from the layout dict, so reordering the dict reorders the headers too. Keep the trailing-control rendering machinery (`renderControl`) intact — only its column-key positions move.

**Section button order (ActionHeader actions array, far-left → far-right):**

`Finalize Selected (N)` → `Select All Eligible (N)` → `Discard` → `Save Material Items` → `+ Add Material Item`

Implementation: reorder the `actions: []` array and move `SelectAllButton` from its separate row into the actions slot at index 1 (or keep as a leading prefix — pick whichever ActionHeader supports natively).

**Commit:** `ui(cut-logs): reorder row layout + material-items section buttons`

---

## Step 2 — `components/record/material-items/` mid-grain split

Refactor only, zero behavior change. Files after split:

| File | Lines (target) | Contents |
|------|---------------|----------|
| `work-order-material-items-section.tsx` | ~250 | Parent grid + per-WOMI delegation |
| `material-items-section-header.tsx` | ~80 | `ActionHeader` + `SelectAllButton` (consumes Step 1 button order) |
| `work-order-cut-log-row.tsx` | ~280 | Per-WOMI grid + `renderInventoryCell` + `renderCell` |
| `cut-log-row-layout.ts` | ~25 | `WO_CUT_LOG_LAYOUT` (consumes Step 1 column order) |
| `cut-log-row-controls.tsx` | ~120 | `renderControl` — status badge, delete/void, circular finalize |

The control renderers in `cut-log-row-controls.tsx` keep their callback signatures so `work-order-cut-log-row.tsx` calls them as before — just imports instead of inlines.

**Commit:** `components(cut-logs): split material-items section into header/row/controls/layout`

---

## Step 3 — `controllers/` reorganization

Move all 8 files into the new tree. Pure mv + import-path updates. No logic changes.

```
apps/web/modules/work-orders/controllers/
  list/
    use-work-orders-list-controller.ts
    use-work-orders-list-mutations.ts        ← see #6 decision below
  record/
    primary/
      use-work-order-primary-section.ts
    material-items/
      use-work-order-material-items-section.ts
      use-pending-cut-log-section.ts          ← becomes a folder in Step 4
      use-finalize-cut-log-batch-section.ts
      drafts.ts
    files/
      use-work-order-files-section.ts
```

Update the controllers barrel (`controllers/index.ts` if one exists; otherwise update direct imports site-by-site). Run typecheck before commit.

**#6 answer (durable):** `use-work-orders-list-mutations.ts` stays in `controllers/list/`. It's a React hook (`useMutation` + `useQueryClient`), and per CLAUDE.md the data layer is for "persisting data, read repository, write repository, helpers and normalizers" — pure persistence functions. The data layer holds `createWorkOrderRequest` / `updateWorkOrderRequest` / `deleteWorkOrderRequest` (already there). The React-Query hook that wraps them + invalidates the list cache is application/UI-state machinery → controllers.

**Commit:** `refactor(work-orders): bucket controllers into list/ + record/{section}/`

---

## Step 4 — Extract `use-pending-cut-log-section.ts` (524 → 4 files)

```
controllers/record/material-items/use-pending-cut-log-section/
  index.ts                          (re-exports the hook + types)
  types.ts                          (~50: PendingCutLogRowController, PendingCutLogForm, PendingCutLogSection)
  helpers.ts                        (~100: toSavedRow, rowId, isSavedDirty, isDraftDirty, buildSavedForm)
  use-row-state.ts                  (~140: useState + findRow/writeRow/dropRow/setError + addDraft/discardDraft/enter-edit)
  use-pending-cut-log-section.ts    (~200: composes use-row-state + 4 mutations + getRowController projection)
```

Mutations stay in the composing hook because their `onSuccess` callbacks reconcile directly to row state (no React-Query cache invalidation). The state hook exposes the writers (`writeRow`, `dropRow`, `setError`) that mutations call from their `onSuccess` / `onError`.

**Commit:** `controllers(cut-logs): extract pending-cut-log-section hook into focused files`

---

## Step 5 — #12 Category required before Product

**Files:**
- [apps/web/modules/work-orders/controllers/use-work-order-material-items-section.ts](apps/web/modules/work-orders/controllers/use-work-order-material-items-section.ts) — `changeCategoryFilter()` lines 189–195 area
- [apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx) — `renderParentCell()` lines 139–209

Two changes:
1. In `changeCategoryFilter()`: when `categoryFilterId` changes (and the new value differs from old), set `productId = null` on the row.
2. In `renderParentCell()`: pass `disabled={!item.categoryFilterId}` to the Product `DropdownCell` (or render an empty/placeholder dropdown when no category is selected).

After commit Step 3 the controller path will be `controllers/record/material-items/use-work-order-material-items-section.ts`.

**Commit:** `ui(material-items): require category before product; clear product on category change`

---

## Step 6 — #14 Section / Location mutually exclusive filters

**Files:**
- [apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx) — `renderInventoryCell()` lines 193–234, `inventoriesForLocation()` lines 170–172
- The pending-cut-log section hook (after Step 4 split, this lives across `use-row-state.ts` + `use-pending-cut-log-section.ts` in the new folder)

Today: form has `locationFilterCode` only. Inventory dropdown filters by location.

After:
- Form gets a sibling `sectionFilterCode` field (UI-only, not persisted — same convention as `locationFilterCode`)
- Two new setters: `setSectionFilterCode()` clears `locationFilterCode`; `setLocationFilterCode()` clears `sectionFilterCode`
- A small `Clear` button next to the two dropdowns resets both
- `inventoriesForLocation` becomes `filteredInventories(form)`:
  - if `sectionFilterCode` set → filter by `inv.sectionCode === sectionFilterCode`
  - else if `locationFilterCode` set → filter by `inv.locationCode === locationFilterCode`
  - else → all eligible
- Section options derive from `distinct(eligibleInventory.map(i => i.sectionCode))` the same way Location options do today

Verify `EligibleInventory` carries a `sectionCode` field. If it doesn't, this step needs an upstream extension at the `listEligibleInventoryRequest` shape (`apps/web/modules/work-orders/data/`) and possibly the use-case projection — flag at typecheck.

**Commit:** `ui(cut-logs): mutually exclusive section/location filters on inventory dropdown`

---

## Verification

After each step:
- `pnpm typecheck` (or repo equivalent)
- App-wide grep for the moved/extracted symbols to confirm no stale imports

After all 6 steps, end-to-end smoke in the browser dev server:
1. Open a work order with material items.
2. Cut-log row column order matches the table above.
3. Section buttons render in the new order.
4. Add a new material item → Product dropdown is disabled until Category is picked.
5. Change Category on a row that already had a Product → Product clears.
6. On a cut-log row, pick a Section filter → Location dropdown clears + disables. Pick Location → Section clears + disables. Click Clear → both reset.
7. Create / edit / delete / void a pending cut log → mutations still reconcile correctly into the per-WOMI row state (this is the path most affected by Step 4 extraction).

UI verification cannot be skipped — type-checking and tests verify code, not feature behavior.

---

## Open Questions

- **`EligibleInventory.sectionCode`** — does the eligible-inventory projection already carry section code? If not, Step 6 needs an upstream data-layer addition. Will know at typecheck during Step 6.
- **#1 (SSR snapshot finalize)** — confirmed deferred to the finalize-hardening sweep per locked decision. Symptom recap, for the future sweep: per-WOMI section drafts/saves/voids never propagate to the parent's `cutLogsByWorkOrderItemId` snapshot, so `Finalize Selected` count + eligibility is stale. Fix is lifting per-WOMI row state up to the material-items section via callback aggregation.

---

## Follow-up sweeps (acknowledged, not in this plan)

| # | Topic | Notes |
|---|-------|-------|
| #1 | Finalize batch live-aggregation | Lift per-WOMI state up to material-items section |
| #8 | Work-orders production v1 audit | Full file-by-file pass on `modules/work-orders/` + `dashboard/work-orders/` |
| #9 | List-view search / sort / group / filter | Mimic + improve the imports module setup |
| #10 | Rich dropdowns | Search bar + quick filter + paginated/cached query strategy; categories/job-types/UOM cached because seeded |
| #11 | Templates package | management-cos → properties → templates flow shared between templates page + WO sync |
| #13 | Warehouse dropdown caching | Defer rich-dropdown treatment, but cache it |
| #15 | Files migration | Mostly already canonical (imports `@/components/badges`, controller in module). Confirm with a focused audit before doing work |
