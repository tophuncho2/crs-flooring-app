---
name: engine-lv
description: Master of the ONE engine apps/web/engines/list-view (@/engines/list-view) — the list table + toolbar + server-list controllers. The list-view-scoped child of /engine: reach for it when "ripping" /engine specifically for the list part — migrate a list module onto the engine, extract a misplaced list primitive/controller in, upgrade or fix the table/toolbar/search/sort/export buckets, or organize its internals — while keeping the engine self-contained behind its barrel (the "cage"). Drives with the proven git-mv + import-rewrite + /check-gauntlet technique. Editing skill, not read-only. Explicit-only — invoke on /engine-lv.
---

# /engine-lv

`/engine-lv <intent>` makes you the owner of the single engine `apps/web/engines/list-view` (`@/engines/list-view`). This is the **list-view-scoped child of `/engine`** — the user reaches for it when the intent is specifically the list surface: "migrate the payments list onto list-view", "the search control is forked in a module, pull it back into the engine", "the ListActionBar portal leaks a deep path", "organize the toolbar sub-buckets". Your job: ground in the live list-view tree, classify the intent, and drive the change while keeping the engine self-contained behind its barrel.

This is an **editing** skill — it reads, plans tightly, then makes the change. It is not a read-only audit (that's `/dig`) and not a build gauntlet (that's `/check-gauntlet`).

## The model (what the list-view engine IS)

`list-view` is a **client engine** — cross-module React orchestration + a view stack — packaged as **one self-contained top-level folder** at `apps/web/engines/list-view/`, imported everywhere as `@/engines/list-view`. It is the **most saturated engine**: ~100 consumer files across 20 list modules. The root barrel `apps/web/engines/list-view/index.ts` re-exports **5 buckets**: `client table toolbar shell policies`. Verify this against the live tree each run — buckets flatten and merge.

### The buckets (real symbols, real `path:line`)

- **`client/`** — server-list controllers + contracts + nuqs url-bindings + list-preference (column-width) storage + record-section pagination. `useFetchListController` / `useSsrListController` (`list-view/client/use-server-list-controller.ts:378` / `:161`, barrel `client/index.ts:10`); contracts `ListControllerInput` (`client/contracts/list-controller-input.ts:58`) + `ListControllerOutput<TRow>` (`list-controller-output.ts:5`); `ListPreferencesUserProvider` / `useListPreferencesUserId` (`client/index.ts:11`).
- **`table/`** — `DataTable` + the `DataTableColumn` / `DataTableRow` contracts (`table/index.ts:1-4`), plus sub-features `resize/` (`ColumnResizeHandle`, `MIN_COLUMN_WIDTH`) and `select/` (`useListSelection` + `ListSelection`, `DataTableSelectAllButton` / `DataTableSelectCheckbox` — `table/select/index.ts`).
- **`toolbar/`** — `action-bar/` (`ListActionBar`, `ToolbarMenuButton`, `ClearAllFiltersButton`, portals), `search/` (`SearchControl`, `DebouncedSearchControl`, `StateSearchControl`), `paginate/` (contract exported, components deliberately **NOT** barrelled — see `toolbar/paginate/index.ts:2-8`), `sort/` (`SortMenu` / `SortMenuBody` + `SortMenuOption` / sort contract), `export/` (`ListExportButton` + `ListExportColumn`).
- **`shell/`** — `ListPageShell`, `ListPageFeedback`.
- **`policies/`** — freshness presets only: `ListFreshness` + `LIST_FRESHNESS_LIVE` / `_STANDARD` / `_OFF` (`policies/index.ts:1`).

### Data-injection seams (what a consumer supplies)

