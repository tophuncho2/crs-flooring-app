# V1 Master Plan — Cut-Log Consolidation, Cost/Freight Removal, Products Migration

**Branch:** `staging` · **Drafted:** 2026-04-30 · **Status:** Pending approval

---

## Context

The app is deployed on Railway and we are still pushing edits before V1 ships. Recent decisions that drive this sweep:

1. **Cut logs are now WO-only.** Originally, cut logs were edited on the inventory record view AND the WO record view. We've decided cut logs are mutated *only* through WO record view. The WO-side workers + routes already exist and are hardened (per audit-2026-04-30 §4); the inventory-side equivalents are now dead code paths driving redundant UI.
2. **Cost / freight aren't part of V1.** They're "for future use" — pricing isn't shown to the user this version. They linger in the staged-inventory grid, the inventory record view, the inventory list, and the read-repository select.
3. **Products module isn't off the engine yet.** Other modules (templates, properties, mgmt cos, manufacturers, warehouse, categories/UoM) are also on the shared engine but are deferred post-V1 — products comes first because the coverage-per-unit validation rule is a V1 correctness requirement.
4. **WOMI cut-log UI is functional but coupled.** Save Pending and Finalize triggers are tangled in the same row-level control surface. We want three distinct actions: Save Pending (section header), Finalize Batch (section header, clean-slate gated), Void (inline per row + confirm dialog).
5. **File generation is deferred** until WOMI cut-log management is solid.
6. **Worker tuning lives in Railway env vars,** not code. Code already reads from `process.env` (per `apps/worker/src/env.ts`); the gap is auditing what's exposed and documenting the per-service Railway dashboard config.

**Outcome at the end of this sweep:** V1 is shippable. Inventory record view is a read-only window into cut logs. Work orders own all cut-log mutation. No cost/freight noise in any UI users see. Products module is on the new layering with coverage-per-unit validated for the four required categories. Worker concurrency/TTL is tuneable from Railway without touching the repo.

**Out of scope (post-V1, future sweeps):**
- Engine migration for templates / properties / mgmt cos / manufacturers / warehouse / categories / UoM
- Rich-dropdown pattern + virtualization for thousands-of-row dropdowns
- List-view search / filter / grouping wiring across modules
- Template Sync button (top-right) full wiring
- Schema-level drop of `cost`, `freight`, `costPerUnit`, `freightPerUnit` columns

---

## Sweep ordering (TL;DR)

| # | Sweep | Why this position | Layers touched | Schema commit? |
|---|---|---|---|---|
| 1 | Products migration + coverage rule | Standalone correctness fix; doesn't depend on others | Domain (already done), API, Module, Pages | No |
| 2 | Staged inventory cost/freight UI removal | Smallest blast radius; touches imports module only | Module (UI), Transport DTO | No |
| 3 | Inventory cost/freight removal (UI + reads) | Builds on #2 (same logical change, different surface) | Domain DTO, Data (read-repo select), Module | No |
| 4 | Inventory cut-log decomp + WOMI cut-log redesign | Core V1 change; safest after cost/freight noise is gone | Application, API, Worker, Module | No |
| 5 | WO Files section UI (Phase 2c) | Deferred until #4 proves WOMI cut-log flow is solid | Module, Pages | No |
| 6 | Service variables → Railway | End of sweep; settle defaults after observing real flow | Worker env audit + Railway dashboard | No |

No schema changes anywhere in this sweep. Each sweep ships as its own commit (cluster). Bug-fix commits may bundle as the user sees fit, but the six sweeps are not bundled with each other.

---

## Sweep 1 — Coverage_per_unit cell hardening (DESCOPED 2026-04-30)

> **Plan revision (2026-04-30):** Engine migration descoped per user direction — "let's forget about migrating the products off of the engine for now and just make sure that the coverage per unit cell is secure." Engine extraction, list-view migration, UoM column display, and React Query SSR upgrade all deferred to a post-V1 sweep. The Step 1 audit (`sessions/sweep-1-step-1-products-audit.md`) is preserved as reference for the future engine-migration sweep.

