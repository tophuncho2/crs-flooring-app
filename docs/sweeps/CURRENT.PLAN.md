# Current Plan — Sweep 3: Categories · Cut Logs · Inventory Computed Fields

Companion context: `REFERENCE.md` (four-module vision). Sweep 2 (`isImported` UX) is fully shipped.

**Purpose.** Establish categories as the canonical source of truth for unit conversion across the system. Secure cut-log mutations from the inventory record view. Wire the inventory row's computed balances (`availableBalance`, `uncutBalance`, `awaitingCutBalance`, `totalCutBalance`, `availableCoverage`) to the category-driven primitive.

**Scope.**
- **In scope:** Prisma + seed + Domain + Data + Application + API + modules + dashboard pages for **categories**, **cut-logs**, and **inventory**.
- **Out of scope:** work orders, work-order material items, fulfillment status aggregation. The primitive lands here so that the next sweep's work-orders module adds only a thin adapter — no primitive changes, no cross-module churn.

**Layer boundaries (must hold throughout).**

| Layer | Can import | Cannot import | Job |
|---|---|---|---|
| **Domain** | `zod` only (per package CLAUDE.md) | `@builders/db`, `@builders/application`, Prisma, Next.js, filesystem | Pure types, rules, pure math. No I/O, no throwing-to-the-client. |
| **Data** | `@builders/domain` pure helpers (per existing carve-out in `packages/db/CLAUDE.md`), Prisma | `@builders/application`, domain rules that throw (`validate*`, `assert*`, `is*Blocked`) | Persistence, selects, normalizers. No business rules. |
| **Application** | `@builders/domain`, `@builders/db` | Routes, Next.js, HTTP | Use cases. Own transactions. Orchestrate domain + data. Throw typed execution errors. |
| **Routes** | `@builders/application`, `@builders/db` (for reads), validators | Domain rules directly (call through application), Prisma | One route per use case. Policy + envelope + idempotency + telemetry + receipt. No business logic. |
| **Modules** (`apps/web/modules/`) | `@builders/domain` helpers, `@builders/db` (queries only), mutation HTTP helpers | Direct Prisma, application imports | Controllers + components + data wrappers. No domain / application logic inlined. |
| **Dashboard pages** (`apps/web/app/dashboard/`) | `modules/{module}/data/queries.ts` | Everything else | SSR loaders. Just render. |

Domain is **pure rules**. Application is **orchestration**. They do not mix — domain rules don't know about transactions; application use cases don't embed arithmetic invariants they can import. Violations of these boundaries are the first thing to grep for in verification.

---

## Pre-flight — Verify Sweep 2 still intact

Before any Sweep-3 work. Read-only verification; fix in place if drift detected, then proceed. This preserves the old Change 6 "keep import status editable as display metadata" decision as part of a broader audit.

### Checklist

1. **Import primary `status` stays editable (original Change 6):**
   - `apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx` — `<select>` with PENDING/FINAL.
   - `apps/web/modules/imports/components/list/imports-table.tsx` — status column renders via `formatImportStatus` + `getImportStatusFieldClass`.
   - `grep -rn "importEntry\.status\|row\.importStatus" apps packages | grep -v dist | grep -v node_modules` → zero hits outside the imports module itself.

2. **Per-row `isImported` pipeline intact:**
   - Domain: `InventoryRow.isImported: boolean`; `importTag`/`importStatus`/`importTransportType` absent; `isImportedReversal`, `assertImportedTransitionAllowed`, `IMPORTED_REVERSAL_NOT_ALLOWED` exported.
   - Domain diff: `InventoryDiffValidationIssue` includes `IMPORTED_REVERSAL_NOT_ALLOWED`.
   - Application: `update-inventory.ts` throws `IMPORTED_REVERSAL_NOT_ALLOWED` on true→false; `save-inventory-rows.ts::toDiffExisting` forwards `isImported`.
   - Data: `inventoryRowSelect` drops `importEntry.tag/status/transportType`; `InventoryListFilter.isImported?: boolean` supported; `importInventorySelect` includes `isImported`; `applyImportInventoryRowsDiff` persists `isImported` on create + update with `?? input.importWarehouseId` warehouse fallback.
   - Routes: `validateUpdateInventoryInput` does NOT accept `isImported`; `optionalDiffBoolean` passes `isImported` through imports diff.
   - Modules: `use-import-inventory-rows-section.ts` exports `setRowImportStatus`; `import-inventory-rows-section.tsx` renders per-row status select with `disabled={row.isImported}`.

3. **Inventory list eligibility filter:**
   - `apps/web/modules/inventory/data/queries.ts::loadInventoryPageData` calls `listInventory({ isImported: true })`.

4. **Inventory record edit gates:**
   - `inventory-primary-fields-section.tsx` — `isReadOnly = !inventory.isImported`; inputs disabled; banner when read-only.
   - `inventory-record-panel.tsx` — footer omits `onDelete` when read-only.
   - `update-inventory.ts` — refuses updates via `INVENTORY_PENDING_IMPORT` when `current.isImported === false`.
   - `inventory-cut-logs-section.tsx` — empty-state swap when pending.

5. **Warehouse required on inventory primary:**
   - Domain `validateInventoryInput` pushes `WAREHOUSE_REQUIRED` when `warehouseId` missing.
   - `getInventoryDetailPageData` returns `warehouseOptions`; page forwards it.
   - Primary section renders `<select required>` for warehouse.

6. **Warehouse auto-link on import-diff added rows:**
   - `applyImportInventoryRowsDiff` has `?? input.importWarehouseId` fallback on both branches.

### Exit condition
All six sections green. Any drift: fix → rebuild affected packages → re-check → proceed. Expected: 15 min read-through if nothing regressed.

---

## Open questions (blocking before Phase 3 — semantic decisions inside domain)

1. **`availableBalance` ↔ `uncutBalance` semantics.** User spec: `availableBalance = stockCount − finalCuts`, `uncutBalance = availableBalance − awaitingCut`. Current code: swapped. Confirm the user spec is the target so Phase 3 Domain lands with the correct math. (If current code is intent, we rename only — no math swap.)
2. **Cut-log `cost` / `freight` nullability.** Both stored `Decimal?`, null when the corresponding inventory source value is null or `stockCount == 0`. Alternative: require `cost` (and `freight`?) at inventory create. Default: nullable (safer given current data model — an inventory row may legitimately have unknown freight at import time).

Answer these and the sweep executes top to bottom.

## Cut-log editability model (decided)

Frozen on create; deletion is the only way to "edit" them:

- `cut`, `before`, `after`, `cost`, `freight` — all stored columns, all computed at create time, all immutable thereafter. To change a cut amount, delete the cut and create a new one.

Editable post-create:

- `status` — `"PENDING"` / `"FINAL"` toggle. **Freely flippable both directions** (no one-way rule). Flipping changes what counts toward `availableBalance` but does NOT recompute cost/freight.
- `isWaste` — free toggle.
- `notes` — free-form edit.
- `workOrderId` — reverse link, dropdown. Editable to relink a cut to a different work order (or unlink by clearing).
- `workOrderItemId` — cascaded dropdown. Disabled until `workOrderId` is chosen. Options filter to items on that work order whose `productId === inventory.productId`. Editable to relink a cut's material-item context.

