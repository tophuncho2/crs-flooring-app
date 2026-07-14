---
name: engine-rv
description: Master of the ONE record-view engine — apps/web/engines/record-view (@/engines/record-view), the record detail/create view stack (the biggest engine — 15 buckets, distributed contracts, 143 consumers across 17 modules). The record-view-scoped child of /engine — reach for it when you rip /engine specifically for the record-view part. Invoke to migrate a module onto the record scaffold, extract a split-brain record primitive/controller into a bucket, upgrade/extend the engine, fix a record-view issue triaging engine-vs-consumer, or organize the internals. Grounds in the live record-view tree first, keeps the engine self-contained behind its barrel (the "cage"), and drives the change with git-mv + import-rewrite + /check-gauntlet. Editing skill, not read-only. Explicit-only — invoke on /engine-rv.
---

# /engine-rv

`/engine-rv <intent>` makes you the owner of the one record-view engine at `apps/web/engines/record-view/` (`@/engines/record-view`). The user invokes it with a free-form intent — "migrate payment-purposes onto the record scaffold", "the expandable-rows grid is split across components/ and controllers/, pull it into a bucket", "the panel barrel is leaking deep paths", "the primary-fields shell drifted, organize sections/". Your job: ground in the live record-view tree, classify the intent, and drive the change while keeping the engine self-contained behind its barrel.

This is the **record-view-scoped child of `/engine`** — same technique, one engine. It is an **editing** skill: it reads, plans tightly, then makes the change. It is not a read-only audit (that's `/dig`) and not a build gauntlet (that's `/check-gauntlet`).

## The model (what the record-view engine IS)

The record-view engine is the **record detail/create view stack** — the biggest engine in the fleet. It is one self-contained folder at `apps/web/engines/record-view/`, imported everywhere as `@/engines/record-view`. The root barrel `apps/web/engines/record-view/index.ts` re-exports **15 buckets**: `adapters contracts client cells fields forms layout-grid grid panel sections shell feedback features dialogs composites`. **Verify against the live tree each run — this engine distributes its `contracts/` per presentation bucket (cells/grid/fields/layout-grid each carry their own), and buckets drift.**

- **`client/`** — the headless brains. `controllers/`: `useRecordPageController` (`client/controllers/use-record-page-controller.ts:66`) returning `RecordPageController` (`:49`); `useRecordSectionController<TServer,TLocal>` (`use-record-section-controller.ts:27`) returning `RecordSectionSaveResult<T>` (`:14`); `useRecordScopedSectionController` (`:22`); `useSingleSectionRecordController<TRecord,TLocal>` (`use-single-section-record-controller.ts:26`); `useEmbeddedRecordPageController`; plus `expandable-rows/` sub-controller and `utils/` (cache + drafts). `hooks/`: `useRecordSwapGuard`, `useRecordSectionToggle`, `usePendingWorkflowPolling` + dirty-state/close-guard/notices (`client/index.ts:6-8`). `scaffolds/`: `RecordDetailClientScaffold` with `RecordDetailClientScaffoldContext = RecordPageController` (`client/scaffolds/record-detail-client-scaffold.tsx:21`/`:8`), `RecordCreateClientScaffold`. `utils/`: `record-row-ids`, `build-row-diff`, `apply-unit-seed`.
- **`cells/`** — the editable cell library (20+ `*-cell.tsx`: text/money/number/date/select/…) + `contracts/` (`cell-base`, `cell-format`). **NOTE:** `cells/index.ts:32` re-exports `CellActionButton`/`RecordOpenButton`/`CellAddButton` **FROM `@/engines/common`** for convenience — those atoms live in common, not here.
- **`fields/`** — `FieldSection`, `FormField`, `StaticFieldValue` + contracts.
- **`panel/`** — `RecordMultiSectionPanel`, `RecordPanelConfig`, and the panel renderer.
- **`sections/`** — the section-rendering system, split `cells/ rows/ structure/ panels/ metrics/ status/ drilldown/`; includes `RecordPrimarySectionInstance`, `RecordSectionSubHeaderAction`.
- **`shell/`** — page chrome: detail page shell, `RecordStepper` (+ portal), action buttons, primary header/fields, `RecordEntityFooter`, footers, and a `reference-header/` sub-bucket (`RecordReferenceHeader` + clear/discard buttons).
- **`layout-grid/`** — geometry placement grid. **`grid/`** — the record data-grid (+ expandable-rows, 7 `grid-*` contracts). **`forms/`** — field styling tokens. **`feedback/`** — field/form/page error + notice. **`features/`** — `duplicate-row/`, `select-batch/`. **`dialogs/`** — confirm/choice/delete/modal/quick-create + hooks. **`composites/`** — `address-fields/`, `property-fields/` (they live here to avoid a properties→MC module cycle). **`adapters/`** — `record-calculation-format`, `record-row-status`. **`contracts/`** — a thin top-level `RecordSectionError` (most contracts are distributed per presentation bucket).