The engine never reaches into a module; the consumer injects: `listFn` (read fn, `list-controller-input.ts:53`), `queryKey` (:52), SSR seeds `initialRows` / `initialTotal` / `pagination`, shared config `tableKey` / `pageSize` / `allowedSortFields` / `filterableFields` / `urlSyncMode`, `columns` (`DataTableColumn<Row>[]` — `{key,label}` + width/render), the `SORT_OPTIONS` allowlist (**keys ARE backend sort fields** — sorting is menu-only, the clickable header caret was ripped), `selection` (`ListSelection` for CSV scope), and controlled column-width (`columnWidths` / `onColumnWidthsChange`, `list-controller-output.ts:36-37`).

Canonical per-module quartet a consumer maintains: `components/list/<m>-client.tsx` (toolbar host) + `components/list/<m>-table.tsx` (`<DataTable>` host) + `components/list/table/<m>-list-columns.ts` (column defs + `SORT_OPTIONS`) + `components/list/table/<m>-row-cell.tsx` + `controllers/list/use-<m>-list-controller.ts`. Representative: `apps/web/modules/work-orders/components/list/work-orders-table.tsx:29`, columns `.../table/work-orders-list-columns.ts:13` + `WORK_ORDERS_SORT_OPTIONS:45`.

### The cross-engine seam — `useRecordSectionPagination` (do NOT duplicate)

`useRecordSectionPagination` + `RECORD_VIEW_PAGE_SIZE=15` physically live in `engines/list-view/client/` and are exported from `@/engines/list-view` (`client/index.ts:15`), but they serve **RECORD-VIEW section tables**, distinct from list *pages* (which use `LIST_*_PAGE_SIZE=50`). `engine-lv` and `engine-rv` both **name** this seam; neither **duplicates** it — a move across that boundary is the parent `/engine`'s job. Relatedly, record child-grids legitimately import `DataTable` from `@/engines/list-view` alongside record-view (`apps/web/modules/work-orders/components/record/material-items/work-order-requested-material-grid.tsx:4`) — the consumer sets are **not disjoint**.

### List pages stay READ-ONLY (load-bearing)

The editable `DataTable variant="editable"` exists to serve **record-view editable SECTIONS**, not list pages. List *pages* are read-only. Never flip a list page onto the editable variant.

### The cage (list-view's slice)

- **Depends outward only** on `@/engines/common` + shared primitives (`@/components/*`, `@/types`, `@/transport`, etc.). Nothing those own reaches back in.
- **Never imports from `apps/web/modules/*`** — module data is **data-injected** (see the seams above). This is what keeps list-view deployable to 20 modules.
- **Never imports a sibling engine** — no `@/engines/picker`, no `@/engines/record-view`. Siblings never depend on each other. (`useRecordSectionPagination` is a shared-name seam, not a sibling import.)
- **No re-export indirection** — do not re-export list-view symbols back out through `@/controllers` / `@/components`. Consumers import **only** the `@/engines/list-view` barrel.
- The boundary is **convention-only** today (no eslint `no-restricted-paths`). You are the enforcement.

## Hard rules

- **Ground before you touch.** Re-read the live `apps/web/engines/list-view/` tree + barrels every run. The model above drifts (buckets flatten, `paginate/` stays un-barrelled on purpose); never act on it without confirming against the folder.
- **Self-contained or it's not done.** Every symbol the change moves or adds lands inside `list-view/`, exported through the root barrel, with consumers importing `@/engines/list-view`. No new deep-path imports, no re-export shims.
- **Preserve history + verify for real.** `git mv` (never delete-then-recreate) so blame survives; rewrite consumer imports with a scripted `perl -pi` / `sed` path swap; run `/check-gauntlet` as the punch-list — real error counts, never claim green from reading.
- **Stay in the cage.** If a change would make list-view import from `modules/*`, stop and convert to data-injection. If it would import `@/engines/picker` / `@/engines/record-view`, stop. Do NOT duplicate `useRecordSectionPagination` — it's shared with record-view; a cross-engine move is `/engine`'s job.
- **List pages stay read-only.** The `variant="editable"` DataTable is record-view's; never wire it onto a list page.
- **Tight, reviewable diff; defer polish.** Scope the diff to the move + rewrites + genuinely-dead-code deletion. No new engine alignment test, no chasing `modules/shared` leftovers mid-sweep. Update only the CLAUDE.md docs that describe the dirs you moved.
- **DO NOT COMMIT.** Per project CLAUDE.md the user commits; you provide a commit message ≤17 words (schema changes in their own commit). Drive the design and surface open questions in your response — don't multiple-choice.
- **Explicit-only.** Trigger on the literal `/engine-lv`. Not on "the list is broken", "fix the table", "sorting is off".

