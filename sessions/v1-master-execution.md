# V1 Master Execution Log

**Branch:** `staging` · **Plan:** [`sessions/v1-master-plan.md`](v1-master-plan.md) · **Started:** 2026-04-30

This file is updated after each sweep ships. The plan file is locked once approved; mid-sweep plan changes are recorded in the plan file (not here). A `v1-master-cleanup.md` may be created if execution surfaces follow-ups.

---

## Status

| # | Sweep | Status | Date | Commit(s) |
|---|---|---|---|---|
| 1 | Coverage_per_unit cell hardening (descoped) | 🟡 In progress | 2026-04-30 | — |
| 2 | Staged inventory cost/freight UI removal | ⬜ Not started | — | — |
| 3 | Inventory cost/freight removal (UI + reads) | ⬜ Not started | — | — |
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

## Sweep 2 — Staged inventory cost/freight UI removal

_Not started._

---

## Sweep 3 — Inventory cost/freight removal (UI + reads)

_Not started._

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
