# Sweeps 1-3 + ad-hoc imports work — archived plan

**Branch:** `staging` · **Drafted:** 2026-04-30 · **Status:** ✅ All sweeps + ad-hoc work shipped

This file captures the original V1 master plan as scoped + executed for Sweeps 1-3, plus the ad-hoc imports-module hardening that landed alongside. Sweep 4+ continues in [`sessions/v1-master-plan.md`](../v1-master-plan.md).

For execution details (commits, files touched, smoke results, follow-ups) see [`execution.md`](execution.md) in this folder. The Sweep 2+3 audit report is at [`sweep-2-3-cost-freight-audit.md`](sweep-2-3-cost-freight-audit.md).

---

## Context that drove these sweeps

The app was deployed on Railway with V1 in flight. Recent decisions:

1. **Cut logs are now WO-only** — mutations move from inventory record view to WO record view. The inventory-side routes/workers became dead paths; their UI was driving redundant edit surfaces. (Decommissioning lands in Sweep 4 — out of scope here.)
2. **Cost / freight aren't part of V1** — pricing isn't shown to V1 users. They lingered in the staged-inventory grid, the inventory record view, the inventory list, and the read-repository select.
3. **Products module had a correctness gap on `coveragePerUnit`** — server enforced the rule (required for vinyl-plank, carpet-tile, covebase, pad), UI did not. The cell was editable for non-required categories and the client-side validator's required/not-allowed branches never fired because the controller didn't pass `categorySlug` + `categoryName`.
4. **WOMI cut-log UI / files / Railway env audit** all rely on cut-log decommission landing first. (Deferred to Sweep 4-6 — out of scope here.)

---

## Sweep 1 — Coverage_per_unit cell hardening (descoped from products engine migration)

**Original scope:** migrate products module off `modules/shared/engines/`, enforce coverage rule, surface UoM columns.

**Plan revision (2026-04-30):** engine migration descoped per user direction — "let's forget about migrating the products off of the engine for now and just make sure that the coverage per unit cell is secure." Engine extraction, list-view migration, UoM column display, React Query SSR upgrade all deferred to a post-V1 sweep.

### Final goal
Make the `coveragePerUnit` cell on the product primary section secure end-to-end:
- Cell required when category is one of `vinyl-plank`, `carpet-tile`, `covebase`, `pad`
- Cell disabled (not editable) when category isn't one of the four; existing value auto-cleared on category change
- Client validator gets `categorySlug` + `categoryName` so its required / not-allowed branches actually fire before the server roundtrip

Server-side enforcement was already comprehensive (`createProductUseCase` + `updateProductUseCase` both check the rule); no work needed there.

### Pre-flight resolutions (all 7 open questions)

| # | Question | Resolution |
|---|---|---|
| 1 | Existing rows with coveragePerUnit on non-required category | **Leave value untouched.** No data fix. |
| 2 | `LIST_FILTERABLE_FIELDS = []` on products now or wait | **Wait** — defer to post-V1 list-view sweep |
| 3 | Materialize worker null-out for cost/freight | **Leave worker writing as today** — written but unread |
| 4 | Inventory cut-logs links route disposition (Sweep 4a) | **Delete entirely** — route + use case + cut-log-links-editor component |
| 5 | Sweep 4a dead-code aggressiveness | ⏳ Deferred to Sweep 4 kickoff |
| 6 | Sweep 5 PDF content gaps | ⏳ Deferred to Sweep 5 kickoff |
| 7 | Plan/execution file naming | `sessions/v1-master-plan.md` + `sessions/v1-master-execution.md` |

### Step 1 — Audit (shipped)
Audit report was created at `sessions/sweep-1-step-1-products-audit.md` documenting the engine migration plan as a future reference. Per the descope, only the coverage rule shipped; the audit doc was deleted before commit.

### Steps 2-3 — Code changes (shipped)
- UI cell hardening in `product-primary-fields-section.tsx`: `disabled || !coverageRequired` + `required` attribute + greyed treatment + auto-clear on category change
- Controller validator wiring: pass `categorySlug` + `categoryName` to `validateProductPrimaryForm` from both record-view (update) and create flows

### Step 4 — Verify (shipped)
Typecheck passed. Manual smoke deferred to user.

---

## Sweeps 2 + 3 — Cost/freight removal (bundled per user direction)

### Goal
Drop cost/freight from every V1 user-facing surface (staged-inv grid, inventory list, inventory record primary, both inventory cut-log grids), drop from the read-repo select + InventoryRow DTO + immutable-fields constant. Schema columns + write-repo + materialize worker untouched.

