# Sweeps 1-3 + ad-hoc imports work — archived execution log

**Branch:** `staging` · **Started:** 2026-04-30 · **All shipped + committed**

Plan: [`plan.md`](plan.md) · Audit: [`sweep-2-3-cost-freight-audit.md`](sweep-2-3-cost-freight-audit.md) · V1 continues: [`sessions/v1-master-plan.md`](../v1-master-plan.md)

---

## Status

| # | Sweep / Item | Status | Commit | Date |
|---|---|---|---|---|
| 1 | Coverage_per_unit cell hardening (descoped) | ✅ Shipped | `72790a80` | 2026-04-30 |
| 2+3 | Cost/freight removal (bundled) | ✅ Shipped | `abf3bd80` | 2026-04-30 |
| ad-hoc | Prisma-guard fix | ✅ Shipped | `9fff1d58` | 2026-04-30 |
| ad-hoc | Percent removal (Option C + Medium bonus) | ✅ Shipped | `1899ab61` | 2026-04-30 |
| ad-hoc | Bugfix: STAGED_UNKNOWN_LOCATION false positive | ✅ Shipped | `20ed6453` | 2026-04-30 |
| ad-hoc | Shared batch-select (Select All + dirty-aware gating) | ✅ Shipped | `29ce1f5e` | 2026-04-30 |

Manual smoke: cleared by user across all six commits.

---

## Sweep 1 — Coverage_per_unit cell hardening

**Commit:** `72790a80 products: harden coverage_per_unit cell with category-aware UI gates + client validator`

### Files touched (3)
1. [apps/web/modules/products/components/record/product-primary-fields-section.tsx](../../apps/web/modules/products/components/record/product-primary-fields-section.tsx) — coverage cell `disabled || !coverageRequired`, `required` attribute, `aria-required`, greyed via `opacity-60`, placeholder swap (`"0.0000"` ↔ `"Not applicable for this category"`); category select onChange auto-clears coverage when next category doesn't require it
2. [apps/web/modules/products/controllers/use-product-primary-section.ts](../../apps/web/modules/products/controllers/use-product-primary-section.ts) — record-view (update) flow: pulls `categorySlug` + `categoryName` from `record.category` and spreads into `validateProductPrimaryForm`
3. [apps/web/modules/products/components/record/product-create-client.tsx](../../apps/web/modules/products/components/record/product-create-client.tsx) — create flow: resolves `selectedCategory` from `categoryOptions` against `localValue.categoryId`, passes slug + name to validator

### Server-side enforcement (untouched, already comprehensive)
- `packages/application/src/flooring/products/create-product.ts:37-44` — null + required category → reject
- `packages/application/src/flooring/products/update-product.ts:55-62` — empty + required category → reject
- `packages/application/src/flooring/products/update-product.ts:64-71` — non-empty + non-allowing category → reject
- `packages/application/src/flooring/products/update-product.ts:73-94` — change while inventories link → reject

### Verification
✅ Typecheck passed clean. Manual smoke cleared by user.

### Follow-ups surfaced
- **Legacy data edge case:** product rows with `coveragePerUnit` populated on a non-requiring category can't be saved (cell disabled + server NOT_ALLOWED). Per resolved Open Q §1, no data fix. Track if it surfaces.
- Engine migration of products module remains queued for post-V1.

---

## Sweeps 2 + 3 — Cost/freight removal (bundled)

**Commit:** `abf3bd80 inventory: drop cost/freight from V1 user surfaces (UI + reads)`

### Files touched (16)

**Sweep 2 — Imports / staged inventory (7):**
1. `packages/domain/src/flooring/imports/staged-inventory-rows/diff/types.ts` — dropped cost/freight from `StagedInventoryRowDraft` + `StagedInventoryRowUpdatePatch`
2. `apps/web/app/api/imports/_validators.ts` — dropped from `shapeStagedDraft` + `shapeStagedPatch`
3. `packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts` — dropped from `patchToDbUpdate`; on add path hardcode `cost: null, freight: null` (data-layer signature still requires them; ETL writes via repo directly)
4. `apps/web/modules/imports/controllers/drafts.ts` — dropped from `ImportStagedRowDraft` type + factory
5. `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts` — dropped from `toDraftPayload` + `toUpdatePatch`
6. `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx` — column defs + cell branches removed
7. `apps/web/modules/imports/components/record/imported-rows/import-imported-rows-section.tsx` — same (historical view)