### Goal
Make the `coveragePerUnit` cell on the product primary section **secure end-to-end**: cell required when category is one of `vinyl-plank`, `carpet-tile`, `covebase`, `pad`; cell disabled (not editable) and any existing value auto-cleared when user switches to a non-requiring category; client-side pre-submit validator gets the data it needs to fire the rule branches before the server roundtrip. Server-side enforcement is already comprehensive (`createProductUseCase` + `updateProductUseCase` both check the rule); no work needed there.

### Pre-existing assets to lean on (no work needed)
- **Domain rule:** `packages/domain/src/flooring/categories/rules.ts:30` — `categoryRequiresCoveragePerUnit(slug)`
- **Domain validator:** `packages/domain/src/flooring/products/product-rules.ts:145` — `validateProductPrimaryForm(input)` returns error string or empty
- **Server-side enforcement:**
  - `packages/application/src/flooring/products/create-product.ts:37-44` — rejects null coverage when required
  - `packages/application/src/flooring/products/update-product.ts:55-62` — rejects empty coverage when required
  - `packages/application/src/flooring/products/update-product.ts:64-71` — rejects non-empty coverage when not allowed
  - `packages/application/src/flooring/products/update-product.ts:73-94` — blocks coverage change when inventories link to product
- **UI label cue:** `apps/web/modules/products/components/record/product-primary-fields-section.tsx:164` already shows `"Coverage Per Unit *"` when required