This is what the validator enforces, what the use case honors, and what the UI reflects.

---

# Phase 1 — Prisma (schema + migration)

**Intent.** Three new columns on `FlooringCutLog`. One migration. Additive; no data loss, no backfill needed (user has disposable data).

## Cut Logs

### Schema edits — `packages/db/prisma/schema.prisma`

```prisma
model FlooringCutLog {
  // existing fields preserved …
  cost    Decimal? @db.Decimal(10, 2)   // per-cut cost snapshot, frozen on create
  freight Decimal? @db.Decimal(10, 2)   // per-cut freight snapshot, frozen on create
  isWaste Boolean  @default(false)      // tax-write-off flag, editable post-create
  // … existing relation + index declarations unchanged
}
```

- `cost` nullable — null when `inventory.cost == null` or `inventory.stockCount == 0` at create time.
- `freight` nullable — null when `inventory.freight == null` or `inventory.stockCount == 0` at create time.
- `isWaste` non-null, default `false`.

Both `cost` and `freight` are snapshots. Formula at create time: `cost = (inventory.cost / inventory.stockCount) × cut`, `freight = (inventory.freight / inventory.stockCount) × cut`. Once saved, they are frozen — the only path to change them is to delete the cut and re-create it (which re-snapshots against the then-current inventory row).

Downstream consumer (future, out of scope this sweep): work-order expense totals aggregate `SUM(cost) + SUM(freight)` across cut logs linked to a work order.

### Migration

Handcraft `packages/db/prisma/migrations/YYYYMMDDHHMMSS_cut_log_cost_freight_waste/migration.sql`:

```sql
ALTER TABLE "flooring_cut_log"
  ADD COLUMN "cost"    DECIMAL(10, 2),
  ADD COLUMN "freight" DECIMAL(10, 2),
  ADD COLUMN "isWaste" BOOLEAN NOT NULL DEFAULT false;
```

### Apply
- `npm run db:deploy --workspace @builders/db`
- `npm run build --workspace @builders/db`

### Verification gate
- `prisma migrate status` clean.
- Generated client has `FlooringCutLog.cost: Decimal | null`, `FlooringCutLog.freight: Decimal | null`, and `FlooringCutLog.isWaste: boolean`.
- Expected TS fallout in `@builders/domain` + `@builders/db` where `CutLogRow` / normalizer don't yet read the new fields — resolved in Phase 3 + Phase 4.

## Categories · Products · Inventory · Imports
No schema changes. Every required column already exists (`FlooringCategory` with 5 unit slots, `FlooringProduct.categoryId` required + `coveragePerUnit` nullable, `FlooringInventory.productId` required, `FlooringCutLog.status` existing).

## Work orders
Out of scope. No schema change.

---

# Phase 2 — Seed

**Intent.** Add three categories. No new units needed (all required units seeded: `boxes`, `linear-feet`, `square-feet`, `square-yard`, `rolls`, `pieces`).

## Categories

### File — `packages/db/src/seed/categories.ts`