**Sweep 3 — Inventory + cut-log section UI cells + data layer (9):**
8. `packages/domain/src/flooring/inventory/types.ts` — dropped 4 fields from `InventoryRow`
9. `packages/domain/src/flooring/inventory/editability.ts` — dropped 4 entries from `INVENTORY_IMMUTABLE_FIELDS`
10. `packages/db/src/flooring/inventory/shared.ts` — dropped 4 fields from `inventoryRowSelect`
11. `packages/db/src/flooring/inventory/read-repository.ts` — dropped 4 normalizations
12. `apps/web/modules/inventory/components/list/inventory-client.tsx` — dropped 2 column defs
13. `apps/web/modules/inventory/components/list/inventory-table.tsx` — dropped column-layout entries + cell render branches
14. `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — dropped Row 4 (Cost + Freight static fields), shifted Notes from Row 5 → Row 4
15. `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx` — pending grid: column defs + cell branches removed
16. `apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx` — historical grid: column defs + cell branches removed

### Verification
✅ Typecheck passed clean across all 6 workspaces. Manual smoke cleared.

### Follow-ups surfaced
- **Pre-existing prisma-guard violation** at `packages/domain/src/flooring/imports/staged-inventory-rows/types.ts:1` — addressed in next ad-hoc commit (`9fff1d58`).
- **Legacy data:** rows with cost/freight populated stay in DB but never surface in V1 UI. Workers keep writing them.

---

## Ad-hoc — Prisma-guard fix

**Commit:** `9fff1d58 domain: replace prisma-client type import with local string-literal union`

### Files touched (1)
- [packages/domain/src/flooring/imports/staged-inventory-rows/types.ts](../../packages/domain/src/flooring/imports/staged-inventory-rows/types.ts) — replaced `import type { FlooringStagedRowStatus } from "@prisma/client"` + re-export with a local string-literal union `"DRAFT" | "QUEUED" | "IMPORTED"` mirroring the schema enum

### Gotcha discovered
The guard regex `/@prisma\/client/` does a naive substring match across the full file content (not just imports). My initial comment mentioned the package name and re-tripped the guard. Rewrote the comment to avoid the literal token. Worth noting if anyone touches the guard later.

### Verification
✅ `npm run guard:prisma` + `npm run typecheck` (full chain) both green.

---

## Ad-hoc — Percent removal (Option C + Medium bonus)

**Commit:** `1899ab61 imports: drop unused percent field + dead worker-only primitive`

### Files touched (6)
1. `packages/domain/src/flooring/imports/types.ts` — dropped `percent: string` from `ImportRow`; updated header comment
2. `packages/domain/src/flooring/imports/editability.ts` — dropped `IMPORT_WORKER_FIELDS` + `ImportWorkerField` type + `isImportWorkerField` predicate (Medium bonus); kept `IMPORT_USER_EDITABLE_FIELDS` + `IMPORT_AUTO_FIELDS` as scaffold
3. `packages/db/src/flooring/imports/read-repository.ts` — dropped `percent: toDecimalString(row.percent)` from `normalizeImportRow`
4. `packages/db/src/flooring/imports/write-repository.ts` — deleted `updateImportPercent` function + `UpdateImportPercentInput` type (dead — zero callers); updated stale JSDoc on `UpdateImportRecordInput`
5. `apps/web/modules/imports/components/list/imports-table.tsx` — dropped `percent` column def + cell branch
6. `apps/web/tests/modules/imports/imports-client.test.tsx` — dropped `percent` fixture entries

### What stayed
- `prisma/schema.prisma:368` — `percent Decimal @default(0)` column (no migration; column dormant)
- `IMPORT_USER_EDITABLE_FIELDS` + `IMPORT_AUTO_FIELDS` constants

### Verification
✅ Full typecheck green.

---

## Ad-hoc — Bugfix: false-positive STAGED_UNKNOWN_LOCATION on staged-inv save

**Commit:** `20ed6453 imports: fix false-positive "location does not exist" on staged-inventory save`

### Files touched (1)
- [packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts](../../packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts) — extended `collectReferencedLocationIds` to also pull locationIds from existing rows that survive the diff (not in `diff.deleted`); call site updated to pass `existingRows`

### Why it fired
The use case only collected locationIds from `diff.added` + `diff.modified.patch.locationId`. The domain validator projected every post-diff row (including untouched existing ones) and checked each one's locationId against the resolved-locations index. Untouched existing rows with valid locations triggered `STAGED_UNKNOWN_LOCATION` because their locations weren't fetched.

### Verification
✅ Typecheck + manual smoke cleared.

---

## Ad-hoc — Shared batch-select with select-all + dirty-aware gating

**Commit:** `29ce1f5e imports: add shared batch-select with select-all + dirty-aware gating`

### Files touched (6)

**New (3):**
1. [apps/web/components/features/select-batch/select-all-button.tsx](../../apps/web/components/features/select-batch/select-all-button.tsx) — toggle button primitive (Select All Eligible (N) ↔ Clear Selection (M))
2. [apps/web/components/features/select-batch/index.ts](../../apps/web/components/features/select-batch/index.ts) — barrel
3. [apps/web/controllers/record/use-gated-batch-select.ts](../../apps/web/controllers/record/use-gated-batch-select.ts) — section-aware hook wrapping `useBatchSelectAction` — adds `canToggleSelection`, `isSelectionActive`, `eligibleCount`, `toggleAllEligible`

**Edited (3):**
4. [apps/web/components/headers/action-header.tsx](../../apps/web/components/headers/action-header.tsx) — new optional `extraActions?: ReactNode` slot rendered before descriptor actions in the same flex row
5. [apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts](../../apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts) — swapped `useBatchSelectAction` → `useGatedBatchSelect` (passing `isSectionDirty` + `isSectionBusy`); surfaced 4 new fields
6. [apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx](../../apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx) — accept new props; gate selection checkbox on `canToggleSelection`; lock per-row data cells when `isSelectionActive`; disable Add Row / Discard / Save Rows in selection mode; explicit `!isDirty` on Run Import; render `<SelectAllButton>` via `extraActions`
7. [apps/web/modules/imports/components/record/import-record-panel.tsx](../../apps/web/modules/imports/components/record/import-record-panel.tsx) — pass new props from controller → section component

(Counted as 6 in commit: 3 new + 3 edits to imports module surfaces; ActionHeader counts as the 4th edit but bundled in for context.)

### Two gaps closed
1. **Dirty-state checkbox lock** — `editable={canToggleSelection && isServerRow && !locked}` blocks toggling while section dirty
2. **Edit-lock when selecting** — `editable = !locked && !isSelectionActive` locks every data cell once any row is checked, plus Add Row / Discard / Save Rows disable in selection mode

### UX decisions
- Edit-lock scope: section-wide
- Button: single toggle
- Run Import: explicit `!isDirty` added

### Verification
✅ Full typecheck (guard:prisma + 7 workspaces) green. Manual smoke cleared.

### Reusable for Sweep 4c
The shared `useGatedBatchSelect` hook + `SelectAllButton` component are designed to be adopted by WOMI cut-log finalize in Sweep 4c. The bespoke `use-work-order-cut-log-finalize.ts` will be replaced.

---

## Open follow-ups (forwarded to V1 master plan or post-V1 backlog)

| Item | Forwarded to |
|---|---|
| Sweep 4a dead-code aggressiveness (Open Q §5) | Sweep 4 kickoff |
| Sweep 5 PDF content gaps (Open Q §6) | Sweep 5 kickoff |
| Inventory cut-log decommission (routes + workers + UI strip) | Sweep 4a / 4b |
| WOMI cut-log UI (adopt shared batch-select) | Sweep 4c |
| WO Files section UI | Sweep 5 |
| Service variables → Railway docs | Sweep 6 |
| Products engine migration + list-view controls | Post-V1 |
| Other modules off engine | Post-V1 |
| Schema drop of cost/freight/percent columns | Post-V1 |
| Legacy products with coveragePerUnit on non-required categories | Post-V1 monitoring |

---

## Verification summary across all six commits

- ✅ Typecheck: `npm run typecheck` (full chain — guard:prisma + 7 workspaces) green at every commit
- ✅ Manual smoke: user cleared all six
- ✅ All commits landed on `staging` branch in order
