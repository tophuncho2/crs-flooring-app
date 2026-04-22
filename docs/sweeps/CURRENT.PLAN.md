# Current Plan — Sweep 3: Categories · Cut Logs · Inventory Computed Fields

Companion context: `REFERENCE.md` (the four-module vision — this sweep lands the "Category-driven unit conversion" + "Cut logs" pieces of it). Sweep 2 (`isImported` UX) is fully shipped; every change in the previous `CURRENT.PLAN.md` was marked ✅. This plan replaces that content.

**Purpose.** Secure cut logs, wire inventory's computed balances to the user-spec semantics, snapshot cut-log cost + waste, and extend category seeds. Work-order material-item fulfillment is **out of scope** — this sweep stops at "cut log mutations from the inventory record view are complete and categories are the source of truth for computation."

**Pre-wiring audit finding (critical):** a lot of this is already plumbed from Sweep 1/2:

- `FlooringCategory` schema has all five unit slots — `stockUnitId`, `sendUnitId`, `coverageAvailableUnitId`, `itemCoverageUnitId`, `serviceUnitId`. ✅
- `FlooringProduct.categoryId` required; `FlooringProduct.coveragePerUnit` nullable `Decimal`. ✅
- `FlooringInventory.productId` required — `inventory → product → category` is always reachable; no need for a redundant `categoryId` on inventory or cut-log. ✅
- `FlooringCutLog.status String @default("PENDING")` exists; `before`, `cut`, `after` exist. ✅
- `InventoryRow` domain type already carries `categoryId`, `categoryName`, `stockUnit`, `sendUnit`, `coveragePerUnit`, and the five balance fields (`uncutBalance`, `availableBalance`, `availableCoverage`, `awaitingCutBalance`, `totalCutBalance`). ✅
- `packages/db/src/flooring/inventory/read-repository.ts::normalizeInventoryRow` populates all five balances from a `groupBy` aggregate over cut logs by status. ✅

**What's actually new this sweep** (the delta):

1. Cut-log schema gains `price Decimal?` + `isWaste Boolean @default(false)` — one migration.
2. More seeded categories: carpet, pad, baseboard. All required unit-of-measures already seeded.
3. Domain `unit-conversion.ts` + `CATEGORY_UNIT_RULES` map (vinyl-plank rounds up, carpet/pad split, baseboard opts out of coverage).
4. Domain `cut-logs/` subfolder (today all cut-log rules live inline in inventory-rules.ts; extract).
5. Cut-log row gets a computed `coverage` field (`cut × coveragePerUnit`, blank when category has no coverage unit).
6. Inventory normalizer's `availableBalance` vs `uncutBalance` semantics need a sign swap to match the user's spec — Change 5.
7. UI: cut-logs grid columns for `coverage`, `price`, `isWaste`, and status toggle. Inventory primary section surfaces the five balance tiles.

**Prisma migrations needed:** exactly one (cut-log `price` + `isWaste`).

---

## Change 1 — Verify Sweep-2 is still intact (formerly Change 6)

**Purpose.** Before touching cut logs, re-confirm the Sweep-2 foundation is still in place end-to-end. Sweep-2's old Change 6 was the "keep `FlooringImportEntry.status` editable as pure display metadata" decision. Moving it here expands it into the full Sweep-2 audit, because every downstream change in this sweep sits on top of that foundation.

**Scope.** Read-only verification. No code changes unless drift is detected. If drift is detected, fix in place and re-verify before proceeding to Change 2.

### Verification checklist

Run these greps and reads; each line must return the expected result:

1. **Import status stays editable** (the literal old-Change-6 decision):
   - `apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx` — primary `status` is a `<select>` with PENDING/FINAL options.
   - `apps/web/modules/imports/components/list/imports-table.tsx` — `status` column renders via `formatImportStatus` + `getImportStatusFieldClass`.
   - Grep `grep -rn "importEntry\.status\|row\.importStatus" apps packages | grep -v dist | grep -v node_modules` → zero hits outside the imports module itself. Import status is **decorative only** — nothing depends on it.

2. **Per-row `isImported` pipeline is whole:**
   - Domain: `InventoryRow.isImported: boolean` present; `importTag`, `importStatus`, `importTransportType` absent.
   - Domain: `isImportedReversal`, `assertImportedTransitionAllowed`, `IMPORTED_REVERSAL_NOT_ALLOWED` exported from `packages/domain/src/flooring/inventory/`.
   - Domain diff: `InventoryDiffValidationIssue` includes `IMPORTED_REVERSAL_NOT_ALLOWED` variant.
   - Application: `update-inventory.ts` throws `InventoryExecutionError("IMPORTED_REVERSAL_NOT_ALLOWED")` on true→false transitions.
   - Application: `save-inventory-rows.ts::toDiffExisting` forwards `isImported`.
   - Data: `inventoryRowSelect` in `packages/db/src/flooring/inventory/shared.ts` does NOT select `importEntry.tag/status/transportType`; `InventoryListFilter.isImported?: boolean` supported; `buildListWhere` forwards it.
   - Data: `importInventorySelect` includes `isImported: true`; `normalizeImportInventoryRow` emits it.
   - Data: `applyImportInventoryRowsDiff` persists `isImported` on create + update and falls back to `input.importWarehouseId` on added-row warehouse resolution.
   - Routes: `apps/web/app/api/inventory/_validators.ts::validateUpdateInventoryInput` does NOT accept `isImported`.
   - Routes: `apps/web/app/api/imports/_validators.ts` uses `optionalDiffBoolean` to pass `isImported` on added + modified rows.
   - Modules: `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` exports `setRowImportStatus`; `toDraftPayload`/`toUpdatePatch` forward `isImported`.
   - Modules: `import-inventory-rows-section.tsx` renders the per-row `importStatus` select with `disabled={row.isImported}` (one-way transition visible).