Extend `SEEDED_CATEGORIES`:

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
    coverageAvailableUnitSlug: null,   // opts out of coverage computation
    itemCoverageUnitSlug: null,        // no product coveragePerUnit required at authoring
    serviceUnitSlug: null,
  },
] as const
```

Audit the seed runner (entry file in `packages/db/src/seed/`) to confirm it iterates this list and upserts by `slug`. Additive only.

## Unit of measures
No change — `packages/db/src/seed/unit-of-measures.ts` already covers every slug referenced above.

### Verification gate
- Re-run seed in dev DB.
- `SELECT slug, name FROM flooring_category ORDER BY slug` → `baseboard, carpet, pad, vinyl-plank`.
- For each new category, confirm the `coverageAvailableUnitId` / `itemCoverageUnitId` match the table (null for baseboard, set for carpet + pad).

---

# Phase 3 — Domain (pure rules, types, math)

**Rule:** No I/O. No `@builders/db`, no Prisma, no HTTP, no filesystem. Pure functions + types + typed errors. Use cases consume this, but it has no awareness of them.

## Categories — the primitive (new module)

This is the hub. All category-driven behavior lives here. Other modules consume it through thin adapters (below) — they never re-implement category math.

### New folder — `packages/domain/src/flooring/categories/`

- `types.ts`:
  ```ts
  export type CategoryRounding = "up" | "down" | "nearest" | "exact"

  export type CategoryUnitRule = {
    canSplit: boolean
    rounding: CategoryRounding
    hasCoverageUnit: boolean
  }

  // Minimal shape consumers pass in. Produced by db normalizers from the seeded category row.
  export type CategoryMeta = {
    id: string
    slug: string
    name: string
    stockUnitName: string | null         // e.g. "Boxes", "Linear Feet"
    stockUnitAbbrev: string | null       // e.g. "bx", "lf"
    sendUnitName: string | null
    sendUnitAbbrev: string | null
    coverageAvailableUnitName: string | null
    coverageAvailableUnitAbbrev: string | null
    itemCoverageUnitName: string | null
    itemCoverageUnitAbbrev: string | null
  }
  ```
- `rules.ts`:
  ```ts
  export const CATEGORY_UNIT_RULES: Record<string, CategoryUnitRule> = {
    "vinyl-plank": { canSplit: false, rounding: "up",    hasCoverageUnit: true  },
    "carpet":      { canSplit: true,  rounding: "exact", hasCoverageUnit: true  },
    "pad":         { canSplit: false, rounding: "up",    hasCoverageUnit: true  },
    "baseboard":   { canSplit: false, rounding: "exact", hasCoverageUnit: false },
  }

  export const DEFAULT_CATEGORY_UNIT_RULE: CategoryUnitRule = {
    canSplit: true, rounding: "exact", hasCoverageUnit: false,
  }

  export function getCategoryUnitRule(slug: string | null | undefined): CategoryUnitRule {
    if (!slug) return DEFAULT_CATEGORY_UNIT_RULE
    return CATEGORY_UNIT_RULES[slug] ?? DEFAULT_CATEGORY_UNIT_RULE
  }
  ```
- `conversions.ts`:
  ```ts
  // Stock → coverage. Pure multiplication. Caller interprets null as "no coverage applicable".
  export function convertStockToCoverage(input: {
    stockAmount: number
    coveragePerUnit: number | null
    categorySlug: string | null
  }): number | null {
    if (input.coveragePerUnit === null) return null
    const rule = getCategoryUnitRule(input.categorySlug)
    if (!rule.hasCoverageUnit) return null
    return input.stockAmount * input.coveragePerUnit
  }

  // Coverage → stock. Category-aware rounding. Used by work-orders next sweep;
  // lives here now so category math stays in one file forever.
  export function convertCoverageToStock(input: {
    coverageAmount: number
    coveragePerUnit: number | null
    categorySlug: string | null
  }): number {
    const rule = getCategoryUnitRule(input.categorySlug)
    if (!rule.hasCoverageUnit || input.coveragePerUnit === null) {
      return input.coverageAmount  // strict 1:1 (baseboard or unknown)
    }
    const raw = input.coverageAmount / input.coveragePerUnit
    switch (rule.rounding) {
      case "up":      return Math.ceil(raw)
      case "down":    return Math.floor(raw)
      case "nearest": return Math.round(raw)
      case "exact":   return raw
    }
  }
  ```
- `index.ts` — barrel. Re-exports from `types`, `rules`, `conversions`.

### Wiring
- `packages/domain/src/index.ts` — add `export * from "./flooring/categories/index.js"`.

### Tests
- Rule lookup: each known slug returns expected rule; unknown slug returns default.
- `convertStockToCoverage`: vinyl-plank, carpet, pad — positive math; baseboard — always null; any category with null `coveragePerUnit` — null.
- `convertCoverageToStock`: vinyl-plank ceils; carpet exact; baseboard 1:1.

## Cut Logs — extract from inventory into its own subfolder

Today `CutLogStatus` + `CutLogRow` live inline in `packages/domain/src/flooring/inventory/types.ts`. Pull them out. REFERENCE.md prescribes a `cut-logs/` subfolder; this sweep lands it.

### New folder — `packages/domain/src/flooring/cut-logs/`

- `types.ts`:
  ```ts
  export const CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL"] as const
  export type CutLogStatus = typeof CUT_LOG_STATUS_VALUES[number]

  // Frozen fields: set on create, immutable thereafter (user must delete + recreate to change):
  //   before, cut, after, cost, freight
  // Editable post-create:
  //   status, isWaste, notes, workOrderId, workOrderItemId
  export type CutLogRow = {
    id: string
    inventoryId: string
    workOrderId: string | null        // editable post-create
    workOrderItemId: string | null    // editable post-create (cascaded: requires workOrderId)
    before: string                    // frozen at create
    cut: string                       // frozen at create
    after: string                     // frozen at create (= before − cut)
    status: CutLogStatus              // editable post-create, flips freely both directions
    isWaste: boolean                  // editable post-create
    cost: string                      // frozen at create; "" when null in DB
    freight: string                   // frozen at create; "" when null in DB
    coverage: string                  // computed at normalize time; "" when no coverage applicable
    notes: string                     // editable post-create
    createdAt: string
    updatedAt: string
  }
  ```
- `cut-log-rules.ts`:
  ```ts
  export function isCutLogStatus(value: unknown): value is CutLogStatus { … }
  export function assertBeforeCutAfterInvariant(input: {
    before: string; cut: string; after: string
  }): void { /* throws CutLogDomainError on mismatch — only relevant on create */ }
  export function formatCutLogStatus(status: CutLogStatus): "Pending Cut" | "Final Cut" { … }
  ```

  No `isFinalReversal` helper — status flips freely both directions. The domain does not treat PENDING ↔ FINAL as a guarded transition.
- `category-math.ts` — the cut-logs spoke into the categories primitive:
  ```ts
  import { convertStockToCoverage } from "../categories/index.js"
  import type { CategoryMeta } from "../categories/index.js"

  export function computeCutCoverage(input: {
    cut: number                    // in stock unit
    coveragePerUnit: number | null
    category: Pick<CategoryMeta, "slug">
  }): number | null {
    return convertStockToCoverage({
      stockAmount: input.cut,
      coveragePerUnit: input.coveragePerUnit,
      categorySlug: input.category.slug,
    })
  }
  ```
- `errors.ts`:
  ```ts
  export type CutLogDomainErrorCode =
    | "CUT_LOG_INVALID_STATUS"
    | "CUT_LOG_ARITHMETIC_MISMATCH"
    | "CUT_LOG_INVENTORY_NOT_IMPORTED"
    | "CUT_LOG_EXCEEDS_STARTING_BALANCE"
    | "CUT_LOG_WORK_ORDER_ITEM_PRODUCT_MISMATCH"   // material item's product must match inventory row's product
    | "CUT_LOG_WORK_ORDER_ITEM_REQUIRES_WORK_ORDER" // workOrderItemId set without workOrderId
  export class CutLogDomainError extends Error { /* code, field, detail */ }
  ```

  No `CUT_LOG_FINAL_REVERSAL_NOT_ALLOWED` — flips are free. The two new codes guard the cascaded work-order/material-item link:

  - `CUT_LOG_WORK_ORDER_ITEM_REQUIRES_WORK_ORDER` — if `workOrderItemId` is set, `workOrderId` must also be set (validator catches it upstream, but domain backstops).
  - `CUT_LOG_WORK_ORDER_ITEM_PRODUCT_MISMATCH` — if a material item is picked, its work-order must scope the same product as the inventory row. Pure domain predicate: `materialItem.productId === inventory.productId`.
- `index.ts` — barrel.

### Inventory removal step
- `packages/domain/src/flooring/inventory/types.ts` — delete inline `CutLogStatus` + `CutLogRow` (lines 1–15). Import from `../cut-logs` and re-export for back-compat.

### Wiring
- `packages/domain/src/index.ts` — `export * from "./flooring/cut-logs/index.js"`.

## Inventory — adapter + semantic fix

Two concerns here: (1) add a thin adapter to the categories primitive for inventory-specific coverage, (2) resolve the `availableBalance` ↔ `uncutBalance` semantic question (pending decision on Open Question #1).

### `packages/domain/src/flooring/inventory/` changes

- **New:** `category-math.ts` — inventory spoke into the categories primitive:
  ```ts
  import { convertStockToCoverage } from "../categories/index.js"
  import type { CategoryMeta } from "../categories/index.js"

  export function computeInventoryAvailableCoverage(input: {
    availableBalance: number       // in stock unit (post-final-cuts)
    coveragePerUnit: number | null
    category: Pick<CategoryMeta, "slug">
  }): number | null {
    return convertStockToCoverage({
      stockAmount: input.availableBalance,
      coveragePerUnit: input.coveragePerUnit,
      categorySlug: input.category.slug,
    })
  }
  ```
- **Modified:** `types.ts` — `InventoryRow` already carries all five balance fields + category data. No shape change beyond cut-log extraction.
- **Modified:** `inventory-rules.ts` — update `canAddCutLog` / the cut-log-precondition helper (if it exists) to use the target semantics: the post-diff `uncutBalance` (= `stockCount − totalCuts`) must be `≥ 0`. Throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` from the cut-logs domain. **Pending Open Question #1:** if the current `availableBalance`/`uncutBalance` meaning is what was actually wanted, this rule stays; only the field names shift.
- **Modified:** `errors.ts` — no new codes (the invariant code lives in `cut-logs/errors.ts`).

### Work Orders
**Out of scope domain changes.** Do NOT add `packages/domain/src/flooring/work-orders/category-math.ts` this sweep. The primitive is in place and ready; next sweep's WO work adds its own spoke in ~30 lines.

### Verification gate
- `npm run build --workspace @builders/domain` clean.
- Regression greps inside `packages/domain/src/`:
  - `grep -rn "CATEGORY_UNIT_RULES" packages/domain/src | grep -v "/categories/"` → zero. (Primitive lives in one place.)
  - `grep -rn "convertStockToCoverage\|convertCoverageToStock" packages/domain/src | grep -v "/categories/" | grep -v "category-math.ts"` → zero. (Only spokes import.)
- Unit tests per file: rules, conversions, cut-log arithmetic invariant, reversal predicate.

---

# Phase 4 — Data (read / write repositories, normalizers)

**Rule:** persistence only. Normalizers may import pure domain helpers (carve-out); no domain rules that throw.

## Categories

### `packages/db/src/flooring/categories/` (already exists)