### The data-injection seams (how a consumer wires it)

The engine never reaches into a module — the consumer **supplies the data** through named seams:

- **The section-controller config** — via `useSingleSectionRecordController` / `useRecordSectionController`: `createLocalValue` (the form mapper), `saveSection`, `deleteRecord`, `detailUrl`, `payloadKey`, `scope`, `initialRecord`.
- **The section-instance array** — the `{ controller, render }` objects handed to `RecordMultiSectionPanel`.
- **The `RecordPageController` context** — built from `useRecordPageController(...)` and handed to `RecordDetailClientScaffold`.
- **Cell primitives** — `TextCell`/`NumberCell`/`CurrencyCell` supplied to child grids.

### The mirror-the-folder convention (migration shape)

record-view is **mirrored folder-for-folder per module** across `components/record/` (view) + `controllers/record/` (logic) — per `record-view-migration-convention`. A migrated module carries: `components/record/<m>-detail-client.tsx` (scaffold host) + `<m>-record-panel.tsx` (the `RecordMultiSectionPanel` assembly) + `primary/<m>-primary-fields-section.tsx` + `<child>/<child>-section.tsx`+`-grid.tsx` + `footer/`, and `controllers/record/primary/use-<m>-primary-section.ts` + `controllers/record/<child>/use-<m>-<child>-section.ts`. **Depth gradient:** work-orders/templates/inventory/imports are deepest (multi-section); categories/job-types/unit-of-measures/payment-purposes/invites/users/warehouse/entity-types implement only the primary-section triplet. Representative: `apps/web/modules/work-orders/components/record/work-order-detail-client.tsx:56`, panel `work-order-record-panel.tsx:99`, controller `controllers/record/primary/use-work-order-primary-section.ts:31`. `adjustments` is the ONE deliberate non-migration — embedded/edited inline inside inventory, not a standalone record scaffold (`inventory-record-view-migration`).

### The footer convention

Delete + Close live in the shared `RecordEntityFooter` beneath the panel, **detail-only** — create/`new` forms get **NO footer** (`record-view-footer-convention`). In-cell `RecordOpenButton`(↗)/`CellAddButton`(+) mount in the `FormField` `actions` slot; the pencil is retired (`record-view-cell-link-affordances`). `RecordReferenceHeader` owns the in-place record-swap dirty-guard + ConfirmDialog (`reference-header-primitive`).

### The cross-engine seams (record-view ↔ list-view — sanctioned, not a break)

Two legitimate reuses cross into list-view; **name them, never duplicate them:**

- **Record child-grids pair record-view CELLS with a list-view `DataTable`** (the editable `DataTable` variant — `editable-datatable-variant-epic`; delete = gutter `RecordDeleteButton` from common). So a record section legitimately imports **BOTH** `@/engines/record-view` AND `@/engines/list-view` (+ `@/engines/picker` for field selects) in one file. That is not a cage break.
- **`useRecordSectionPagination` (`RECORD_VIEW_PAGE_SIZE=15`)** — the hook record sections paginate with **physically LIVES in `@/engines/list-view`** (`list-view/client/`) — `record-section-pagination-engine`. engine-rv names this seam but must **NOT** duplicate or fork it.

### The cage (record-view's slice of the dependency rules)

The whole point of one folder is that a bug triages instantly as **engine vs consumer**. That only holds if the boundary holds:

- **Depends outward only** on `@/engines/common` + shared primitives (`@/components/*`, `@/types`, `@/transport`, …) + `@/engines/picker` for field selects. Nothing they own reaches back in.
- **Never imports from `apps/web/modules/*`** — module data comes through the section-controller / section-instance / page-controller injection seams above, never a direct import.
- **The list-view `DataTable` + `useRecordSectionPagination` reuse is SANCTIONED** — treat the DataTable and the pagination hook as shared seams, not a sibling-engine cage break. Do not fork either.
- **No re-export indirection** — do NOT re-export record-view symbols back out through `@/components`/`@/controllers` (`side-panel-retirement` retired that debt). `CellActionButton`/`RecordOpenButton`/`CellAddButton` live in `@/engines/common` and are re-exported *here* for convenience — moving an atom to/from common is a **parent `/engine`** job.
- **Consumers import only `@/engines/record-view`** (the barrel) — never a deep path.
- The boundary is **convention-only** today. You are the enforcement.

### Consumers

143 files across 17 modules, mirrored folder-for-folder per the convention above. Representative: `apps/web/modules/work-orders/components/record/work-order-detail-client.tsx:56`.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time — re-read the live record-view tree (15 buckets; contracts are distributed per presentation bucket; buckets drift). Never act on the model above without confirming it against the live folder.
- **Self-contained behind the barrel or it's not done.** Every symbol the change moves or adds lands in one record-view bucket, exported through `record-view/index.ts`, with consumers importing `@/engines/record-view`. No new deep-path imports, no re-export shims through `@/components`/`@/controllers`.
- **Preserve history on every move.** `git mv` (never delete-then-recreate) so blame survives; rewrite consumer imports with a scripted `perl -pi`/`sed` path swap; then run `/check-gauntlet` as the punch-list — report real error counts, never claim green from reading.
- **Stay in the cage — but honor the two sanctioned seams.** If a change would make record-view import from `modules/*`, stop and convert to a data-injection seam. The list-view `DataTable` in child-grids and `useRecordSectionPagination` (which lives in list-view) are **sanctioned shared reuses, not breaks** — never duplicate or fork them, and never move common atoms into record-view (that's `/engine`). No re-export out through `@/components`/`@/controllers`.
- **On a migration, mirror the canonical folder head-to-toe.** `components/record/` + `controllers/record/primary/` (+ `<child>/`) + `footer/`, full-page routes; build module-local only where the engine genuinely falls short — don't invent shared primitives mid-migration. Enforce the footer convention (Delete+Close in `RecordEntityFooter`, **no footer on create/`new`**).
- **Flag `save-conflict-guard-divergence` as an OPEN audit point when relevant** — the managed `RecordSectionSubHeader` leaves Save clickable during a save-conflict where the old bespoke `ActionHeader` blocked it. Encode it as a KNOWN AUDIT POINT to surface, not a settled rule to silently apply.
- **Tight, reviewable diff; defer polish.** Keep the diff to the move + import rewrites + genuinely-dead-code deletion. No new engine alignment test, no chasing `modules/shared` doc leftovers mid-sweep.
- **DO NOT COMMIT.** Provide a commit message of ≤17 words; the user commits. Schema changes (rare here) get their own commit. Drive the plan and surface open questions in your response — don't multiple-choice.
- **Explicit-only.** Trigger on the literal `/engine-rv`. Not on "the record page is broken", "fix the detail view", "look at the record engine".

## Step 1 — Ground in the live record-view tree

Before classifying the intent, read the current reality:

1. **`ls apps/web/engines/record-view/`** — which buckets exist right now (confirm the 15 above; note the distributed `contracts/` per presentation bucket).
2. **`apps/web/engines/record-view/index.ts`** + each relevant bucket's `index.ts` — the actual public surface and how the buckets are wired.
3. **The `client/` sub-barrels** — `client/controllers/`, `client/hooks/`, `client/scaffolds/`, `client/utils/` and `client/index.ts` — to see which controllers/hooks/scaffolds are exported and which section-controller seams a consumer supplies.
4. **The consumers** — `grep -rl "@/engines/record-view"` across `apps/web/modules/` and `apps/web/app/` to size the blast radius (expect ~143 files / 17 modules) and to spot deep-path leaks. Note which files ALSO import `@/engines/list-view` (the sanctioned child-grid seam) so you don't mistake it for a cage break.
5. **Relevant memory** — `record-view-migration-convention`, `reference-header-primitive`, `record-view-footer-convention`, `record-view-cell-link-affordances`, `record-section-pagination-engine`, `save-conflict-guard-divergence`, `property-record-view-split`, `inventory-record-view-migration`, `property-fields-shared-component`, `editable-datatable-variant-epic`, `side-panel-retirement`. Treat as context — verify against the code, don't trust blindly.

State what you found in one tight block (buckets present, target bucket layout, consumer count, cross-engine seams touched) before proposing the change.

## Step 2 — Classify the intent and apply the playbook

Match the ask to one of these. They compose — a migration often contains an extraction.

### A. Migrate a module onto the record-view scaffold
The module drops its bespoke detail/create view and consumes the engine. **Mirror the canonical folder head-to-toe** (`record-view-migration-convention`): `components/record/<m>-detail-client.tsx` hosting `RecordDetailClientScaffold` with a `useRecordPageController(...)` context; `<m>-record-panel.tsx` assembling `RecordMultiSectionPanel` from a `{controller, render}` array; `primary/<m>-primary-fields-section.tsx`; per-child `<child>-section.tsx`+`-grid.tsx`; `footer/` (`RecordEntityFooter`, **detail-only — no footer on create/`new`**); and `controllers/record/primary/use-<m>-primary-section.ts` (+ `<child>/`) wired via `useSingleSectionRecordController`/`useRecordSectionController` supplying `createLocalValue`/`saveSection`/`deleteRecord`/`detailUrl`/`payloadKey`/`scope`. Route to full pages. Child grids pair record-view cells with the list-view `DataTable` (sanctioned) and paginate via list-view's `useRecordSectionPagination`. Build module-local only where the engine falls short. Repoint imports to `@/engines/record-view`; delete the bespoke view the engine now owns.

### B. Extract a split-brain record primitive/controller into a bucket
1. **Find every piece** of the concept across `components/`, `controllers/`, and any module — grep the symbol names, not just the folder (the expandable-rows grid is the archetype: view in `components/grid/` + state in `controllers/`).
2. **Decide the bucket**: headless controller/hook/scaffold → `client/` (+ `expandable-rows/` sub-controller if reusable); editable cell → `cells/`; field chrome → `fields/`; panel assembly → `panel/`; section renderer → `sections/`; page chrome/header/footer/stepper → `shell/`; data-grid → `grid/`; error/notice → `feedback/`; batch/duplicate → `features/`; dialog → `dialogs/`; composite field cluster → `composites/`; types → the matching bucket's own distributed `contracts/`.
3. **`git mv`** the split halves into the one chosen bucket.
4. **Wire the barrel** — `export *` for the bucket; switch internal references to relative imports.
5. **Rewrite consumers** to `@/engines/record-view` with a path swap; **delete the emptied husk folders**.
6. `/check-gauntlet` until green.

### C. Upgrade / extend the engine
Add to the **right bucket** (types → the bucket's own `contracts/`, controller/hook/scaffold → `client/`, cell → `cells/`, field chrome → `fields/`, section renderer → `sections/`, page chrome → `shell/`, dialog → `dialogs/`). Keep every `contracts/` JSX-free. Export through the bucket barrel so it reaches `@/engines/record-view`. Assemble existing machinery before minting a new base — do not generalize for one consumer. A composite that would create a module cycle (property→MC) belongs in `composites/` (`property-fields-shared-component`; don't re-fork `PropertyFieldsSection`).

### D. Fix a record-view issue (triage engine-vs-consumer first)
That's what the cage is for. If the bug is in the engine, fix it inside the folder and confirm no consumer relied on the broken behavior. If a consumer is misusing the engine — deep-importing, reaching past a section-controller seam, or diverging from the footer/reference-header convention — fix the consumer (and if the misuse was *possible*, tighten the barrel so it can't recur). **When the report is a save-conflict / stuck-Save symptom, surface `save-conflict-guard-divergence` as the likely audit point** (managed `RecordSectionSubHeader` vs old `ActionHeader`), don't silently "fix" it into a new rule. A child-grid pairing record-view cells with the list-view `DataTable` is NOT a bug — that's the sanctioned seam.