## Step 1 — Ground in the live list-view tree

Before classifying the intent, read the current reality:

1. **`ls apps/web/engines/list-view/`** — confirm the 5 buckets (`client table toolbar shell policies`) and their sub-features (`table/{resize,select}`, `toolbar/{action-bar,search,paginate,sort,export}`).
2. **The root `index.ts`** + each relevant bucket's `index.ts` — the actual public surface (remember `toolbar/paginate` exports contract-only, components withheld).
3. **`apps/web/components/CLAUDE.md`** + `@/engines/common` — the primitive contract list-view depends **inward** on.
4. **The consumers** — `grep -rl "@/engines/list-view"` across `apps/web/modules/` and `apps/web/app/` to size the blast radius (expect ~100 files); note the record-grid consumers that share `DataTable`.
5. **Relevant memory** (context — verify against code): `state-search-control`, `list-view-base-order-epic`, `datatable-column-filter-seam`, `editable-datatable-variant-epic`, `listactionbar-rollout-complete`, `sort-menu-redesign-and-sweep`, plus the parent `web-engines-convention` / `engine-extraction-sweep-deferrals`.

State what you found in one tight block (buckets present, target sub-bucket, consumer count) before proposing the change.

## Step 2 — Classify the intent and apply the playbook

Match the ask to one of these — scoped to list-view. They compose (a migration often contains an extraction).

### A. Migrate a list module onto list-view
The module gets its list surface from the engine. Mirror the canonical quartet head-to-toe (`<m>-client.tsx` toolbar host + `<m>-table.tsx` DataTable host + `table/<m>-list-columns.ts` with `SORT_OPTIONS` + `table/<m>-row-cell.tsx` + `controllers/list/use-<m>-list-controller.ts`). Inject the seams (`listFn`, `queryKey`, config, `columns`, `selection`); repoint imports to `@/engines/list-view`; delete the bespoke list/toolbar code the engine now owns. List page stays **read-only**.

### B. Extract / pull a misplaced list primitive or controller into list-view (split-brain)
1. **Find every piece** of the concept across `components/`, `controllers/`, `@/engines/common`, and any module — grep the symbol names, not just the folder.
2. **Decide the home**: the right list-view sub-bucket (`table/`, `toolbar/search`, `toolbar/sort`, `client/`) if it carries list orchestration; leave it in `@/engines/common` / `components/` if it's a shared primitive and only the *barrel placement* is wrong.
3. **`git mv` the files** into the chosen bucket, consolidating the split halves.
4. **Wire the barrel** — add `export *` (or the deliberate partial, à la `paginate/`); switch internal references to relative imports.
5. **Rewrite consumers** to `@/engines/list-view` with a path swap; **delete the emptied husk folders**.
6. `/check-gauntlet` until green.

### C. Upgrade / extend list-view
Add to the **right bucket**: contract/type → `client/contracts` or the bucket's own contract; controller/hook → `client/`; table feature → `table/` (or `table/resize` / `table/select`); toolbar feature → `toolbar/{action-bar,search,sort,export}`; freshness preset → `policies/`. Keep contracts JSX-free. Export through the bucket barrel so it reaches `@/engines/list-view`. Respect the deliberate `paginate/` component-withholding.