- `read-repository.ts` (existing) — verify it exposes:
  - `listCategories()` — full list, includes all five unit relations.
  - `getCategoryBySlug(slug)` — single lookup.
- **Add** `shared.ts` if not present — a `categorySelect` that loads all five unit relations inline. Consumers in inventory's normalizer need to hydrate `CategoryMeta` (names + abbreviations) without N+1.
- **Add** `index.ts` barrel if missing.

No write repository — categories are seed-only.

### Wiring
- `packages/db/src/index.ts` — confirm `categories` exports are present.

## Cut Logs

**No standalone cut-logs data module.** Cut-log reads flow through inventory's normalizer; writes flow through parent atomic-diff primitives. Phase 7 confirms this decision.

- `packages/db/src/flooring/inventory/shared.ts`:
  - Cut-log select payload: add `price: true` and `isWaste: true`.
  - Inventory select: add `product.category.slug` (needed by the category-math adapter). Today it includes `product.category.name`; extend with `slug` and the five unit relations' `name` + `abbreviation`.
- `packages/db/src/flooring/inventory/read-repository.ts`:
  - `normalizeCutLogRow(row, coveragePerUnit, category)` — import `computeCutCoverage` from `@builders/domain`'s `cut-logs/category-math.ts`. Emits `price` (`""` when null) and `isWaste`.
  - `normalizeInventoryRow(payload, aggregate)` — replace the inline `computeAvailableCoverage` helper with `computeInventoryAvailableCoverage` from `@builders/domain`'s `inventory/category-math.ts`. Thread `category.slug` + `coveragePerUnit`.
  - **Semantic fix (pending Open Question #1):** if user confirms spec, update the aggregate math:
    ```ts
    const available = stockCount - aggregate.totalCut            // was: stockCount - total - awaiting
    const uncut     = available - aggregate.awaitingCut          // was: stockCount - total
    ```
  - Detail variant (`normalizeInventoryDetail`) threads the same args into its cut-log mapping.

## Inventory (writes)

- `packages/db/src/flooring/inventory/write-repository.ts` — no changes for cut-log writes directly (the atomic-diff primitive lives alongside):
- `packages/db/src/flooring/inventory/` — confirm or add `applyInventoryCutLogsDiff(tx, input) → { logs, tempIdMap }` per REFERENCE.md. This primitive:
  - CREATE: persists `before`, `cut`, `after`, `status`, `notes`, `isWaste`, **`price` from input** (application layer has already computed it).
  - UPDATE: forwards each patched field including `price` recompute results from the application layer.
  - DELETE: removes cut logs by id.
  - No business logic — takes what the caller passes.

## Imports

- `packages/db/src/flooring/imports/` — no changes. Imports don't interact with cut logs.

## Work Orders

- `packages/db/src/flooring/work-orders/` — out of scope. No changes.

### Verification gate
- `npm run build --workspace @builders/db` clean.
- `grep -rn "computeAvailableCoverage\|availableBalance \* coveragePerUnit" packages/db/src` → zero (no inline coverage math).
- Unit / integration test on normalizer: vinyl-plank row `stockCount=10` + PENDING cut 2 + FINAL cut 3 → `availableBalance = 7`, `uncutBalance = 5`, `awaitingCutBalance = 2`, `totalCutBalance = 3`, `availableCoverage = 7 × coveragePerUnit`.
- Baseboard row with any coverage math → `availableCoverage = ""` (normalizer emits empty string when primitive returns null).

---

# Phase 5 — Application (use cases, orchestration)

**Rule:** use cases own transactions; import domain rules; call data layer; throw typed execution errors. No business rules inlined (they belong in domain). No HTTP awareness.

## Categories
**No use cases.** Categories are seed-only, read-only. No CRUD.

## Cut Logs
**No standalone use cases** (matches REFERENCE.md). Cut-log mutations flow through the parent's save use case (`inventory/save-cut-logs` this sweep; `work-orders/save-material-items` next sweep).

## Inventory

### `packages/application/src/flooring/inventory/save-cut-logs.ts` — `saveInventoryCutLogsUseCase`

The central use case this sweep. Orchestrates cut-log CRUD against an inventory row from the inventory record view.

**Lock scope.** Inventory row `FOR UPDATE` + specific cut-log rows touched by modifications/deletions. No work-order lock, no material-item lock.

**Flow:**
1. Open `withDatabaseTransaction`.
2. `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE` — parent lock.
3. If diff contains modified / deleted cut-log rows: `SELECT id FROM flooring_cut_log WHERE id = ANY($1) ORDER BY id FOR UPDATE`.
4. Load current `inventory` row including `cost`, `freight`, `stockCount`, `isImported`, `product.id`, `product.coveragePerUnit`, `product.category.slug`. Use db reader.
5. **Domain checks — added cuts:**
   - `canAddCutLog(inventory)` → throws `CUT_LOG_INVENTORY_NOT_IMPORTED` if `inventory.isImported === false`.
   - `isCutLogStatus(status)` — enum guard.
   - `assertBeforeCutAfterInvariant({ before, cut, after })` — arithmetic invariant. `before` is taken as the inventory's `stockCount − sum(existing final cuts against other rows before this one)` snapshot OR simply the row's current `availableBalance`-equivalent from the aggregate — decided in implementation. `after = before − cut`.
   - Work-order / material-item link checks (see below).
6. **Domain checks — modified cuts (restricted):**
   - Allowed fields on a modify patch: `status`, `isWaste`, `notes`, `workOrderId`, `workOrderItemId`. **Any attempt to modify `cut`, `before`, `after`, `cost`, `freight` is rejected by the validator before reaching the use case.** The use case backstops by ignoring those fields if they somehow reach it (trusted-internal contract; defensive).
   - `isCutLogStatus(status)` on status changes.
   - Work-order / material-item link checks if link fields are in the patch.
7. **Domain checks — post-diff aggregate:**
   - Compute fresh `SUM(cut)` across all this inventory's cut logs after applying the diff.
   - Throw `CUT_LOG_EXCEEDS_STARTING_BALANCE` if `stockCount − newSumOfCuts < 0`.
8. **Work-order / material-item link checks (added + modified):**
   - If `workOrderItemId != null && workOrderId == null` → `CUT_LOG_WORK_ORDER_ITEM_REQUIRES_WORK_ORDER`.
   - If `workOrderItemId != null`: fetch the material item, verify `materialItem.workOrderId === workOrderId` AND `materialItem.productId === inventory.product.id`. On mismatch → `CUT_LOG_WORK_ORDER_ITEM_PRODUCT_MISMATCH`.
   - `workOrderId` alone with no `workOrderItemId` is valid (user linked the work order without committing to a specific material item).
9. **Server-stamped cost + freight (added cuts only — frozen at create):**
   - `costPerUnit = (inventory.cost != null && inventory.stockCount > 0) ? inventory.cost / inventory.stockCount : null`
   - `freightPerUnit = (inventory.freight != null && inventory.stockCount > 0) ? inventory.freight / inventory.stockCount : null`
   - `cutCost = costPerUnit != null ? costPerUnit × cut : null` → persisted to `FlooringCutLog.cost`.
   - `cutFreight = freightPerUnit != null ? freightPerUnit × cut : null` → persisted to `FlooringCutLog.freight`.
   - `before = stockCount − sum(existing cut logs' cut)` (snapshot at moment of create) → persisted.
   - `after = before − cut` → persisted.
   - These are **frozen**. Modifying a cut never recomputes them (cut amount itself is immutable).
10. **Link-only modify path:** for modified rows, the patch contains only the editable subset (`status`, `isWaste`, `notes`, `workOrderId`, `workOrderItemId`). No cost / freight / before / after / cut re-computation.
11. Call `applyInventoryCutLogsDiff(tx, { inventoryId, diff })`.
12. Re-read full detail, return `{ inventory: InventoryDetailRecord, tempIdMap }`.

### `packages/application/src/flooring/inventory/update-inventory.ts`
Unchanged by Sweep 3 directly; the Sweep-2 `IMPORTED_REVERSAL_NOT_ALLOWED` + `INVENTORY_PENDING_IMPORT` guards stay.

### `packages/application/src/flooring/inventory/errors.ts`
Add execution-error codes if not present:
- `CUT_LOG_INVENTORY_NOT_IMPORTED`
- `CUT_LOG_EXCEEDS_STARTING_BALANCE`
- `CUT_LOG_ARITHMETIC_MISMATCH`
- `CUT_LOG_WORK_ORDER_ITEM_REQUIRES_WORK_ORDER`
- `CUT_LOG_WORK_ORDER_ITEM_PRODUCT_MISMATCH`

(Map them to HTTP 400 / domain-code fields in the route layer.)

## Imports

### `packages/application/src/flooring/imports/save-inventory-rows.ts`
Unchanged — imports don't touch cut logs.

## Work Orders
Out of scope.

### Verification gate
- `npm run build --workspace @builders/application` clean.
- Integration test: create PENDING cut of 2 against `cost=100, freight=20, stockCount=10` row → cut persists with `cost=20.00`, `freight=4.00`. Edit inventory row's `cost` to `200` — existing cut's `cost` stays `20.00` (frozen).
- Integration test: flip cut PENDING ↔ FINAL multiple times → all save clean; cost/freight never recompute.
- Integration test: attempt to patch `cut` / `before` / `after` / `cost` / `freight` on an existing cut → validator returns `400 INVALID_BODY`.
- Integration test: attempt cut that drives `stockCount − newSum < 0` → rejected with `CUT_LOG_EXCEEDS_STARTING_BALANCE`.
- Integration test: cut against `inventory.isImported === false` → rejected with `CUT_LOG_INVENTORY_NOT_IMPORTED`.
- Integration test: set `workOrderItemId` without `workOrderId` → rejected with `CUT_LOG_WORK_ORDER_ITEM_REQUIRES_WORK_ORDER`.
- Integration test: set `workOrderItemId` pointing to a material item whose `productId` differs from the inventory's product → rejected with `CUT_LOG_WORK_ORDER_ITEM_PRODUCT_MISMATCH`.

---

# Phase 6 — API Routes

**Rule:** each route file calls ONE use case. Full mutation lifecycle: `applyRoutePolicy` → `parseMutationEnvelope(body, validator, { requireExpectedUpdatedAt: true })` → snapshot via `getXById` + `assertExpectedUpdatedAt` (PATCH) → `enforceMutationReceipt` → `withMutationTelemetry(() => useCase(...))` → `finalizeMutationReceipt` → `routeJson`. Row locking happens inside the use case (application layer owns transactions).

## Inventory — cut-logs section route

### `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts`
- PATCH only.
- Tool slug: `warehouse` (per existing convention; dedicated slug deferred per REFERENCE.md).
- Rate scope: `inventory.cut-logs.section.replace`.
- Body: atomic diff envelope (`added`, `modified`, `deleted`) shaped by `validateCutLogsDiff`.
- Calls `saveInventoryCutLogsUseCase`.
- Response: `{ inventory: InventoryDetailRecord, tempIdMap }` so client reconciles temp ids → real ids in place.

### `apps/web/app/api/inventory/_validators.ts::validateCutLogsDiff`
Shape is asymmetric by intent — added rows carry the full create payload, modified rows carry only the editable subset.

- **Added rows** accept:
  - `inventoryId` (required, matches the route's `[id]` param)
  - `cut` (required — the only quantity the client sends)
  - `status` (optional, default `"PENDING"`)
  - `isWaste` (optional, default `false`)
  - `notes` (optional)
  - `workOrderId` (optional, nullable)
  - `workOrderItemId` (optional, nullable, requires `workOrderId` to be set)
  - **Server computes** `before`, `after`, `cost`, `freight`. Not client-writable.
- **Modified rows** accept **only** the editable-post-create subset:
  - `id` (required)
  - `expectedUpdatedAt` (required — per-row concurrency check)
  - `status` (optional)
  - `isWaste` (optional)
  - `notes` (optional)
  - `workOrderId` (optional, nullable — explicit null means "unlink")
  - `workOrderItemId` (optional, nullable — requires `workOrderId` to be set when non-null)
  - **Rejected** at validator: `cut`, `before`, `after`, `cost`, `freight`. Any of these in a modify patch → `400 INVALID_BODY`. The message should point the user to delete + recreate for cut-amount changes.
- **Deleted rows:** `id`, `expectedUpdatedAt`.

## Inventory — primary-section route
No change. Primary PATCH doesn't touch cut logs.

## Imports — inventory-rows section route
No change. Imports never carry cut-log diffs.

## Categories — no routes
No routes. Seed-only, read-only.

## Cut Logs — no top-level routes
Confirmed. All cut-log mutations flow through `/api/inventory/[id]/cut-logs/section/route.ts` this sweep; next sweep adds `/api/work-orders/[id]/items/section/route.ts` as a second entry point.

## Work Orders — out of scope

### Verification gate
- `grep -rn "cut-logs/section" apps/web/app/api` → only `inventory/[id]/cut-logs/section/route.ts`.
- `grep -rn "\"price\"" apps/web/app/api/inventory/_validators.ts` → zero (server-only field).
- Manual: idempotency replay — same `idempotencyKey` on the section PATCH returns the stored receipt without re-running the use case.
- Route integration: full lifecycle (policy, envelope, receipt, telemetry) verified via an end-to-end save.

---

# Phase 7 — Module directory confirmation (`apps/web/modules/`)

**Rule:** `modules/{module}/` contains only `components/{list,record}/`, `controllers/`, `data/{mutations.ts, queries.ts}`. No inline domain / application logic, no direct Prisma.

## Inventory

### Expected structure (confirm + fill gaps)

```
apps/web/modules/inventory/
├── components/
│   ├── list/
│   │   ├── inventory-client.tsx
│   │   └── inventory-table.tsx
│   └── record/
│       ├── inventory-detail-client.tsx
│       ├── inventory-record-panel.tsx
│       └── sections/
│           ├── inventory-primary-fields-section.tsx
│           └── inventory-cut-logs-section.tsx    ← updated this sweep
├── controllers/
│   ├── use-inventory-primary-section.ts
│   └── use-inventory-cut-logs-section.ts         ← updated this sweep
└── data/
    ├── mutations.ts
    └── queries.ts
```

### Cut-logs section updates — `components/record/sections/inventory-cut-logs-section.tsx`

Grid columns (left to right):
- `cut` — input on **added** rows only; on persisted rows renders as read-only text. To change, user deletes + re-creates.
- `before` — read-only on all rows (server-computed on create, frozen).
- `after` — read-only on all rows (server-computed on create, frozen).
- `status` — editable `<select>` PENDING/FINAL on **all** rows (including persisted ones). Freely flippable.
- `isWaste` — editable checkbox on all rows.
- `cost` — read-only on all rows. Renders `row.cost` ("" → blank/dash).
- `freight` — read-only on all rows. Renders `row.freight` ("" → blank/dash).
- `coverage` — read-only on all rows. Renders `row.coverage` ("" → blank/dash when category has no coverage unit or product has no `coveragePerUnit`).
- `workOrder` — editable `<select>` on all rows. Options: list of work orders. Nullable (empty option means "unlinked").
- `workOrderItem` — editable `<select>` on all rows. **Disabled** until `workOrderId` is set on this row. Options: material items on the selected work order filtered to `item.productId === inventory.productId`. Empty state: "No material items on this work order use this product." Nullable.
- `notes` — editable text input on all rows.
- Delete action — "trash" icon per row. The only way to remove a cut (and the only way to change `cut`/`before`/`after`/`cost`/`freight` indirectly).

Empty state + gate:
- When `!isImported`: "Cut logs unlock once this row is marked Final on the imports record view." (Sweep-2 behavior preserved.)

### Controller updates — `controllers/use-inventory-cut-logs-section.ts`

Setters (all operate on the draft, then the section's dirty-diff generator shapes payloads on submit):
- `setRowCut(index, string)` — active only on unsaved (added) rows. Ignored for persisted rows.
- `setRowStatus(index, CutLogStatus)` — all rows.
- `setRowIsWaste(index, boolean)` — all rows.
- `setRowNotes(index, string)` — all rows.
- `setRowWorkOrderId(index, string | null)` — all rows. Setting to null clears `workOrderItemId` too (since the cascaded select is invalid without a work order).
- `setRowWorkOrderItemId(index, string | null)` — all rows. Validator + UI ensure `workOrderId` is present first.

Diff payload generators:
- `toDraftPayload(row)` → `{ inventoryId, cut, status, isWaste, notes, workOrderId, workOrderItemId }`. **No** `before`/`after`/`cost`/`freight` — server computes.
- `toUpdatePatch(row, original)` → diff of changed fields only from the editable subset: `{ status?, isWaste?, notes?, workOrderId?, workOrderItemId? }`. Plus `id` + `expectedUpdatedAt`. Never emits `cut`/`before`/`after`/`cost`/`freight` — the controller treats those as immutable on persisted rows.

Loader dependencies — the section needs two new option bundles from the page loader:
- `workOrderOptions`: list of `{ id, number, label }` for all work orders scoped to the inventory row's warehouse (reuse `listWorkOrders({ warehouseId })` or an existing helper).
- `materialItemOptionsByWorkOrder`: either pre-fetched as `Record<workOrderId, MaterialItem[]>`, or loaded on-demand when a work-order is picked. Pre-fetch is simpler for the first pass given WO counts are typically bounded per warehouse.

### Primary section updates — `components/record/sections/inventory-primary-fields-section.tsx`
New read-only "Balances" tile group in the right pane:
- `availableBalance` — "Available ({stockUnit.name})"
- `uncutBalance` — "Uncut"
- `awaitingCutBalance` — "Awaiting cut"
- `totalCutBalance` — "Total cut"
- `availableCoverage` — "Available coverage ({coverageAvailableUnit.name})". Hidden / dashed when empty (baseboard, or product with null `coveragePerUnit`).

All tiles use `RecordStaticFieldValue`. Labels pull the unit name from the inventory record's category fields.

### List updates — `components/list/inventory-table.tsx`
Optional: surface `availableCoverage` as an opt-in column (columns manager). Existing `uncutBalance` / `availableBalance` columns (if present) reflect Change-5 semantics post-fix.

### `data/mutations.ts`
Add `updateInventoryCutLogsRequest(id, diff)` if missing — thin POST wrapper around `/api/inventory/[id]/cut-logs/section`, plumbed through `withMutationMeta`.

### `data/queries.ts`
No changes. Already wraps `@builders/db` readers.

## Categories
**No module.** Categories are read-only primitives. If a UI picker consumes them (product create/edit), the picker's data source is `@builders/db::listCategories` via that module's `data/queries.ts`. No dedicated `apps/web/modules/categories/` required.

_Existing:_ `apps/web/modules/categories/` exists with `types.ts` + list client/table. Audit: confirm it's read-only (list view + lookup helpers) with no write surface. If it contains mutation code, flag for removal.

## Cut Logs
**No dedicated module — confirmed long-term.**

Rationale:
- Cut logs are always a CHILD section of a parent (inventory this sweep; work-order material items next sweep).
- A dedicated `apps/web/modules/cut-logs/` would duplicate the render logic that already has to live inside each parent's section component.
- REFERENCE.md F.3 keeps the door open for a thin `cut-logs/` folder containing a shared cut-log-row render helper — reconsider only if both inventory and work-orders need identical row rendering and duplication crosses a 2-file threshold. Until then, the section component in the parent module (`apps/web/modules/inventory/components/record/sections/inventory-cut-logs-section.tsx`) is the single home.

Decision: **do not create `apps/web/modules/cut-logs/` this sweep.** Revisit when work-orders ships.

## Imports
No module changes.

## Work Orders
Out of scope.

### Verification gate
- `find apps/web/modules/inventory -type f | sort` matches the four-folder layout.
- `grep -rn "@/modules/inventory/(domain|application|record)" apps/web` → zero.
- `ls apps/web/modules/cut-logs 2>&1` → no such file or directory.
- Dev smoke on the cut-logs grid: all new columns render; FINAL-row cut input disabled; isWaste checkbox toggles; save round-trips through the diff envelope.

---

# Phase 8 — Dashboard pages

**Rule:** pages import from `modules/{module}/data/queries.ts`. SSR loaders only. No business logic, no inline DB calls beyond the query wrapper.

## Inventory — detail page

### `apps/web/app/dashboard/inventory/[id]/page.tsx`
Confirm the loader:
- Calls `getInventoryDetailPageData(id)` from `@/modules/inventory/data/queries.ts`.
- Forwards every option bundle the detail client needs: `warehouseOptions`, `locationOptions`, `categoryOptions` (if the UI surfaces category elsewhere — this sweep doesn't, but the hook must not regress).
- Returns props to `<InventoryDetailClient>` unchanged.

No edits expected unless the page currently inlines a call that should move into `queries.ts`.

### `apps/web/app/dashboard/inventory/page.tsx`
Confirm the list loader calls `loadInventoryPageData()` which calls `listInventory({ isImported: true })`. Should be a no-op after Sweep 2.

### `apps/web/app/dashboard/inventory/new/page.tsx`
No changes — standalone create path is out of scope per Sweep-2 resolution.

## Imports — no changes

## Categories
No dashboard pages this sweep.

## Cut Logs
No dashboard pages — confirmed (cuts appear only inside parent record views).

## Work Orders
Out of scope.

### Verification gate
- `grep -rn "@/modules/inventory/(domain|application|record)" apps/web/app/dashboard` → zero.
- Dev smoke: `/dashboard/inventory` list shows FINAL rows only; `/dashboard/inventory/[id]` detail renders with balance tiles + cut-logs grid with new columns.

---

# Phase 9 — Verification (end of sweep)

## Per-package builds
```
pnpm -F @builders/domain build
pnpm -F @builders/db build
pnpm -F @builders/application build
pnpm -F @builders/web typecheck
```
All clean. `@builders/web` typecheck baseline: 107 pre-existing (all in `work-orders`/`admin`/`shared/record-view`/`templates`, untouched). Expect unchanged at 107.

## Regression greps (source only; exclude `dist`, `.next`, `node_modules`)
- `grep -rn "CATEGORY_UNIT_RULES" packages/domain/src | grep -v "/categories/"` → zero (primitive in one place).
- `grep -rn "convertStockToCoverage\|convertCoverageToStock" packages/domain/src | grep -v "/categories/" | grep -v "category-math.ts"` → zero.
- `grep -rn "availableBalance \* coveragePerUnit\|computeAvailableCoverage" packages/db/src` → zero (math lives in domain).
- `grep -rn "\"price\"\s*:" apps/web/app/api/inventory/_validators.ts` → zero (server-computed).
- `grep -rn "@/modules/(inventory|imports)/(domain|application|record)" apps/web` → zero.

## Dev smoke — end-to-end flows

### Seed
1. Re-run seed against fresh dev DB.
2. Confirm 4 categories (`baseboard`, `carpet`, `pad`, `vinyl-plank`) with expected unit slots.

### Inventory + cut logs — vinyl-plank
1. Create import with warehouse W; add an inventory row for vinyl-plank product, `stockCount = 10`, `cost = 100`, `freight = 20`; leave PENDING.
2. From inventory record view: grid is locked (Sweep-2 gate — confirms pre-flight).
3. Back to imports: flip the row to FINAL, save.
4. Reload inventory record: balance tiles show `availableBalance = 10`, `uncutBalance = 10`, `awaitingCutBalance = 0`, `totalCutBalance = 0`, `availableCoverage = 237.70` (= 10 × 23.77).
5. Add PENDING cut of 2: `availableBalance = 10`, `uncutBalance = 8`, `awaitingCutBalance = 2`, `totalCutBalance = 0`, `availableCoverage = 237.70`. Cut row persists with `cut = 2`, `before = 10`, `after = 8`, `cost = 20.00` (= 100/10 × 2), `freight = 4.00` (= 20/10 × 2), `coverage = 47.54`.
6. Flip cut to FINAL: `availableBalance = 8`, `uncutBalance = 8`, `awaitingCutBalance = 0`, `totalCutBalance = 2`, `availableCoverage = 190.16`. `cost` / `freight` / `before` / `after` / `cut` all unchanged on the cut row (frozen).
7. Flip FINAL cut back to PENDING → saves clean (no reject). Inventory balances recompute: `availableBalance = 10`, `awaitingCutBalance = 2`, `totalCutBalance = 0`. Cut row's `cost` / `freight` still frozen at original values.
8. Attempt to edit `cut` on the persisted row via UI → input is read-only. Attempt via direct API patch with `cut` in body → validator rejects with `400 INVALID_BODY` citing immutable fields.
9. Delete the cut, re-add as `cut = 3` → new row with `cost = 30.00`, `freight = 6.00`, `before = 10`, `after = 7`.
10. Attempt to add a cut of 11 → `CUT_LOG_EXCEEDS_STARTING_BALANCE`.
11. Toggle `isWaste` on a FINAL cut → saves clean. Row persists with `isWaste = true`.
12. Link a cut to a work order (dropdown): pick WO-A from the work-order select. The material-item select enables. Pick an item whose `productId` matches → saves.
13. Clear the work-order link (set to unlinked) → `workOrderItemId` auto-clears in the UI; payload sends both nullified.
14. Attempt to link a cut to a material item whose `productId` differs from the inventory row's product (direct API call bypassing UI filter) → rejected with `CUT_LOG_WORK_ORDER_ITEM_PRODUCT_MISMATCH`.
15. Attempt to set `workOrderItemId` without `workOrderId` (direct API call) → rejected with `CUT_LOG_WORK_ORDER_ITEM_REQUIRES_WORK_ORDER`.

### Inventory + cut logs — carpet
1. Create a carpet product with `coveragePerUnit = 3` (meaningful because carpet has `hasCoverageUnit: true`); inventory row `stockCount = 10`, `cost = 500`, `freight = 100`.
2. Mark FINAL via imports.
3. PENDING cut of 4 linear feet → cut row `cost = 200.00` (= 500/10 × 4), `freight = 40.00` (= 100/10 × 4), `coverage = 12` sqyd. Inventory `availableBalance = 10` (still — PENDING), `availableCoverage = 30` sqyd.

### Inventory + cut logs — baseboard
1. Create baseboard product with `coveragePerUnit = null`; inventory row `stockCount = 50`, `cost = null`, `freight = null`.
2. Mark FINAL.
3. Balance tiles: `availableCoverage` renders blank / dashed. All other balances in `pieces`.
4. Cut of 5: `coverage` column on the cut row renders blank. `cost` + `freight` on the cut row render blank (source inventory had null). Everything else works 1:1.

### Idempotency replay
- Replay a cut-logs section PATCH with the same `idempotencyKey` → returns the stored receipt; use case does not re-run.

## Layer-boundary spot checks
- `grep -rn "from \"@builders/db\"" packages/domain/src` → zero.
- `grep -rn "from \"@builders/application\"" packages/db/src` → zero.
- `grep -rn "validate\|assert\|isBlocked" packages/db/src | grep "from \"@builders/domain\"" | grep -v "\.js\"$"` — normalizers should only pull pure helpers, not the throwing rules. Manual review any hit.
- `grep -rn "prisma\|PrismaClient" apps/web/app/api` — all through application use cases; no direct Prisma in routes.

---

# Execution order

1. **Pre-flight** — Sweep-2 audit (read-only, ~15 min).
2. **Phase 1** — Prisma migration. Apply, rebuild `@builders/db`.
3. **Phase 2** — Seed carpet, pad, baseboard. Re-run seed.
4. **Phase 3** — Domain. In order: Categories primitive → Cut Logs (incl. `category-math` spoke) → Inventory adapter + semantic fix.
5. **Phase 4** — Data. Update `inventory/shared.ts` selects, normalizers in `inventory/read-repository.ts`, confirm `applyInventoryCutLogsDiff` primitive shape.
6. **Phase 5** — Application. `saveInventoryCutLogsUseCase` with lock scope, fresh-total load, server-stamped `cost` + `freight` + `before` + `after` on added rows, link-only modify path, domain-rule enforcement.
7. **Phase 6** — Routes. `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` + `_validators.ts` updates.
8. **Phase 7** — Module. UI columns in cut-logs section, controller setters, balance tiles in primary section.
9. **Phase 8** — Dashboard pages. Confirm imports; expected no-op.
10. **Phase 9** — Verification sweep (builds, greps, dev smoke).

Each phase leaves the tree buildable. Layer boundaries are the pause points. One commit per phase (or per module-within-phase if a phase grows large).

---

# Flags & concerns

Open items worth raising before / during execution. Not blockers by default, but worth a decision before the code lands.

1. **Column-name shadowing across tables.** `FlooringCutLog.cost` + `FlooringCutLog.freight` re-use the same names already present on `FlooringInventory`. Prisma namespaces them by model so the generated client is fine, but `cost` / `freight` without context is ambiguous when reading code or SQL. Alternatives: `cutCost` / `cutFreight` on the cut-log model (clearer in isolation, uglier when paired with `cut`/`before`/`after`), or accept the shadowing with discipline (current plan). Decide before Phase 1.
- I agree with your naming convention correctness,

2. **Historical drift between cut-log and inventory cost.** Because `cost` / `freight` snapshot at create time and the cut amount is immutable, a FINAL cut's cost can diverge from the then-current inventory cost basis if the inventory row's `cost` or `freight` is edited later. This is intentional (accounting snapshot), but two cuts of the same `cut` size against the same row can show different `cost` values if they were created on different days with different inventory costs. Work-order expense rollups (future sweep) will reflect this spread. Flag to finance/accounting stakeholder if not already aligned.
- Add this to the preflight check list that we will make the inventory cost only editable from the imports record view inventory section pre-import confirmed. price won't be editable from inventory record view. Cut logs still get a snapshot of the cost and freight.

3. **`before` / `after` becoming nonsensical after intermediate deletes.** If cuts are created in sequence A=2, B=3, C=1 against `stockCount=10`, they'll each snapshot `before`/`after` based on the then-current aggregate. Delete B later and A/C's stored `before`/`after` still describe their original creation context — which will no longer correspond to the linear "walk down the balance" narrative. Inventory's computed balances stay correct (they're re-aggregated from live cut totals). Flag: consider whether `before`/`after` should be **computed on read** instead of stored, using a stable ordering (e.g., `createdAt`). Stored is simpler and matches today's schema; computed is more defensible. Decide before Phase 1.
- cut logs should only be deleted in the reverse order of which they happen. so the most recent cut is the only one deleteable till its delete. then the one before that is deleteable ect. the before and after quantities are important they should stay as real fields. unless it creates some crazy blockage, thoughts?

4. **Work-order relink mutation surface.** Allowing `workOrderId` / `workOrderItemId` to be edited post-create means a single cut can move between work orders. Consequences (next sweep, out of scope this sweep but worth pre-mortem):
   - Work-order expense totals shift when a cut is relinked. Accounting/reporting needs to reflect a cut's current link, not its historical one.
   - Material-item fulfillment status recomputes based on current linked cuts. A cut moving from WO-A's item to WO-B's item can flip both items' SHORTAGE/SUFFICIENT status.
   - No write-side rule prevents rapid-fire relinking. Server validates product-match invariant on each save; that's the only gate.

   my thoughts on #4. 
  - we should make it so cut logs only get linked to work orders/ material items through the work order record view. no backward editability froim inventories cut log section. 
  - adding cut log from work orders auto links the work order and material item to the cut log. cut logs can't be made from work order material items section without them. cut logs can still be made from inventory record view with non editable fields of the work order and material item its linked to.
  - Deleting a cut logs does not delete the material item. Deleting a material item does not delete the cuts either. if a material item is deleted, the cuts linked to it drop the material item and work order link. Cuts stay intact. only can delete cut logs from an inv item in the order they were made.
  - cut logs in work order material item section  
   - work order material items fufillment quantity and status should be computed fields as well as the work order caluclations. will that withhold long term?
   - Multiple cut logs from the same inv item can be assigned to a material item, in this section cuts from the same inventory  delete order still persist.
   - am i missing what your describing on this flag or did i resolve this
   - we may sweep work orders module so the cut log logic can be added cleanly.

5. **Cascading dropdown UX: clearing the work order.** When the user clears `workOrderId` on a persisted cut that has a `workOrderItemId`, the controller auto-clears the material item in the draft and the payload sends both nullified. Confirm this is the desired UX vs. a confirmation prompt ("Clearing the work order will also unlink the material item. Continue?"). Plan defaults to silent auto-clear.
- yes either a cut log has both a work order and material item or neither.

6. **Pre-fetch vs. on-demand material items.** The cut-logs section needs to populate the material-item dropdown filtered by work order + product. Pre-fetching `materialItemOptionsByWorkOrder` for every work order scoped to the warehouse is cheap at current scale but grows with WO count × item count. If dev smoke shows the page loader is heavy, switch to an on-demand endpoint (`GET /api/work-orders/[id]/items?productId=…`). First pass ships pre-fetch.
- we no longer need the material item drop down based on my previous comments.

7. **`cut` field validation when inventory.stockCount is 0.** Edge case: a just-created inventory row with `stockCount = 0` (shouldn't happen per domain validation `stockCount >= 0` + UI enforcement `> 0` for usable rows, but possible via direct API). Any cut against it immediately violates `CUT_LOG_EXCEEDS_STARTING_BALANCE`. No special handling needed — the existing guard catches it. Flag only to note the edge exists.
- yes just flag so its existence is known.
- users can't create cutlogs which make the inventories computed available balance 0. the stock count column in inventory prisma model is the starting balance. slight naming convention mismatch, it will need to stay.

8. **Nullable `cost` / `freight` propagation.** A cut against a row with `inventory.cost == null` gets `cost = null`. If the user later sets `inventory.cost` to a real value, existing cuts stay null — no backfill. This matches the "snapshot is frozen" contract. Product owner should confirm this is the desired behavior; alternative would be to require `cost`/`freight` at inventory-create time (larger scope, not in this sweep).
- i agree with this. if cost or freight is null on the inv item when a cut is made the computation can handle null

9. **"Delete + recreate" UX cost.** Users changing a cut amount must delete and re-add, which:
   - Loses any edits made to `status`, `isWaste`, `notes`, work-order link on the existing cut (they have to re-apply on the new cut).
   - Generates two audit log entries (delete + create) instead of one (update).
   - Is slower than a direct edit, which may frustrate power users.
   Flag: consider whether the UX should offer a "change quantity" affordance that does delete+create transactionally under the hood while preserving the surrounding field values. Deferred — first pass keeps the mechanics visible.

   - no, users must delete the most recent cuts in order to edit cut log balance. status ect. are editable as mentioned.

10. **Status flip with zero guardrails.** Because FINAL ↔ PENDING flips freely, a user can accidentally un-finalize a FINAL cut and re-finalize it mid-session with no audit trail beyond `updatedAt`. If accounting compliance needs an immutable "once final, reported" marker, the current design doesn't capture it. Deferred per user direction; revisit if compliance requirements surface.
- this use case will be idempotent and transactional and row locked. 
- any use case for cut logs locks the inventory row and its cut logs.
- the cut log status moves freely and the inventory row balances update on save.

11. **Drop `CUT_LOG_FINAL_REVERSAL_NOT_ALLOWED` references.** Nothing in the domain uses it now that the rule is gone. Verify during Phase 3 that no lingering reference (error code, test, validator branch) remains — if anything carries it forward from an earlier draft of the plan, purge.

12. **Inventory `freight` must be in the Sweep-2 validator reach.** Confirm `validateInventoryInput` and the imports-diff shaper both accept `freight` as an optional decimal string (Sweep 2 should have covered this, but worth re-verifying before Phase 5 since the cut-log compute depends on it).

Add another file to docs/sweeps/ root called pre flight and add the preflight items from this plan to it and remove them from this file.
Add pending flags and concerns at the bottom of each file.