3. **Inventory list eligibility filter:**
   - `apps/web/modules/inventory/data/queries.ts::loadInventoryPageData` calls `listInventory({ isImported: true })`. Pending rows cannot reach the dashboard list.

4. **Inventory record edit gates:**
   - `inventory-primary-fields-section.tsx` — `isReadOnly = !inventory.isImported`; every input receives `disabled={controlDisabled}`; banner renders when `isReadOnly`.
   - `inventory-record-panel.tsx` — footer omits `onDelete` when `isReadOnly`.
   - `update-inventory.ts` — refuses updates on rows where `current.isImported === false` via `INVENTORY_PENDING_IMPORT`.
   - `inventory-cut-logs-section.tsx` — renders the "Cut logs unlock once this row is marked Final" empty state when pending.

5. **Warehouse editable + required:**
   - Domain: `validateInventoryInput` pushes `WAREHOUSE_REQUIRED` whenever `warehouseId` is missing (regardless of location).
   - Data: `getInventoryDetailPageData` returns `warehouseOptions` alongside `locationOptions`.
   - Page loader: `apps/web/app/dashboard/inventory/[id]/page.tsx` forwards `warehouseOptions`.
   - UI: `inventory-primary-fields-section.tsx` renders warehouse as a `<select required>`.
   - Controller: `use-inventory-primary-section.ts` prefers `draft.warehouseId` → `importWarehouseId` → `warehouseId` for location-scope.

6. **Warehouse auto-link on import-diff added rows:**
   - `applyImportInventoryRowsDiff` falls back to `?? input.importWarehouseId` on both the location-present and null-location branches.

### Exit condition

All six sections check green. Any drift: fix, rebuild affected packages, re-run the applicable check, then proceed to Change 2.

**Expected: this is a 15-minute read-through.** If anything takes longer, it means a regression slipped in — that becomes the real work and the cut-log changes wait until the foundation is restored.

### Files (no expected edits)
None if the audit comes back green.

### Blast radius
Zero, unless drift is detected. Drift repair is a commit in its own right, separate from Change 2+.

---

## Change 2 — Cut-log schema: `price` + `isWaste` (Prisma migration)

**Intent.** Two columns, one migration. `price` stores the cost of a single cut at the moment it was saved (snapshot — frozen, not recomputed). `isWaste` is the tax-write-off flag.

### Schema edits — `packages/db/prisma/schema.prisma`

```prisma
model FlooringCutLog {
  // existing fields …
  price   Decimal? @db.Decimal(10, 2)
  isWaste Boolean  @default(false)
  // …
}
```

- `price` is nullable because a cut against an inventory row with `cost === null` can't snapshot a price. When `inventory.cost` and `inventory.stockCount` are both present and non-zero, the use case computes `price = (cost / stockCount) × cut` at save time and persists. If either is missing, `price` stays `null`.
- `isWaste` defaults `false`. Editable from the cut-logs grid.

### Migration

Handcraft `packages/db/prisma/migrations/YYYYMMDDHHMMSS_cut_log_price_and_waste/migration.sql`:

```sql
ALTER TABLE "flooring_cut_log"
  ADD COLUMN "price"   DECIMAL(10, 2),
  ADD COLUMN "isWaste" BOOLEAN NOT NULL DEFAULT false;
```

Apply via `npm run db:deploy --workspace @builders/db`. Rebuild `@builders/db`.

### Decision: `price` as stored column, not computed

Considered computing `price` on read (`pricePerUnit × cut` with `pricePerUnit` already computed in `normalizeInventoryRow`). Rejected because:

1. `inventory.cost` can change over the row's lifetime (user edits stock cost after a cut happened). A stored snapshot of `price` at cut time preserves the historical cost of each cut — correct for accounting / tax.
2. `cut` itself can change on a PENDING cut; on edit, the price snapshot re-captures from the (then-current) `inventory.cost / stockCount`. On FINAL, `price` is frozen.
3. Reporting downstream (future) will want cut-log cost totals without re-joining to inventory.

This matches the `before` / `after` stored-column pattern — they're also snapshots, frozen at save time.