### D. Fix a list-view issue
**Triage engine-vs-consumer first.** If the bug is in the engine (table render, search debounce, controller url-sync, freshness), fix it inside `list-view/` and confirm no consumer relied on the broken behavior. If a consumer misuses the engine (deep import, reaching past data-injection, binding `SORT_OPTIONS` keys that aren't backend fields), fix the consumer and tighten the barrel if the misuse was *possible*.

### E. Organize within list-view
Bucket hygiene: every file under exactly one of `client table toolbar shell policies`; barrels in sync (honoring `paginate/`'s partial export); relative imports internally; no deep-path leaks from the ~100 consumers. Flatten a toolbar sub-namespace that no longer pulls its weight; keep the public surface minimal.

## Step 3 — Execute and verify

- Make moves with `git mv`; rewrite importers with a scripted path swap; keep the diff scoped to the move + rewrites + genuinely-dead-code deletion.
- Run **`/check-gauntlet`** (or at minimum the typecheck it wraps) as the punch-list — do not claim green from reading. Report real error counts. Given ~100 consumers, a barrel/symbol rename ripples wide — sweep them all.
- If you added, consolidated, or retired a bucket, update the **status line of the relevant memory** (`web-engines-convention` + the specific list-view epic slug) and its `MEMORY.md` index line.

## Step 4 — Report (per project CLAUDE.md)

- **Headline + counts + TL;DR in the chat**; use a table for the file-by-file detail (what moved where, which barrels changed, consumer count repointed).
- **Open questions go in the response** — boundary calls (list-view vs `@/engines/common` vs `components/`), the cross-engine `useRecordSectionPagination` seam, sub-bucket promote/dissolve, anything genuinely ambiguous.
- **End with a commit message ≤17 words** (schema changes in their own commit) — but **do not commit**.

```
ENGINE-LV — <intent in one line>   (<task type A–E>)

═══ Grounding ═══
Buckets: client table toolbar shell policies   Target: <bucket/sub>   Consumers: <N of ~100>

═══ Change ═══
| File / symbol | From | To | Barrel | Consumers repointed |
|---|---|---|---|---|
| ... | components/... | engines/list-view/<bucket>/... | + export | <N> |

═══ Verify ═══
/check-gauntlet: <✅ PASS | ❌ N errors>   Husks deleted: <list>   Cage intact: <✅ yes / ⚠️ note>

═══ Open questions ═══
- <boundary / cross-engine seam / promote-dissolve, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Act on the model in this file without re-reading the live `apps/web/engines/list-view/` tree + barrels first.
- Touch any engine other than `list-view`, or make a cross-engine / `@/engines/common` move — that's the parent **`/engine`**. Never duplicate `useRecordSectionPagination` (shared with record-view via `engine-rv`).
- Own the full-stack **sort install** (columns → `SORT_OPTIONS`/allowlists → data-request → api-validator → db order-by → indexes → tests) — that's **`/column-sort`**. list-view owns only the shared `SortMenuBody` / `ToolbarMenuButton` menu UI + menu-only header.
- Own the **CSV export vertical** (domain manifest → db read → app use-case → api route+validator → client query-builder + shared `toCsv`) — that's **`/export-csv-sync`**. list-view owns only the `ListExportButton` + `useListSelection` primitives.
- Own making a column **searchable** (index → migration → filter plumbing → api validator → list-search UI) — that's **`/column-new-index`**. list-view owns only the search-CONTROL primitive.
- Own the **palette-color install** (`/column-color`) or the DB-generated **`*NumberInt` row# + exact-int search bar/stepper** (`/row-number`) — list-view owns only the list `CellChip` / search-bar cell chrome.
- Flip a list page onto the editable `DataTable variant="editable"` — list pages stay read-only (that variant is record-view's).
- Read-only audits (**`/dig`**) or broad module priming (**`/session-new`**), commit, or fold a schema change into a non-schema commit.
- Multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/engine-lv` — not "the list is broken", "fix the table".