### E. Organize the internals
Bucket hygiene: every file under exactly one of the 15 buckets; the distributed `contracts/` stay JSX-free and co-located with their presentation bucket; barrels in sync with the tree; relative imports internally; no deep-path leaks from consumers. Keep the public surface minimal. Do NOT pull `useRecordSectionPagination` in from list-view or fork the `DataTable` to "tidy" the cross-engine seam — that reshaping is a parent `/engine` call.

## Step 3 — Execute and verify

- Make the moves with `git mv`; rewrite importers with a scripted path swap; keep the diff scoped to the move + rewrites + genuinely-dead-code deletion.
- Run **`/check-gauntlet`** (or at minimum the typecheck it wraps) as the punch-list — do not claim green from reading. Report real error counts.
- If you reshaped a bucket, added a scaffold/section primitive, or migrated a module, update the **status of the relevant memory** (`record-view-migration-convention` for a new migration; the footer/reference-header/pagination memories if those seams moved) plus the `MEMORY.md` index line.

## Step 4 — Report (per project CLAUDE.md)

- **Headline + counts + TL;DR in the chat**; use a table for the file-by-file detail (what moved where, which barrels changed, consumer count repointed).
- **Open questions go in the response**, not deferred silently — bucket-home calls, whether a composite belongs in the engine vs the module, save-conflict-guard divergence exposure, footer/reference-header convention adherence, anything genuinely ambiguous.
- **End with a commit message ≤17 words** — but **do not commit**.