### Critical files (only 2 to edit)
- `apps/web/modules/products/components/record/product-primary-fields-section.tsx` — disable input when `!coverageRequired`; auto-clear coveragePerUnit when category select changes to a non-requiring category; add `required` attribute when required; visual greyed-out treatment
- `apps/web/modules/products/controllers/use-product-primary-section.ts` — pass `categorySlug` + `categoryName` to `validateProductPrimaryForm` so the required/not-allowed branches actually fire client-side (currently they're skipped because slug is undefined)

### Steps (descoped — was 7, now 4)
1. ~~Audit~~ ✅ Done (Step 1, 2026-04-30 — see `sessions/sweep-1-step-1-products-audit.md`)
2. Edit `product-primary-fields-section.tsx`: add `disabled={disabled || !coverageRequired}` to the coverage input; on category select change, if new category doesn't require coverage, also call `onFieldChange("coveragePerUnit", "")`; add `required={coverageRequired}` attribute; greyed-out CSS treatment for the disabled state.
3. Edit `use-product-primary-section.ts`: resolve `categorySlug` + `categoryName` from `product.category` (record-view mode — category is immutable) and pass them into `validateProductPrimaryForm({ ...localValue, categorySlug, categoryName })`.
4. Verify: typecheck passes; manual smoke confirms (a) `vinyl-plank` blocks empty coverage at the client before any network request, (b) switching from `vinyl-plank` to `tile` clears the value AND disables the cell, (c) save succeeds when category requires coverage and value is provided, (d) save fails with a clear inline error otherwise.

### Out of scope (deferred to post-V1 engine-migration sweep)
- Migrating products UI off `modules/shared/engines/`
- List-view layer migration (DashboardListPageScaffold → SectionHeader/Grid)
- UoM column display in list view
- React Query SSR upgrade for `dashboard/products/page.tsx`
- Record-view section file relocation (`product-primary-fields-section.tsx` → `record/sections/`)
- Transport migration (`engines/common/transport/*` → `@/transport`)

### Verification
- Typecheck: `npm run typecheck`
- Manual smoke (record-view, edit existing vinyl-plank product):
  1. Open `/dashboard/products/[id]` for a vinyl-plank product → coverage cell shows `*`, accepts numeric input, saves successfully
  2. Open `/dashboard/products/[id]` for a tile (or any non-requiring) product → coverage cell is disabled/greyed, value displays as empty, save succeeds
  3. (Create flow) `/dashboard/products/new` → pick vinyl-plank, leave coverage blank, click save → inline error before any HTTP call
  4. (Create flow) Pick vinyl-plank, type 1.234, switch to tile → coverage value clears AND cell disables; save succeeds
- Open question: existing rows of non-required categories that already have `coveragePerUnit` values stay untouched (per resolved Open Q §1) — confirm by loading such a row pre-edit; the cell is disabled but the underlying DB value is preserved unless the user explicitly saves.

---

## Sweeps 2 + 3 — Cost/freight removal (BUNDLED + SHIPPED 2026-04-30)

> **Plan revision (2026-04-30):** Sweeps 2 and 3 executed as a single bundled change per user direction. Audit at `sessions/sweep-2-3-cost-freight-inventory.md`. Execution log at `sessions/v1-master-execution.md` §Sweeps 2+3. Three open questions (drop server validator, drop INVENTORY_IMMUTABLE_FIELDS entries, single bundled commit) were all confirmed prior to execution. Typecheck passed across all 6 workspaces.

### Original Sweep 2 — Staged inventory: drop cost/freight cells from imports UI

### Goal
Remove `cost` and `freight` cells from the staged-inventory-rows grid in the imports record view. Keep the schema columns (`FlooringImportStagedInventoryRow.cost`, `.freight`) — they're written by ETL and consumed by the materialize worker. Just stop showing them to the user.

### Critical files
- `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx:35-36` — column definitions (remove)
- `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx:263-278` — `onRowFieldChange` handlers for `cost` and `freight` (remove)
- `apps/web/modules/imports/transport/` — request DTO if it has cost/freight fields, drop them from the validator (so frontend can't send arbitrary values)

### Steps
1. Remove the two column definitions and their cells.
2. Remove the row-field change handlers for `cost` and `freight`.
3. Drop `cost` / `freight` from any frontend update DTO + zod validator (server still accepts whatever ETL writes; just frontend can't update).
4. Leave the materialize worker behavior unchanged for now (see Open Question §3).

### Verification
- Open imports record view → confirm staged-inventory grid has no cost / freight columns
- Try saving the staged section → confirm no errors
- Run an import end-to-end → confirm staged rows are still created with cost/freight populated by ETL, and inventory rows still get costPerUnit/freightPerUnit derived as today

---

## Original Sweep 3 — Inventory record view: drop cost/freight from UI + read-repository select

### Goal
Remove `cost`, `freight`, `costPerUnit`, `freightPerUnit` cells from inventory list table, inventory record view primary fields section, and inventory cut-logs grid. **Drop these four fields from the `inventoryRowSelect` in the data layer** so we stop fetching dead columns. Keep the schema columns.

### Critical files
- `apps/web/modules/inventory/components/list/inventory-table.tsx:26-27` — list columns
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx:129-137` — primary section static fields
- `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx:25-26` — cut-logs grid columns (relevant even though sweep 4 makes this read-only)
- `packages/db/src/flooring/inventory/shared.ts:58-61` — **`inventoryRowSelect`** (drop `cost`, `freight`, `costPerUnit`, `freightPerUnit`)
- `packages/db/src/flooring/inventory/read-repository.ts:125-128` — normalization (drop the four field mappings)
- `packages/domain/src/flooring/inventory/types.ts` (or wherever `InventoryRow` is declared) — drop the four optional fields from the DTO type
- Any consumer that destructures these fields will need updating (typecheck will surface them)

### Steps
1. Drop the four fields from `inventoryRowSelect`.
2. Drop them from the read-repository normalization step.
3. Drop them from the domain `InventoryRow` type / DTO.
4. Run typecheck — fix every consumer surfaced (cells, formatters, controllers, transport response types).
5. Remove the cells from inventory list, primary section, cut-logs grid.
6. Note: the materialize worker still WRITES these columns (per Sweep 2 / Open Q §3). Reads stop fetching them — write path untouched.

### Verification
- Typecheck passes
- Inventory list view: cost / freight / per-unit columns gone
- Inventory record view: primary section has no cost/freight static fields; cut-logs grid has no cost/freight columns
- Database query plan: verify the inventory list query no longer SELECTs the four columns (optional — `EXPLAIN` or log SQL)

---

## Sweep 4 — Inventory cut-log decomp + WOMI cut-log UI redesign + worker hardening verification

This is the largest sweep. Suggest splitting into 4a, 4b, 4c, 4d as separate commits within the sweep.

### Goal
1. **Decommission inventory-side cut-log mutation** — delete API routes, workers, outbox event types. Inventory cut-logs section becomes a **read-only viewer** (still shows pending + historical cut logs; no add/edit/finalize/void controls).
2. **Redesign WOMI cut-log UI** so Save Pending, Finalize Batch, and Void are visually + behaviorally distinct.
3. **Verify** the domain invariant "workers updating cut logs always update parent inventory's cut sum in the same transaction" holds in the WOMI workers.
4. **Smoke-test** the full WOMI cut-log flow end-to-end on the live dev server.

### 4a. Decommission inventory-side cut-log routes + workers

**Critical files (delete or 410):**
- `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` — DELETE (was: pending diff save)
- `apps/web/app/api/inventory/[id]/cut-logs/finalize/route.ts` — DELETE
- `apps/web/app/api/inventory/[id]/cut-logs/void/route.ts` — DELETE
- `apps/web/app/api/inventory/[id]/cut-logs/links/route.ts` — DELETE (or migrate to WOMI scope if still needed — verify consumers first)
- `apps/worker/src/processors/pending-save-cut-log-batch.ts` — DELETE
- `apps/worker/src/processors/finalize-cut-log-batch.ts` — DELETE
- `apps/worker/src/processors/void-cut-log.ts` — DELETE (verify void is fully covered by the WOMI synchronous path)
- `apps/worker/src/bootstrap.ts` — remove the three worker registrations + their env imports
- `apps/worker/src/env.ts` — remove the three corresponding concurrency / lock-duration env vars (or keep if kept warm — but answer was decommission)
- `packages/domain/src/queue/pending-save-cut-log-batch.ts`, `finalize-cut-log-batch.ts`, `void-cut-log.ts` — DELETE outbox event types
- `packages/application/src/flooring/inventory/cut-logs/` — audit each use case; delete those whose only consumers were the three routes above. Keep `apply-cut-log-pending-diff.ts` if WOMI workers still call into it.
- `apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts` — strip mutation methods (`addRow`, `removeRow`, `setRowField`, `finalizeSelected`); keep only data fetching + display state

**modules/shared rule:** Per CLAUDE.md, do NOT delete from `modules/shared/` until 0 consumers remain. Audit `modules/shared/engines/record-view/contracts/cut-log-contracts.ts` consumers; if WOMI still uses these types, keep the file.

### 4b. Inventory cut-logs section → read-only viewer

**Critical files:**
- `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx` — strip add-row, edit-cell, finalize-button, void-button. Keep grid display, keep historical section.
- `apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx` — already read-only by nature; verify no controls.
- `apps/web/components/cut-log-row-actions/void-cut-log-button.tsx` — audit consumers. If only consumed from the inventory section being made read-only, remove the import. Don't delete the component yet (WOMI may use it).
- `apps/web/components/cut-log-row-actions/cut-log-links-editor.tsx` — same rule.
- `apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts` — kept but mutation methods removed (per 4a)

### 4c. WOMI cut-log UI redesign

**Goal layout:**
- **WOMI section header gets two new buttons:**
  - `Save Pending Cut Logs` — visible when pending cut logs across the WO are dirty. Click → triggers `save-work-order-item-pending-cut-log-diff` worker for every dirty WOMI in scope.
  - `Start Finalizing Batch` — visible only on a clean slate (no dirty material items, no dirty pending cut logs). Click → enters selection mode. In selection mode, each cut-log row gets a checkbox; user picks which to finalize, then clicks `Finalize Selected` to trigger `finalize-work-order-cut-log-batch`. A `Cancel Selection` button exits selection mode without finalizing.
- **Per-row inline:** each cut-log row gets a `Void` button. Click → opens a confirm dialog: "Void cut log #CUT-NNNNNN? This cannot be undone." → confirm triggers the synchronous void API.

**Critical files:**
- `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx:51-250` — add the section-header button row; wire dirty-state detection
- `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx` — add per-row Void button + confirm dialog. Add selection-mode checkbox visibility.
- `apps/web/modules/work-orders/controllers/use-work-order-material-items-section.ts` — expose dirty flags for both material-items and pending cut logs
- `apps/web/modules/work-orders/controllers/use-work-order-cut-log-finalize.ts:20-80` — selection-mode controller (already partially exists per Explore findings); ensure clean-slate gating + Cancel Selection
- `apps/web/modules/work-orders/controllers/use-work-order-cut-log-void.ts` — wire confirm dialog handoff
- `apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts` — expose section-level dirty flag for the new Save Pending button

**Reference for selection-mode pattern:** the inventory cut-logs section currently uses a similar "select rows then click button" pattern (per user's note "the inventory cut log section kind of uses the similar setup"). Look at `apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts` `finalizeSelected()` (lines ~290+) before deleting it in 4a — port the UX pattern, not the code.

### 4d. Verify + smoke

- Confirm `apply-cut-log-pending-diff.ts:53-55` (the parent-inventory `totalCutSum` updater) is called by the WOMI pending-diff worker AND the WOMI finalize-batch worker. Add an integration smoke if missing.
- Smoke test from the live dev server (per CLAUDE.md "For UI or frontend changes, start the dev server and use the feature in a browser before reporting"):
  1. Open a WO record view with at least 2 WOMI rows linked to inventory
  2. Expand a WOMI row → add 2 pending cut logs → click Save Pending → confirm worker fires + cut logs persist in QUEUED state
  3. Click Start Finalizing Batch → select 1 cut log → click Finalize Selected → confirm worker fires + cut log moves to FINAL + parent inventory `totalCutSum` updates
  4. Click Void on the remaining cut log → confirm dialog → confirm → cut log moves to VOID + parent inventory `totalCutSum` updates
  5. Open the inventory record view → confirm cut logs section is read-only and displays the 2 cut logs from the WO

### Verification
- Typecheck passes
- All 4 smoke steps pass
- `grep -r "/api/inventory/.*cut-logs" apps/web/modules/` returns no consumers (the inventory-side routes are gone and nothing tries to call them)

---

## Sweep 5 — WO Files section UI (Phase 2c)

### Goal
Wire up the third section of the WO record view: a Files section where users can open and delete generated files. File-generation worker already exists (`apps/worker/src/processors/generate-work-order-file.ts`) and triggers the `@builders/pdf` package — once Sweep 4 proves WOMI cut-log management is solid AND the Railway build chain includes `@builders/pdf` (per audit-2026-04-30 §1, already a one-line fix the user has applied), file generation goes live.

### Critical files
- `apps/web/modules/work-orders/components/record/files/` — components already exist per audit-2026-04-30 §8
- `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx:84-98` — add the third section after material-items
- `apps/web/app/api/work-orders/[id]/files/route.ts` — route already exists
- `apps/web/app/api/work-orders/[id]/files/[fileId]/route.ts` — route already exists
- `packages/application/src/flooring/work-orders/files/generate-work-order-file.ts` — use case already exists
- `packages/application/src/flooring/work-orders/files/request-work-order-file.ts` — use case already exists
- `packages/application/src/flooring/work-orders/files/delete-work-order-file.ts` — use case already exists

### Steps
1. Add the Files section as a sibling of primary + material-items in the WO record panel.
2. Wire a "Generate File" button that calls `request-work-order-file` use case → enqueues the file-gen worker.
3. List existing files with `Open` (signed URL to bucket) + `Delete` actions.
4. Confirm `generate-work-order-file` snapshots the WO data (including all final cut-logs) so the rendered PDF reflects the state at generation time.

### Verification
- Open a WO with finalized cut logs → click Generate File → confirm worker fires + file appears in the section after generation completes
- Open the file → confirm PDF renders with WO data + material items + cut logs
- Delete a file → confirm record + bucket object both gone

---

## Sweep 6 — Service variables → Railway

### Goal
Audit which worker tuning vars are environment-driven, fill any gaps (TTL, interval, retry-count, dead-letter), and document the Railway dashboard config per service so the user can tune concurrency without touching the repo.

### Critical files
- `apps/worker/src/env.ts` — Zod schema for all worker env vars. Audit: every worker should expose `*_CONCURRENCY`, `*_LOCK_DURATION_MS`, `*_INTERVAL_MS` (if polling), `*_TTL_MS` (if applicable), `*_MAX_ATTEMPTS`.
- `apps/worker/src/bootstrap.ts:44+` — verify each `Worker` constructor consumes the env-derived config.
- `sessions/sessions-1-through-11/session-5-cut-logs/staging-railway-service-variables-audit.md` — exists (per Explore findings); use as starting point.
- Railway dashboard — per-service env vars for `tsx-flooring-app`, `tsx-flooring-worker`, `tsx-flooring-relay`. No code change to the dashboard, but document required vars.

### Steps
1. Audit current `env.ts` schema — list every worker, every var, every default.
2. Identify gaps: workers without TTL, workers without max-attempts, workers without interval (where applicable). Add to schema with sane defaults.
3. Document the full env-var list per service in `sessions/<this-sweep>/railway-env-vars.md` so the user can paste into Railway.
4. After the doc, the user sets values in Railway dashboard. No deploy needed for env-only changes (Railway redeploys on var change).

### Verification
- Set an unrealistically low concurrency (e.g. 1) for the WOMI finalize worker in Railway → trigger 5 finalize batches simultaneously → confirm only 1 runs at a time
- Reset to production value
- Document confirms no hardcoded concurrency/TTL/interval anywhere in `apps/worker/src/`

---

## Domain rule to honor across all sweeps

**Workers updating cut logs always update parent inventory's `totalCutSum` in the same transaction.**

- Implementation: `packages/application/src/flooring/inventory/cut-logs/apply-cut-log-pending-diff.ts:53-55` calls `updateInventoryTotalCutSum` after diff is applied, in the same transaction.
- Already present. Verify in Sweep 4d that the WOMI pending-diff and finalize-batch workers both go through this code path.
- This rule is the reason the inventory-side decommission (4a) is safe: WOMI workers maintain the same invariant.

---

## Open questions (need answers before / during execution)

1. **Sweep 1 — products coverage_per_unit on existing rows:** when a product currently has a value in `coveragePerUnit` but its category is NOT one of the four required ones, do we (a) leave the value untouched, (b) null it on first save, or (c) null it via a one-time data fix? Recommend (a) — least invasive, the disabled cell just doesn't show the value.

2. **Sweep 1 — list-view controls deferred:** confirmed deferred to post-V1 per question response. But: if products is going to be the reference module for list-view controls in the future, do we want to lay the `LIST_FILTERABLE_FIELDS` array as `[]` now to surface the wiring hook, or wait?

3. **Sweep 2 / 3 — materialize worker null-out:** original prose said "the workers just set them as null because they're for future use." Question response chose option 2 (drop UI + reads, leave worker writes). To reconcile: do we (a) leave `materialize-import-batch.ts` unchanged so workers continue to populate cost/freight/costPerUnit/freightPerUnit on inventory rows (they're written but never read), or (b) change the worker to write null going forward (keeps DB clean, matches the "for future use" framing)? Recommend (a) for V1 — minimal change, future cleanup if pricing comes back.

4. **Sweep 4a — links route disposition:** `PATCH /api/inventory/[id]/cut-logs/links` exists. Is link editing still a thing post-WOMI-takeover? If yes, where does it live (WOMI cut-log row?). If no, delete the route + use case.

5. **Sweep 4a — dead-code aggressiveness:** delete the inventory-side use cases under `packages/application/src/flooring/inventory/cut-logs/` whose only consumers were the deleted routes? Or leave them as dead code in the application layer for safety (typecheck would catch any lingering caller anyway)? Recommend: delete the use cases — typecheck guarantees correctness and dead code rots fastest.

6. **Sweep 5 — file-gen content:** does the rendered PDF need any data shape we don't have today (specific layout of cut logs, photos of installed product, custom branding)? Or is current `generate-work-order-file.ts` sufficient as scaffolded?

7. **Plan/execution file location:** CLAUDE.md says "Plan files get added to the root of `sessions/`" — so on approval this plan moves to `sessions/v1-master-plan.md` (or similar) and an `sessions/v1-master-execution.md` file is created. Confirm naming convention.

---

## Critical files summary (single list, sweep-tagged)

| File | Sweep | Action |
|---|---|---|
| `apps/web/modules/products/**` | 1 | Migrate off engine; mirror imports module pattern |
| `packages/domain/src/flooring/categories/rules.ts:30` | 1 | Reuse — do not duplicate |
| `packages/application/src/flooring/products/` | 1 | Add zod validator using `categoryRequiresCoveragePerUnit` |
| `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx:35-36,263-278` | 2 | Remove cost/freight columns + handlers |
| `apps/web/modules/inventory/components/list/inventory-table.tsx:26-27` | 3 | Remove cost/freight columns |
| `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx:129-137` | 3 | Remove cost/freight static fields |
| `packages/db/src/flooring/inventory/shared.ts:58-61` | 3 | Drop 4 fields from `inventoryRowSelect` |
| `packages/db/src/flooring/inventory/read-repository.ts:125-128` | 3 | Drop 4 field mappings from normalization |
| `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` | 4a | Delete |
| `apps/web/app/api/inventory/[id]/cut-logs/finalize/route.ts` | 4a | Delete |
| `apps/web/app/api/inventory/[id]/cut-logs/void/route.ts` | 4a | Delete |
| `apps/web/app/api/inventory/[id]/cut-logs/links/route.ts` | 4a | Delete or migrate (Open Q §4) |
| `apps/worker/src/processors/pending-save-cut-log-batch.ts` | 4a | Delete |
| `apps/worker/src/processors/finalize-cut-log-batch.ts` | 4a | Delete |
| `apps/worker/src/processors/void-cut-log.ts` | 4a | Delete |
| `apps/worker/src/bootstrap.ts` | 4a | Remove 3 worker registrations |
| `apps/worker/src/env.ts` | 4a, 6 | Remove 3 concurrency/lock vars (4a); audit + extend (6) |
| `packages/domain/src/queue/pending-save-cut-log-batch.ts`, `finalize-cut-log-batch.ts`, `void-cut-log.ts` | 4a | Delete outbox event types |
| `packages/application/src/flooring/inventory/cut-logs/` | 4a | Audit + delete dead use cases (per Open Q §5) |
| `apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts` | 4a, 4b | Strip mutation methods; keep display state |
| `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx` | 4b | Convert to read-only viewer |
| `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx:51-250` | 4c | Add section-header buttons |
| `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx` | 4c | Add inline Void + selection checkbox |
| `apps/web/modules/work-orders/controllers/use-work-order-cut-log-finalize.ts:20-80` | 4c | Tighten clean-slate gating |
| `apps/web/modules/work-orders/components/record/files/` | 5 | Wire as third section of WO record |
| `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx:84-98` | 5 | Add Files section after material-items |
| `apps/worker/src/env.ts` | 6 | Audit + add missing TTL/interval/max-attempts vars |
| Railway dashboard (3 services) | 6 | Document required env vars |

---

## After approval

Per CLAUDE.md:
1. This plan is moved to `sessions/v1-master-plan.md` (or chosen name) and **locked**.
2. `sessions/v1-master-execution.md` is created and updated after each sweep ships.
3. If any plan changes are needed mid-sweep, they're recorded in the plan file (not the execution file).
4. A 4th file (`sessions/v1-master-cleanup.md`) may be created if execution surfaces follow-ups.
5. Schema commits stay isolated (no schema changes planned, so this is a no-op for now).
6. Commit messages provided per sweep; **DO NOT commit changes** without explicit user instruction.