### Pre-flight resolutions
- Q1: Drop cost/freight from server validator + use-case patch handling (frontend can't reach those fields anymore via UI; ETL writes via a different repo path) → **confirmed**
- Q2: Drop the 4 entries from `INVENTORY_IMMUTABLE_FIELDS` (keeps constant in lockstep with `InventoryRow` type) → **confirmed**
- Q3: One bundled commit covering Sweeps 2 + 3 → **confirmed**

### Cut-log section UI cells included per user direction
"If the cut logs rows in inventory section show the cost and freight column then that can be included in the sweep as well." Both pending grid + historical grid had the columns; both cleaned in Sweep 3.

### What stayed untouched
- Schema columns at `prisma/schema.prisma:312-313` (cost, freight, costPerUnit, freightPerUnit) — no migration
- `packages/db/src/flooring/inventory/write-repository.ts` — worker still writes the four columns
- Materialize worker `materialize-imported-rows.ts` — still reads staged cost/freight + writes derived per-unit values
- Inventory cut-log drafts / controllers / use cases — Sweep 4 decommissions this whole layer; touching it earlier was premature

---

## Ad-hoc imports-module hardening (between Sweeps 2-3 and Sweep 4)

Four cleanup commits landed before Sweep 4 kickoff. Each was a small focused change.

### Prisma-guard fix
`packages/domain/src/flooring/imports/staged-inventory-rows/types.ts` was importing `FlooringStagedRowStatus` from `@prisma/client` (with a re-export). The repo's `guard:prisma` script does a naive substring match for `@prisma/client` and was failing on this file — blocking `npm run typecheck` and `npm run build` (top-level). Per-service deploy scripts (`build:web` / `build:worker` / `build:relay`) skipped the guard, so deploys weren't blocked, but local + CI typecheck was red.

**Fix:** replaced the import + re-export with a domain-owned string-literal union `"DRAFT" | "QUEUED" | "IMPORTED"` mirroring the schema enum. Data-layer's generated union is structurally identical, so values pass through without runtime conversion.

### Percent removal (Option C + Medium bonus)
The `percent: Decimal @default(0)` column on `FlooringImportEntry` was added as a worker-tracked materialization-progress indicator, but the wiring never landed. The worker never called `updateImportPercent`; the UI was the only consumer. Not part of V1.

**Drop scope:**
- UI column + cell in `imports-table.tsx`
- `percent: string` field on `ImportRow` domain DTO
- Read-repo normalization in `normalizeImportRow`
- Test fixture entries
- Dead `updateImportPercent` write-repo primitive (zero callers; confirmed via grep)
- Bonus (per user approval of Medium scope): dropped `IMPORT_WORKER_FIELDS` + `ImportWorkerField` type + `isImportWorkerField` predicate from editability.ts (constant became empty after percent drop; type + predicate had zero external consumers). Kept `IMPORT_USER_EDITABLE_FIELDS` + `IMPORT_AUTO_FIELDS` as scaffold mirroring the inventory + cut-logs editability files.

Schema column stays (no migration). Column is dormant.

### Bugfix: false-positive STAGED_UNKNOWN_LOCATION on staged-inv save
The `save-staged-inventory-rows` use case under-fetched locations: it only collected locationIds from `diff.added` and `diff.modified.patch.locationId`. The domain validator, by contrast, projected every post-diff row (including untouched existing ones) and checked each row's locationId against the resolved-locations index. Untouched existing rows with valid locations triggered `STAGED_UNKNOWN_LOCATION` because their locations weren't fetched.

Surfaced as `Referenced location <id> does not exist` in the UI when the user added a single new staged row in an import that had other existing rows with locations. Reproduced reliably from the user's screenshot.

**Fix:** extended `collectReferencedLocationIds` to also pull locationIds from existing rows that survive the diff (i.e. not in `diff.deleted`). Fetch pattern stays N+1 for now (pre-existing inefficiency); just expands the set of ids the use case asks for.

### Shared batch-select with select-all + dirty-aware gating
User asked for a "Select All" affordance on the staged-inventory grid + closing two long-standing gaps in selection wiring:
- Per-row checkbox could be toggled while section was dirty (silently abandoned unsaved edits when batch fired)
- Per-row data cells stayed editable while rows were checked (in-flight batches dispatched against stale snapshots)

Built as a shared abstraction so future consumers (Sweep 4c WOMI cut-log finalize, etc.) inherit gating for free:
- `apps/web/components/features/select-batch/SelectAllButton` — pure UI primitive, single toggle (Select All Eligible (N) ↔ Clear Selection (M))
- `apps/web/controllers/record/use-gated-batch-select.ts` — wraps the existing `useBatchSelectAction` primitive; adds `canToggleSelection` (false when dirty/saving/firing), `isSelectionActive` (any selected), `eligibleCount`, `toggleAllEligible`
- Tiny `extraActions?: ReactNode` slot added to `ActionHeader` so JSX action affordances can sit alongside descriptor-driven buttons in the same flex row

Imports module adopted: gates selection checkbox on `canToggleSelection`, locks all data cells when `isSelectionActive`, disables Add Row / Discard / Save Rows in selection mode, adds explicit `!isDirty` to Run Import's disabled condition.

UX decisions (resolved by user):
- Edit-lock scope: **section-wide** when any row is selected
- Button: **single toggle** (label flips with selection state)
- Run Import: **explicit `!isDirty`** added (defense-in-depth)

---

## Out of scope (deferred to V1 master plan / post-V1)

| Item | Where it lands |
|---|---|
| Inventory cut-log decommission (routes + workers + UI strip) | Sweep 4a + 4b |
| WOMI cut-log UI redesign (Save Pending + Finalize + Void) | Sweep 4c |
| WO Files section UI wiring | Sweep 5 |
| Service variables → Railway audit + docs | Sweep 6 |
| Products engine extraction + UoM columns + list-view controls | Post-V1 |
| Other modules off engine (Templates, Properties, Mgmt Cos, Manufacturers, Warehouse, Categories/UoM) | Post-V1 |
| Rich-dropdown pattern + virtualization | Post-V1 |
| Template Sync button (top-right) wiring | Post-V1 |
| Schema-level drop of cost/freight/costPerUnit/freightPerUnit | Post-V1 |

---

## Domain invariant honored across these sweeps

**Workers updating cut logs always update parent inventory's `totalCutSum` in the same transaction.**
- Implementation: `packages/application/src/flooring/inventory/cut-logs/apply-cut-log-pending-diff.ts:53-55` calls `updateInventoryTotalCutSum` after diff is applied.
- Untouched in Sweeps 1-3 (cut-log mutation layer not yet decommissioned).
- Sweep 4 will verify WOMI workers continue to honor this rule.