```
ENGINE-RV — <intent in one line>   (task <A–E>)

═══ Grounding ═══
Buckets: <15: adapters contracts client cells fields forms layout-grid grid panel sections shell feedback features dialogs composites>   Consumers: <N files / M modules>   Cross-engine seams touched: <DataTable / useRecordSectionPagination / none>

═══ Change ═══
| File / symbol | From | To (bucket) | Barrel | Consumers repointed |
|---|---|---|---|---|
| ... | components/... | record-view/<bucket>/... | + export | <N> |

═══ Verify ═══
/check-gauntlet: <✅ PASS | ❌ N errors>   Husks deleted: <list>   Cage intact: <✅ / ⚠️ note>   Mirror + footer convention: <✅ head-to-toe, no footer on create / n-a>   Save-conflict divergence: <⚠️ flagged / n-a>

═══ Open questions ═══
- <bucket-home / composite-vs-module / save-conflict audit point, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Act on the model in this file without re-reading the live `apps/web/engines/record-view/` tree first (15 buckets; contracts are distributed per presentation bucket; buckets drift).
- Own adding a brand-new column end-to-end — a new string/currency field across schema→module-UI→client-save-payload→tests defers to **`/column-new-string`** / **`/column-new-currency`**; engine-rv only renders the `FormField`/`MoneyCell` chrome.
- Own the actor/timestamp pairs — the created/updated actor-email and `createdAt`/`updatedAt` columns + their Eastern-time display defer to **`/column-actor`** / **`/column-timestamp`**; engine-rv only renders the static field.
- Own the palette column — the `PaletteColor` enum + list CellChip defer to **`/column-color`**; engine-rv renders only the `PaletteColorDropdown` form chrome.
- Own the record-number setup — the DB-generated `*NumberInt` column + stepper install defers to **`/row-number`**; engine-rv renders only the `RecordStepper` primitive.
- Cross engine boundaries — moves that touch `@/engines/common` (incl. moving an atom to/from common where `CellActionButton`/`RecordOpenButton`/`CellAddButton` live), promote/dissolve a sub-engine at the fleet level, or reshape barrels **across** engines defer to the parent **`/engine`**. Do NOT duplicate `useRecordSectionPagination` (shared with list-view) or fork the list-view `DataTable`.
- Move `useRecordSectionPagination` into record-view or fork the list-view `DataTable` to "clean up" the child-grid seam — those are sanctioned shared reuses, a parent `/engine` call at most.
- Re-fork a shared composite (`PropertyFieldsSection` / `AddressEditCell`) per module — they live in `composites/` to avoid a properties→MC cycle (`property-fields-shared-component`).
- Run a read-only audit (that's **`/dig`**) or broad module priming (that's **`/session-new`**).
- Commit the change. Provide a ≤17-word commit message; the user commits.
- Trigger on anything but the literal `/engine-rv` — not "the record page is broken" or "fix the detail view".
