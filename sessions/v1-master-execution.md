# V1 Master Execution Log

**Branch:** `staging` · **Plan:** [`sessions/v1-master-plan.md`](v1-master-plan.md) · **Started:** 2026-04-30

This file is updated after each sweep ships. The plan file is locked once approved; mid-sweep plan changes are recorded in the plan file (not here). A `v1-master-cleanup.md` may be created if execution surfaces follow-ups.

---

## Status

| # | Sweep | Status | Date | Commit(s) |
|---|---|---|---|---|
| 1 | Coverage_per_unit cell hardening (descoped) | ✅ Code shipped (manual smoke + commit pending) | 2026-04-30 | — |
| 2 | Staged inventory cost/freight UI removal | ✅ Code shipped (bundled with #3, commit pending) | 2026-04-30 | — |
| 3 | Inventory cost/freight removal (UI + reads) | ✅ Code shipped (bundled with #2, commit pending) | 2026-04-30 | — |
| 4 | Inventory cut-log decomp + WOMI cut-log redesign | ⬜ Not started | — | — |
| 5 | WO Files section UI (Phase 2c) | ⬜ Not started | — | — |
| 6 | Service variables → Railway | ⬜ Not started | — | — |

Legend: ⬜ Not started · 🟡 In progress · ✅ Shipped · ❌ Blocked

---

## Pre-flight: open questions resolution

Before Sweep 1 kicks off, the 7 open questions in the plan need answers. Resolutions captured here once provided:

1. **Sweep 1 — products coverage_per_unit on existing rows:** ✅ Resolved (2026-04-30) — **Leave value untouched.** Cell disabled in UI but underlying value stays. No data fix.
2. **Sweep 1 — `LIST_FILTERABLE_FIELDS = []` now or wait:** ✅ Resolved (2026-04-30) — **Wait.** Don't add the empty array. Keep the sweep focused.
3. **Sweep 2 / 3 — materialize worker null-out:** ✅ Resolved (2026-04-30) — **Leave worker writing as today.** Worker continues populating the 4 columns. Written but never fetched.
4. **Sweep 4a — links route disposition:** ✅ Resolved (2026-04-30) — **Delete entirely.** Remove route + use case + `cut-log-links-editor.tsx` component.
5. **Sweep 4a — dead-code aggressiveness:** ⏳ Deferred (will ask before Sweep 4a starts)
6. **Sweep 5 — file-gen content gaps:** ⏳ Deferred (will ask before Sweep 5 starts)
7. **Plan/execution file naming:** ✅ Resolved — `sessions/v1-master-plan.md` + `sessions/v1-master-execution.md`

---

## Sweep 1 — Coverage_per_unit cell hardening (descoped)

✅ Code changes complete; awaiting user manual smoke + commit approval.

### Step 1 — Audit ✅ shipped 2026-04-30
Report: [`sessions/sweep-1-step-1-products-audit.md`](sweep-1-step-1-products-audit.md). Stays as reference for the future engine-migration sweep.

### Plan revision 2026-04-30 — engine migration descoped
Per user direction, sweep narrowed to coverage_per_unit cell hardening only. Engine migration, list-view changes, UoM column display, and React Query SSR upgrade all deferred to post-V1.

### Step 2 — UI cell hardening ✅ shipped 2026-04-30
File: [`apps/web/modules/products/components/record/product-primary-fields-section.tsx`](../apps/web/modules/products/components/record/product-primary-fields-section.tsx)

Changes:
- Coverage Per Unit input: `disabled={disabled || !coverageRequired}` + `required={coverageRequired}` + `aria-required={coverageRequired}` + greyed-out via `opacity-60` when not required + `disabled:cursor-not-allowed` + placeholder swap (`"0.0000"` ↔ `"Not applicable for this category"`)
- Category select onChange: when user picks a category that does NOT require coverage, ALSO call `onFieldChange("coveragePerUnit", "")` so the value is cleared in the same render rather than left dangling

### Step 3 — Client validator wired with slug + name ✅ shipped 2026-04-30
Files:
- [`apps/web/modules/products/controllers/use-product-primary-section.ts`](../apps/web/modules/products/controllers/use-product-primary-section.ts) — record-view (update) flow: pulls `categorySlug` + `categoryName` from `record.category` and spreads into `validateProductPrimaryForm`. Comment explains why (category is immutable post-create, so the loaded record is the authoritative source).
- [`apps/web/modules/products/components/record/product-create-client.tsx`](../apps/web/modules/products/components/record/product-create-client.tsx) — create flow: resolves `selectedCategory` from `categoryOptions` against `localValue.categoryId`, passes slug + name to validator. (Same gap existed there — `localValue` alone doesn't carry slug/name.)

Effect: the validator's `categoryRequiresCoveragePerUnit && !coveragePerUnit` and `!categoryRequiresCoveragePerUnit && coveragePerUnit` branches now actually fire client-side, raising the inline error before any HTTP roundtrip.

### Step 4 — Verify ✅ typecheck passed; manual smoke pending user
- `npm run typecheck --workspace @builders/web` — passed clean (only output: `✓ Types generated successfully`)
- Manual smoke (deferred to user): exercise (a) record-view edit on vinyl-plank product, (b) record-view edit on a non-requiring product (cell disabled), (c) create flow with vinyl-plank + blank coverage (inline reject before HTTP), (d) create flow + switch category from vinyl-plank to tile (value clears + cell disables).

### Files touched (3)
1. `apps/web/modules/products/components/record/product-primary-fields-section.tsx`
2. `apps/web/modules/products/controllers/use-product-primary-section.ts`
3. `apps/web/modules/products/components/record/product-create-client.tsx`

### Server-side enforcement (untouched, already comprehensive)
- `packages/application/src/flooring/products/create-product.ts:37-44` — null + required category → reject
- `packages/application/src/flooring/products/update-product.ts:55-62` — empty + required category → reject
- `packages/application/src/flooring/products/update-product.ts:64-71` — non-empty + non-allowing category → reject
- `packages/application/src/flooring/products/update-product.ts:73-94` — change while inventories link → reject

### Commit message (proposed; awaiting user instruction to commit)
```
products: harden coverage_per_unit cell with category-aware UI gates + client validator

- Disable Coverage Per Unit input when the selected category isn't one of the
  four that require it (vinyl-plank, carpet-tile, covebase, pad). Greyed-out
  styling, "Not applicable for this category" placeholder, aria-required +
  required attributes track the rule.
- When the user changes category to a non-requiring one, auto-clear
  coveragePerUnit in the same render so the draft can never carry a value
  the server will reject.
- Pass categorySlug + categoryName to validateProductPrimaryForm in both the
  record-view (update) and create flows so the required / not-allowed branches
  actually fire client-side instead of relying on the server roundtrip.

Server-side enforcement unchanged — already comprehensive in
createProductUseCase + updateProductUseCase.
```

### Follow-ups surfaced
- **Legacy data edge case:** if any product row has `coveragePerUnit` populated on a non-requiring category (shouldn't exist if rules were always enforced, but possible from older data), the user can't save edits on that row — the cell is disabled + the server's NOT_ALLOWED branch fires on save. Per resolved Open Q §1, no data fix in this sweep. Track as a separate post-V1 item if it ever surfaces.
- Engine migration of products module remains queued for post-V1 (audit report already documents the plan).

---

## Sweeps 2 + 3 — Cost/freight removal (bundled)

✅ Code shipped 2026-04-30. Audit: [`sessions/sweep-2-3-cost-freight-inventory.md`](sweep-2-3-cost-freight-inventory.md). Awaiting user manual smoke + commit approval.

### Pre-flight resolutions (2026-04-30)
- Q1: Drop server validator + use-case fields for staged inv → ✅ confirmed
- Q2: Drop the 4 entries from `INVENTORY_IMMUTABLE_FIELDS` → ✅ confirmed
- Q3: One bundled commit covering both sweeps → ✅ confirmed

### Files touched (16)

**Sweep 2 (imports / staged inventory):**
1. [packages/domain/src/flooring/imports/staged-inventory-rows/diff/types.ts](../packages/domain/src/flooring/imports/staged-inventory-rows/diff/types.ts) — dropped `cost` + `freight` from `StagedInventoryRowDraft` and `StagedInventoryRowUpdatePatch`
2. [apps/web/app/api/imports/_validators.ts](../apps/web/app/api/imports/_validators.ts) — dropped cost/freight from `shapeStagedDraft` + `shapeStagedPatch`
3. [packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts](../packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts) — dropped from `patchToDbUpdate`; on the add path, hardcode `cost: null, freight: null` since the data-layer `applyStagedInventoryRowsDiff` input still requires the fields (worker / ETL paths can still set them via the data layer directly)
4. [apps/web/modules/imports/controllers/drafts.ts](../apps/web/modules/imports/controllers/drafts.ts) — dropped from `ImportStagedRowDraft` type + `createImportStagedRowDraft` factory
5. [apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts](../apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts) — dropped from `toDraftPayload` + `toUpdatePatch`
6. [apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx](../apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx) — dropped column defs + `case "cost"` / `case "freight"` cell branches
7. [apps/web/modules/imports/components/record/imported-rows/import-imported-rows-section.tsx](../apps/web/modules/imports/components/record/imported-rows/import-imported-rows-section.tsx) — same (historical "imported rows" view)

**Sweep 3 (inventory + cut-log section UI cells + data layer):**
8. [packages/domain/src/flooring/inventory/types.ts](../packages/domain/src/flooring/inventory/types.ts) — dropped `cost`, `freight`, `costPerUnit`, `freightPerUnit` from `InventoryRow`
9. [packages/domain/src/flooring/inventory/editability.ts](../packages/domain/src/flooring/inventory/editability.ts) — dropped 4 entries from `INVENTORY_IMMUTABLE_FIELDS`
10. [packages/db/src/flooring/inventory/shared.ts](../packages/db/src/flooring/inventory/shared.ts) — dropped 4 fields from `inventoryRowSelect` (stops fetching dead columns)
11. [packages/db/src/flooring/inventory/read-repository.ts](../packages/db/src/flooring/inventory/read-repository.ts) — dropped 4 normalizations from `normalizeInventoryRow`
12. [apps/web/modules/inventory/components/list/inventory-client.tsx](../apps/web/modules/inventory/components/list/inventory-client.tsx) — dropped 2 column definitions
13. [apps/web/modules/inventory/components/list/inventory-table.tsx](../apps/web/modules/inventory/components/list/inventory-table.tsx) — dropped 2 column-layout entries + 2 cell render branches
14. [apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx](../apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx) — dropped Row 4 (Cost + Freight static fields), shifted Notes from Row 5 → Row 4
15. [apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx](../apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx) — dropped 2 column defs + 2 case branches (pending cut-log grid)
16. [apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx](../apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx) — same (final/voided cut-log grid)

### Verification
- ✅ Typecheck passed clean across all 6 workspaces (`@builders/domain`, `@builders/db`, `@builders/application`, `@builders/web`, `@builders/worker`, `@builders/relay`)
- ⚠️ `npm run typecheck` (full chain) blocked by a pre-existing prisma-guard violation at [packages/domain/src/flooring/imports/staged-inventory-rows/types.ts:1](../packages/domain/src/flooring/imports/staged-inventory-rows/types.ts) (`import type { FlooringStagedRowStatus } from "@prisma/client"`). Confirmed via `git stash` test — this guard fails on HEAD without my changes too. Out of scope for this sweep; flagged for separate cleanup.
- Manual smoke (deferred to user):
  1. Imports record view → confirm staged-inventory grid + imported-rows grid have no cost/freight columns
  2. Inventory list view → confirm cost/freight columns gone (no toggle in column visibility menu either)
  3. Inventory record view → primary section has no cost/freight; pending + historical cut-log grids have no cost/freight columns
  4. Save edits on a staged-inv row → confirm save succeeds (server no longer expects cost/freight; use case writes null)
  5. Run an import end-to-end → confirm import succeeds, inventory rows materialize cleanly

### What stays untouched (per audit + resolved Open Q §3)
- Schema columns at `prisma/schema.prisma:312-313` (cost, freight, costPerUnit, freightPerUnit) — no schema change
- `packages/db/src/flooring/inventory/write-repository.ts` — worker still writes the four columns
- `packages/db/src/flooring/imports/staged-inventory-rows/write-repository.ts` — ETL paths can still write cost/freight directly via the data layer
- `packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts` — materialize worker still reads staged cost/freight + writes derived per-unit values onto inventory rows
- Inventory cut-log drafts / controllers / use cases (`apps/web/modules/inventory/controllers/drafts.ts`, `use-inventory-cut-logs-section.ts`, `packages/application/src/flooring/inventory/cut-logs/`) — Sweep 4 decommissions this entire layer; touching it now would be premature work

### Commit message (proposed; awaiting user instruction to commit)
```
inventory: drop cost/freight from V1 user surfaces (UI + reads)

Sweeps 2 + 3 from sessions/v1-master-plan.md — cost/freight isn't part
of V1. Hide it from the user end-to-end while preserving the schema +
write path for future use.

Imports / staged inventory:
- Drop cost/freight cells from the staged-inventory grid + imported-rows
  grid in the imports record view
- Drop cost/freight from StagedInventoryRowDraft + StagedInventoryRowUpdatePatch
  domain types + ImportStagedRowDraft frontend draft + the diff builder
- Drop cost/freight from the server validator (shapeStagedDraft +
  shapeStagedPatch) and from saveStagedInventoryRowsUseCase's patch
  handling. Hardcode cost/freight to null on the add path; ETL paths
  that still need to set them write via the data layer directly.

Inventory:
- Drop cost/freight columns from list view + primary fields section +
  both cut-log grids (pending + historical)
- Drop cost/freight/costPerUnit/freightPerUnit from inventoryRowSelect,
  the read-repository normalization, the InventoryRow DTO, and
  INVENTORY_IMMUTABLE_FIELDS — stops fetching dead columns end-to-end
- Schema columns + inventory write-repo + materialize worker untouched
  (worker still seeds the four columns; no V1 reader consumes them)

Inventory cut-log mutation layer (drafts, controllers, use cases) is
left intact — Sweep 4 decommissions it as part of the WOMI handover.
```

### Follow-ups surfaced
- **Pre-existing prisma-guard violation** in `packages/domain/src/flooring/imports/staged-inventory-rows/types.ts:1` — domain imports a value from `@prisma/client` (`FlooringStagedRowStatus`). Should be replaced with a domain-owned union string literal to satisfy the guard. Track for cleanup; out of scope here.
- **Legacy data edge case (mirrors Sweep 1):** if any staged-inventory or inventory row has cost/freight populated (from older data or ETL), it'll stay in the DB but never surface in the UI. Workers continue to write them. No data fix in this sweep per resolved Open Q §3.

---

## Sweep 4 — Inventory cut-log decomp + WOMI cut-log redesign

_Not started._

### 4a — Decommission inventory-side cut-log routes + workers
_Not started._

### 4b — Inventory cut-logs section → read-only viewer
_Not started._

### 4c — WOMI cut-log UI redesign
_Not started._

### 4d — Verify + smoke
_Not started._

---

## Sweep 5 — WO Files section UI (Phase 2c)

_Not started._

---

## Sweep 6 — Service variables → Railway

_Not started._