### Files touched
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/YYYYMMDDHHMMSS_cut_log_price_and_waste/migration.sql` (new)

### Verification gate
- `npm run build --workspace @builders/db` clean.
- Generated client has `FlooringCutLog.price: Decimal | null` and `FlooringCutLog.isWaste: boolean`.
- Expected small TS fallout in downstream packages (domain/app) where `CutLogRow` / diff shapes don't yet include the new fields. Resolved by Change 4.

### Blast radius
Migration is additive — no data loss, no backfill needed (all existing rows get `price = null`, `isWaste = false`).

---

## Change 3 — Seed additional categories (carpet, pad, baseboard)

**Intent.** Three new categories covering the three distinct shapes the product needs to support:

| Category | Has coverage unit? | Used by material-item fulfillment? | Rounding rule |
|---|---|---|---|
| `vinyl-plank` (seeded) | Yes (sqft) | Yes | `ceil` (whole boxes) |
| `carpet` (new) | Yes (sqyd) | No — strict 1:1 stock count on allocation | `exact` (linear feet split) |
| `pad` (new) | Yes (sqyd) | Yes | `exact` (rolls split is OK, coverage matters for material items) |
| `baseboard` (new) | **No** (null coverageAvailableUnitId / itemCoverageUnitId) | No | n/a — strict 1:1 |

Rationale, drawn from the user-provided spec:

- **carpet** — stock unit linear feet, send unit square yards, coverage unit square yards. Product authoring does NOT require `coveragePerUnit` input (carpet rolls have a standard width factor). The inventory row's `availableCoverage` still computes as `availableBalance × coveragePerUnit` when `coveragePerUnit` is set by the product. When a material-item requests carpet, work-orders do NOT consult coverage — one cut log = one stock-unit assignment on the material item.
- **pad** — stock unit rolls, send unit square yards, coverage unit square yards. Product authoring DOES require `coveragePerUnit` input (one roll = X sqyd). Inventory row shows computed coverage. Material-item assignment (next sweep) reads coverage totals.
- **baseboard** — stock unit pieces, send unit pieces, coverage-available and item-coverage units set to `null`. `availableCoverage` on the inventory row renders blank. Material-item assignment is strict 1:1 on stock count.

### Files touched

#### `packages/db/src/seed/categories.ts`

```ts
export const SEEDED_CATEGORIES = [
  {
    slug: "vinyl-plank",
    name: "Vinyl Plank",
    stockUnitSlug: "boxes",
    sendUnitSlug: "square-feet",
    coverageAvailableUnitSlug: "square-feet",
    itemCoverageUnitSlug: "square-feet",
    serviceUnitSlug: null,
  },
  {
    slug: "carpet",
    name: "Carpet",
    stockUnitSlug: "linear-feet",
    sendUnitSlug: "square-yard",
    coverageAvailableUnitSlug: "square-yard",
    itemCoverageUnitSlug: "square-yard",
    serviceUnitSlug: null,
  },
  {
    slug: "pad",
    name: "Pad",
    stockUnitSlug: "rolls",
    sendUnitSlug: "square-yard",
    coverageAvailableUnitSlug: "square-yard",
    itemCoverageUnitSlug: "square-yard",
    serviceUnitSlug: null,
  },
  {
    slug: "baseboard",
    name: "Baseboard",
    stockUnitSlug: "pieces",
    sendUnitSlug: "pieces",
    coverageAvailableUnitSlug: null, // opts out of coverage computation
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
] as const
```

Audit the category-seed runner (`packages/db/src/seed/…` entry point — likely `seed.ts` or equivalent) to confirm it iterates `SEEDED_CATEGORIES` and upserts by `slug`. Additive change; no deletions of existing data.

#### `packages/db/src/seed/unit-of-measures.ts`

No changes — `pieces`, `linear-feet`, `square-yard`, `rolls`, `boxes`, `square-feet` are all already seeded. Verified: see file contents.

### Verification gate

- `npm run db:seed --workspace @builders/db` (or equivalent) runs clean and upserts four categories.
- In dev DB after re-seed: `SELECT slug, name FROM flooring_category ORDER BY slug` returns `baseboard, carpet, pad, vinyl-plank`.
- For each new category: `coverageAvailableUnit` / `itemCoverageUnit` reflect the table above (null for baseboard; square-yard for carpet + pad).

### Blast radius
Additive — new rows only. No existing category modified. No existing product impacted (existing products all linked to vinyl-plank).

---

## Change 4 — Cut-log domain surface: `price`, `isWaste`, computed `coverage`, extract to `cut-logs/` subfolder

**Intent.** Pull cut-log types + rules out of `packages/domain/src/flooring/inventory/` into their own `cut-logs/` subfolder (matching the REFERENCE.md shape). Extend `CutLogRow` with the two new stored fields + the computed `coverage` field.

### Domain package edits

#### New: `packages/domain/src/flooring/cut-logs/`

- `types.ts`:
  ```ts
  export const CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL"] as const
  export type CutLogStatus = typeof CUT_LOG_STATUS_VALUES[number]

  export type CutLogRow = {
    id: string
    inventoryId: string
    workOrderId: string | null
    workOrderItemId: string | null
    before: string
    cut: string
    after: string
    status: CutLogStatus
    isWaste: boolean
    price: string             // "" when null (inventory.cost or stockCount was null at save time)
    coverage: string          // computed: toFixedString(Number(cut) × coveragePerUnit); "" when coveragePerUnit null or category has no coverage unit
    notes: string
    createdAt: string
    updatedAt: string
  }
  ```
- `cut-log-rules.ts`:
  - `isCutLogStatus(value): value is CutLogStatus` — enum guard.
  - `assertBeforeCutAfterInvariant({ before, cut, after })` — throws typed issue if `before - cut !== after`. Decimal-safe arithmetic (stringify + compare).
  - `formatCutLogStatus(status): "Pending Cut" | "Final Cut"` — UI label helper.
- `errors.ts` — `CutLogDomainError`, `CutLogDomainErrorCode` union (`CUT_LOG_INVALID_STATUS`, `CUT_LOG_ARITHMETIC_MISMATCH`, `CUT_LOG_INVENTORY_NOT_IMPORTED`, `CUT_LOG_EXCEEDS_STARTING_BALANCE`). Migrate equivalents from `packages/domain/src/flooring/inventory/errors.ts` and re-export if any app code imports from the old location.
- `index.ts` — barrel.

#### Moved / modified: `packages/domain/src/flooring/inventory/types.ts`

- Delete the inline `CutLogStatus` + `CutLogRow` definitions (lines 1–15 today).
- Import `CutLogRow`, `CutLogStatus` from `../cut-logs` and re-export them for back-compat with existing consumers. (Consumers outside the package should switch to the new path over time; the re-export is courtesy.)

#### Modified: `packages/domain/src/index.ts`

Add `export * from "./flooring/cut-logs/index.js"` alongside the existing inventory re-export.

### DB package edits

#### `packages/db/src/flooring/inventory/shared.ts`

Cut-log select: add `price`, `isWaste` to the selected columns. Payload type auto-narrows.

#### `packages/db/src/flooring/inventory/read-repository.ts::normalizeCutLogRow`

```ts
export function normalizeCutLogRow(
  row: CutLogRowPayload,
  coveragePerUnit: number | null, // passed in from parent inventory's product.coveragePerUnit
  categoryHasCoverageUnit: boolean, // true when inventory.product.category.coverageAvailableUnitId is set
): InventoryCutLogRecord {
  const cutNum = toNumber(row.cut)
  const coverage =
    coveragePerUnit !== null && categoryHasCoverageUnit
      ? toFixedString(cutNum * coveragePerUnit)
      : ""
  return {
    id: row.id,
    inventoryId: row.inventoryId,
    workOrderId: row.workOrderId ?? null,
    workOrderItemId: row.workOrderItemId ?? null,
    before: row.before.toString(),
    cut: row.cut.toString(),
    after: row.after.toString(),
    status: row.status === "FINAL" ? "FINAL" : "PENDING",
    isWaste: row.isWaste,
    price: row.price === null ? "" : row.price.toString(),
    coverage,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
```

`normalizeInventoryDetail` threads `coveragePerUnit` + `categoryHasCoverageUnit` into the `.map(normalizeCutLogRow)` call (both already available via `payload.product.coveragePerUnit` and `payload.product.category.coverageAvailableUnitId != null`).

### Application package edits

- `packages/application/src/flooring/inventory/save-cut-logs.ts` (if it exists — else the equivalent use case for cut-log diff):
  - On create: compute `price = (cost / stockCount) × cut` when `inventory.cost != null && inventory.stockCount > 0`; else `price = null`.
  - On update: recompute `price` from (then-current) inventory `cost` and `stockCount` only when `status === "PENDING"` and either `cut` or the inventory `cost`/`stockCount` changed. For `status === "FINAL"`, leave `price` frozen — never recomputed on edit.
  - Pass `isWaste` through the diff straight from the client payload (no domain rule restricts it).

### Route-layer edits

- `apps/web/app/api/inventory/_validators.ts::validateCutLogsDiff` (or equivalent) — accept `isWaste: boolean` and `status: CutLogStatus` on added + modified cut-log entries. `price` is NOT a client-writable field (server computes).

### UI-layer edits

- `apps/web/modules/inventory/components/record/sections/inventory-cut-logs-section.tsx`:
  - Add grid columns: `coverage` (read-only computed), `price` (read-only computed), `isWaste` (editable checkbox), `status` (editable select — PENDING/FINAL).
  - `coverage` column renders blank when `row.coverage === ""` (either `coveragePerUnit` null or category has no coverage unit — baseboard).
- `apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts` (or equivalent controller):
  - `setRowIsWaste(index, boolean)` and `setRowStatus(index, CutLogStatus)` setters.
  - `toDraftPayload` / `toUpdatePatch` forward `isWaste` and `status`.

### Blast radius

- Adding `price`, `isWaste`, `coverage` to `CutLogRow` is additive — existing consumers that destructure (`{ id, before, cut, after, status }`) keep working. New consumers opt in.
- Moving `CutLogRow` / `CutLogStatus` to `cut-logs/` breaks imports from the inventory subpath only if they're direct file imports (bypassing the inventory barrel). Barrel re-export covers the common case.
- The computed `coverage` column on cut logs only means something when the category has a coverage unit. For baseboard it's always blank.

---

## Change 5 — Inventory computed-balance semantics: swap `availableBalance` ↔ `uncutBalance` to match spec

**Intent.** Correct a naming / semantics mismatch in the current normalizer so downstream UI + cut-log math align with the user's spec.

### Current code (to be swapped)

In `packages/db/src/flooring/inventory/read-repository.ts::normalizeInventoryRow`:

```ts
const uncut = stockCount - aggregate.totalCut                         // ← today's uncutBalance
const available = stockCount - (aggregate.awaitingCut + aggregate.totalCut) // ← today's availableBalance
```

### Target code (new semantics)

```ts
const available = stockCount - aggregate.totalCut                      // ← physically remaining in warehouse (final cuts only)
const uncut = available - aggregate.awaitingCut                        // ← truly free (not committed to any cut)
```

So:

| Field | Formula (new) | Meaning |
|---|---|---|
| `stockCount` (already stored) | — | Starting balance at import time |
| `availableBalance` | `stockCount − sum(final cuts)` | What's physically left on the shelf. Drops when a cut is FINALIZED, not when it's pending. |
| `awaitingCutBalance` | `sum(pending cuts)` | Stock committed to pending cuts |
| `uncutBalance` | `availableBalance − awaitingCutBalance` = `stockCount − sum(all cuts)` | Truly free stock (not promised to any cut, pending or final) |
| `totalCutBalance` | `sum(final cuts)` | Completed cut output |

### Invariant moves with the names

The domain rule "sum of all cuts ≤ stockCount" (what the user calls `uncutBalance ≥ 0`) stays — it's just now expressed as `uncut >= 0` instead of `available >= 0`. Update the cut-log save use case's precondition check + error:

- Error code rename: `CUT_LOG_EXCEEDS_STARTING_BALANCE` stays (same meaning, just the formula it checks against now).
- `canAddCutLog(inventory, proposedCutTotal)` in the cut-log-diff validator throws this error when `stockCount − (existingTotal + proposedCutTotal) < 0`.

### `availableCoverage` still keys off `availableBalance`

```ts
const availableCoverage = computeAvailableCoverage(available, coveragePerUnit)
```

i.e. the *physically remaining* stock converted to coverage unit. This matches the user's spec: "available coverage is the available balance converted to available coverage using the category specific computation function." So when a FINAL cut happens, `availableCoverage` drops. When a PENDING cut is added, `availableCoverage` stays the same (because the stock isn't physically gone yet).

### Files touched

- `packages/db/src/flooring/inventory/read-repository.ts` — the two-line semantic swap above.
- `packages/domain/src/flooring/inventory/inventory-rules.ts` — if any helper references the old semantics by name (e.g. `canAddCutLog`), update the formula.
- `packages/application/src/flooring/inventory/save-cut-logs.ts` (or equivalent) — the precondition check uses the uncut-based formula.
- UI tiles — if any card / label reads `availableBalance` or `uncutBalance` and labels it with a human phrase, re-check the phrasing still matches. (Labels likely stay — "Available" still means "physically on shelf"; "Uncut" still means "not committed." The math changes, the labels don't.)

### Verification gate

- Unit test: given `stockCount=10`, one PENDING cut of 2, one FINAL cut of 3:
  - `availableBalance` should be `10 − 3 = 7` (not today's `10 − 3 − 2 = 5`).
  - `awaitingCutBalance` should be `2`.
  - `uncutBalance` should be `7 − 2 = 5`.
  - `totalCutBalance` should be `3`.
  - `availableCoverage` (if `coveragePerUnit = 23.77`): `7 × 23.77 = 166.39`.
- Smoke in dev DB: create a vinyl-plank inventory row with `stockCount=5`, add one PENDING cut of 1 → `availableBalance` stays `5`, `uncutBalance` becomes `4`. Flip to FINAL → `availableBalance` becomes `4`, `uncutBalance` stays `4`.

### Blast radius

- **⚠️ This silently changes what any existing consumer of `availableBalance` / `uncutBalance` shows.** Audit before shipping:
  - `apps/web/modules/inventory/components/list/` — any column that reads these fields.
  - `apps/web/modules/inventory/components/record/` — any tile / summary.
  - Tests under `apps/web/tests/modules/inventory/` — fixture-based assertions need updates.
- User intent is the spec the sweep follows; current code was the anomaly. Confirm before merging that no dashboard is intentionally depending on the old `availableBalance` meaning.

**Decision needed before Change 5 lands:** confirm this swap matches intent. (I flagged the mismatch during pre-sweep audit; if the current code is what was actually wanted and the user spec is aspirational, we skip this change and just rename the fields.)

---

## Change 6 — Unit-conversion domain helpers + `CATEGORY_UNIT_RULES`

**Intent.** Ship the in-scope piece of REFERENCE.md's "Category-driven unit conversion" section. Cut-log-side coverage math (used in Change 4's normalizer) and inventory-side `availableCoverage` both call these helpers. Reverse-direction math (`computeStockRequiredForQuantity` — used by work-order material items) is a pure helper that lands here too, even though no consumer uses it yet; keeping it co-located avoids a future "where does this go?" decision.

### New file — `packages/domain/src/flooring/inventory/unit-conversion.ts`

```ts
export type CategoryUnitRule = {
  canSplit: boolean                            // decimals allowed when going quantity → stock?
  rounding: "up" | "down" | "nearest" | "exact"
  hasCoverageUnit: boolean                     // false for baseboard; true for vinyl-plank, carpet, pad
}

export const CATEGORY_UNIT_RULES: Record<string, CategoryUnitRule> = {
  "vinyl-plank": { canSplit: false, rounding: "up",    hasCoverageUnit: true  },
  "carpet":      { canSplit: true,  rounding: "exact", hasCoverageUnit: true  },
  "pad":         { canSplit: false, rounding: "up",    hasCoverageUnit: true  },
  "baseboard":   { canSplit: false, rounding: "exact", hasCoverageUnit: false },
}

export const DEFAULT_CATEGORY_UNIT_RULE: CategoryUnitRule = {
  canSplit: true,
  rounding: "exact",
  hasCoverageUnit: false,
}

export function getCategoryUnitRule(categorySlug: string | null | undefined): CategoryUnitRule {
  if (!categorySlug) return DEFAULT_CATEGORY_UNIT_RULE
  return CATEGORY_UNIT_RULES[categorySlug] ?? DEFAULT_CATEGORY_UNIT_RULE
}

// Stock → coverage. Pure multiplication; rounding happens on the inverse direction only.
export function computeCoverageAvailable(input: {
  stockAvailable: number            // the row's availableBalance (Change 5 semantics)
  coveragePerUnit: number | null
  categorySlug: string | null
}): number | null {
  if (input.coveragePerUnit === null) return null
  const rule = getCategoryUnitRule(input.categorySlug)
  if (!rule.hasCoverageUnit) return null
  return input.stockAvailable * input.coveragePerUnit
}

// Coverage → stock. Category-aware rounding. Unused this sweep (work-order next sweep).
// Landing here keeps category math in one file.
export function computeStockRequiredForQuantity(input: {
  quantityInSendUnit: number
  coveragePerUnit: number | null    // required for non-strict-1:1 categories
  categorySlug: string | null
}): number {
  const rule = getCategoryUnitRule(input.categorySlug)
  if (!rule.hasCoverageUnit || input.coveragePerUnit === null) {
    // Strict 1:1: stock unit === send unit (baseboard, or any category without coverage)
    return input.quantityInSendUnit
  }
  const raw = input.quantityInSendUnit / input.coveragePerUnit
  switch (rule.rounding) {
    case "up":      return Math.ceil(raw)
    case "down":    return Math.floor(raw)
    case "nearest": return Math.round(raw)
    case "exact":   return raw
  }
}

// Cut log's computed coverage (used by Change 4's normalizeCutLogRow).
export function computeCutCoverage(input: {
  cut: number
  coveragePerUnit: number | null
  categorySlug: string | null
}): number | null {
  if (input.coveragePerUnit === null) return null
  const rule = getCategoryUnitRule(input.categorySlug)
  if (!rule.hasCoverageUnit) return null
  return input.cut * input.coveragePerUnit
}
```

### Hookups

- `packages/db/src/flooring/inventory/read-repository.ts::normalizeInventoryRow` — replace the inlined `computeAvailableCoverage` helper (currently in the same file) with `computeCoverageAvailable` from the domain import. Thread `category.slug` through.
- `packages/db/src/flooring/inventory/read-repository.ts::normalizeCutLogRow` (Change 4 rewrite) — use `computeCutCoverage` from the domain import.
- Data-layer uses pure domain helpers — matches the existing carve-out in `packages/db/CLAUDE.md` (rule 1: "data-layer normalizers MAY import pure domain helpers").

### Schema / select additions

`inventoryRowSelect` in `packages/db/src/flooring/inventory/shared.ts` — add `slug: true` to the `product.category` nested select. Tiny additive change.

### Verification gate

- Unit test per category:
  - vinyl-plank, `stockAvailable=5`, `coveragePerUnit=23.77` → `computeCoverageAvailable = 118.85`.
  - carpet, `stockAvailable=10`, `coveragePerUnit=0.33` → `computeCoverageAvailable = 3.30`.
  - pad, `stockAvailable=2`, `coveragePerUnit=18` → `computeCoverageAvailable = 36`.
  - baseboard, `stockAvailable=100`, `coveragePerUnit=null` → `computeCoverageAvailable = null`.
  - baseboard, `stockAvailable=100`, `coveragePerUnit=2` → `computeCoverageAvailable = null` (rule opts out even if product author set coverage).
- `computeStockRequiredForQuantity` unit tests even though no caller wires it yet — proves the helper works for the next sweep. Vinyl-plank `quantity=100, cpu=23.77` → `5` (ceil of 4.21). Carpet `quantity=100, cpu=3` → `33.333…` (exact). Baseboard `quantity=100, cpu=anything` → `100` (1:1).

### Blast radius

- Moving `computeAvailableCoverage` from data-inline to domain is a refactor; behavior preserved for vinyl-plank (the only seeded category before this sweep). New categories get their coverage-unit opt-out at the same time.
- `computeStockRequiredForQuantity` is dead code until work-orders sweep — accepted cost for keeping category math in one place.

---

## Change 7 — Inventory record view: surface the five balance tiles

**Intent.** UI-only. Expose `availableBalance`, `uncutBalance`, `awaitingCutBalance`, `totalCutBalance`, `availableCoverage` on the inventory record's primary section so the user sees the computed state. Read-only tiles — these are derivatives, never direct inputs.

### Files touched

- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx`:
  - New right-pane / summary section "Balances":
    - `availableBalance` — "Available (stock unit)"
    - `uncutBalance` — "Uncut"
    - `awaitingCutBalance` — "Awaiting cut"
    - `totalCutBalance` — "Total cut"
    - `availableCoverage` — "Available coverage (send unit)". Hidden / dashed-out when empty string (baseboard).
  - Every tile uses `RecordStaticFieldValue` — never an `<input>`. Tooltips / labels reference the stock unit name from `inventory.stockUnit` so the user sees "Available (boxes)" for vinyl-plank, "Available (linear feet)" for carpet, etc.
- `apps/web/modules/inventory/components/list/inventory-table.tsx`:
  - Optional: `availableBalance` + `availableCoverage` columns (opt-in via columns manager). Current `uncutBalance` column — if it's already there — flips label to match the new semantics per Change 5.

### Verification gate
- Dev smoke: open an inventory record, confirm all five tiles render with the correct numbers for a row with mixed pending + final cuts. Baseboard row shows a dash (`—`) for coverage.

### Blast radius
- List columns are keyed on field name; renaming a column changes the user's saved prefs if they ever renamed. Contacts / warehouses pattern: drop silently.
- Adding tiles to the primary section expands the section's vertical footprint. Low risk.

---

## Change 8 — Cut-log edit gates + server-side price computation + validator additions

**Intent.** Close the loop on cut-log mutations from the inventory record view. Everything the cut-log grid accepts must be server-validated; the server stamps `price`; status transitions have a rule.

### Domain rules (per cut log, on save)

- `before − cut === after` (already in place in domain).
- `status ∈ {PENDING, FINAL}` (Change 4 helper).
- `isWaste ∈ {true, false}` (enum-trivial).
- `PENDING → FINAL` allowed freely. `FINAL → PENDING` **rejected** with `CUT_LOG_FINAL_REVERSAL_NOT_ALLOWED` at domain level (matches the `isImported` one-way-transition pattern from Sweep 2).
- `sum(cut) ≤ inventory.stockCount` post-diff (Change 5 rephrased: `uncutBalance ≥ 0`).
- `inventory.isImported === true` — Sweep-2 gate, already in place via `canAddCutLog`.

### Application / save use case

On save (create + update):

1. Lock `flooring_inventory` row `FOR UPDATE` (same lock scope Sweep-2's cut-log-save already uses).
2. For added / modified rows: compute `price = (inventory.cost / inventory.stockCount) × cut` when `inventory.cost != null && inventory.stockCount > 0`; else `null`.
3. For modified rows where existing `status === "FINAL"` and the patch leaves status `"FINAL"`: **do not recompute** `price` — the snapshot is frozen. Only update `cut`, `isWaste`, `notes`.
4. For modified rows where `status === "PENDING"` (either existing or via transition PENDING→FINAL): recompute `price` from (then-current) inventory cost/stockCount.
5. Reject `FINAL → PENDING` transitions with `CUT_LOG_FINAL_REVERSAL_NOT_ALLOWED`.

### Route-layer

`apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` (or equivalent) — no change beyond `_validators.ts` extension (Change 4).

### UI

- `inventory-cut-logs-section.tsx` (Change 4):
  - Status column: `<select>` PENDING/FINAL. When existing `status === "FINAL"`, the select is disabled (UI mirror of the server-side rule); tooltip explains.
  - isWaste checkbox: always editable — even for FINAL rows (waste flag can be corrected post-cut for tax reasons).
  - Cut input: editable for PENDING rows. For FINAL rows, cut stays editable only if the user also un-finals it, but since un-finaling is blocked, effectively cut is read-only on FINAL rows. Disable with tooltip.
  - Price column: read-only, rendered from server value.
  - Coverage column: read-only, rendered from server computation (Change 4).

### Verification gate

- Create a PENDING cut for 2 boxes on a vinyl-plank row with `cost=100, stockCount=10` → save → cut's `price` stored as `20.00` (= 10 × 2), coverage = `47.54` (= 23.77 × 2).
- Edit the cut to 3 boxes → `price` re-stamps to `30.00`, coverage re-computes to `71.31`.
- Flip status to FINAL → save clean. Inventory's `availableBalance` drops by 3 (Change 5 semantics — FINAL cuts deduct from available).
- Try to flip the FINAL cut back to PENDING → rejected with `CUT_LOG_FINAL_REVERSAL_NOT_ALLOWED`.
- Try to cut 11 boxes on the `stockCount=10` row → rejected with `CUT_LOG_EXCEEDS_STARTING_BALANCE`.
- Toggle `isWaste` on a FINAL cut → saves (waste flag always editable).

### Blast radius

- One-way FINAL transition may frustrate a user who clicks too fast; UI tooltip + disabled state prevent it at the interaction layer. Server backstop catches bypasses.
- Price snapshot diverges from live inventory cost over time. This is intentional (per Change 2 decision rationale) — reports referencing cut-log cost see the moment-in-time value.

---

## Change 9 — Imports record view: cut-log visibility is explicitly deferred

**Not doing this sweep.** Cut logs stay accessible only from the inventory record view. The imports record view renders its inventory-rows section (already done in Sweep 2) but does NOT show cut logs per row.

Rationale: cuts are an inventory concern, not an import concern. A pending import row has `isImported === false` and domain rule `canAddCutLog` already blocks cut creation against it. Showing empty cut-logs sections on pending rows in the imports view adds noise without enabling any action the user can't already do.

Deferred — revisit if/when users ask.

---

## Change 10 — Out of scope (next sweep)

- **Work-order material items ↔ cut logs wiring.** The whole "material item's computed `quantityAssigned` reads cut-log coverage; fulfillment status SHORTAGE/SUFFICIENT aggregates over items" flow. Requires work-orders main-section mutations landed first (different sweep).
- **Reverse-direction allocation helpers in use.** `computeStockRequiredForQuantity` lands in Change 6 but has no caller until work-orders.
- **Cut-log dashboards / cut-log standalone CRUD.** Cut logs stay child-only.
- **Cost-basis recalc on FINAL cuts when inventory.cost changes afterward.** By design — the snapshot freezes.
- **Additional categories beyond carpet/pad/baseboard.** Whatever business adds later follows the same 3-slot pattern (stock / send / coverageAvailable + optional item-coverage).
- **Service items using category.serviceUnitId.** Services aren't touched this sweep.
- **Migration of `FlooringProduct.coveragePerUnit` to be required for certain categories.** Today it's nullable; product authoring enforces at the UI level per category. DB-level required-if-category constraint is future work.

---

## Execution order

1. **Change 1** — verify Sweep-2 intact. Must come first. If green, proceed.
2. **Change 2** — schema migration for `price` + `isWaste`. Additive; safe to run before domain work.
3. **Change 3** — seed carpet/pad/baseboard. Independent, runs after migration is applied so seeds land into the new client.
4. **Change 6** — unit-conversion domain helpers + `CATEGORY_UNIT_RULES`. Lands before Change 4 because Change 4's cut-log coverage normalizer imports it.
5. **Change 4** — cut-log domain surface (types + normalizer + route validators + UI columns). Depends on 2 and 6.
6. **Change 5** — semantic swap of `availableBalance` ↔ `uncutBalance`. **Blocker question for user**: confirm this matches intent. Lands AFTER Change 4 so the cut-log fields are already threaded when downstream tiles shift meaning.
7. **Change 7** — surface balance tiles. Depends on 5.
8. **Change 8** — cut-log edit gates + server-side price computation. Depends on 2 + 4.
9. **Change 9** — no-op (deferred).
10. **Change 10** — no-op (scope fence).

Each change is a standalone commit.

---

## Verification gates (end-of-sweep)

- Per-package builds clean: `pnpm -F @builders/domain build && pnpm -F @builders/db build && pnpm -F @builders/application build && pnpm -F @builders/web typecheck`.
- `@builders/web` typecheck baseline: current 107 pre-existing errors (all in `work-orders`/`admin`/`shared/record-view`/`templates`, untouched by this sweep). Expect unchanged at 107 post-sweep.
- Regression greps:
  - `grep -rn "FlooringCutLog" packages/db apps/web | grep -v dist | grep -v node_modules` — confirm `price` and `isWaste` appear wherever `before`/`cut`/`after` appear.
  - `grep -rn "computeAvailableCoverage\|CATEGORY_UNIT_RULES" packages apps/web | grep -v dist` — helpers imported from `@builders/domain`, not re-implemented inline.
  - `grep -rn "vinyl-plank\|carpet\|pad\|baseboard" packages/db/src/seed` — all four categories present.
- Dev smoke:
  - **Seed:** re-run seed; 4 categories present, 3 of them seeded new (carpet, pad, baseboard).
  - **Product creation:** create a carpet product — `coveragePerUnit` input present. Create a baseboard product — `coveragePerUnit` input optional or hidden (category has no coverage unit).
  - **Inventory row (vinyl-plank):** starting stock 10, one PENDING cut of 2 → tiles show available 10, awaiting 2, uncut 8, total 0, coverage 237.7 (= 10 × 23.77). Flip cut to FINAL → available 8, awaiting 0, uncut 8, total 2, coverage 190.16 (= 8 × 23.77). Add another PENDING cut of 1 → available 8, awaiting 1, uncut 7, total 2, coverage 190.16. `price` per cut stamped from `inventory.cost / stockCount × cut`.
  - **Inventory row (carpet):** same flow, but stock unit = linear feet, coverage = sqyd. Coverage math reads `coveragePerUnit` from product.
  - **Inventory row (baseboard):** coverage column renders blank across all cuts; inventory primary tile shows "—" for Available coverage.
  - **Cut log waste flag:** toggle on a FINAL cut, save clean. Status column disabled on FINAL row. Un-final attempt rejected with domain error.
  - **Starting-balance invariant:** attempt a cut exceeding starting stock → rejected with `CUT_LOG_EXCEEDS_STARTING_BALANCE`.

---

## Open questions (blocking before final exec)

1. **Change 5 (availableBalance ↔ uncutBalance semantic swap).** User spec reads: `availableBalance = starting − final cuts`, `uncutBalance = available − pending cuts`. Current code: opposite. Confirm the user's spec is the target so I swap with confidence. If current code is what was actually wanted, we keep the math and just rename fields in the type.
2. **Change 8 (FINAL → PENDING transition).** Reject outright (current plan), or allow with a confirmation prompt? Reject is simpler and matches the one-way-transition precedent for `isImported`.
3. **Change 2 (price nullability).** Stored `Decimal?` — null when inventory cost/stockCount not both set. Alternative: require cost at inventory create so `price` is always non-null. Nullable is safer given the current data model allows cost-less inventory; confirm this is acceptable.

Answer these three and the sweep can execute top-to-bottom.
