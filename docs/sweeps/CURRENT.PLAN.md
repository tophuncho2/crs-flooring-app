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

**Pre-flight is a separate document.** See `PREFLIGHT.md` in this directory. Sweep 2 verification + two Sweep-3 hardening rules (lock inventory cost/freight post-import; confirm freight validator reach) must land before Phase 1 below begins.

---

## Inventory balance semantics (decided)

The current code is correct; no math changes needed in Phase 3. The four balance fields mean exactly what their names say:

| Field | Formula | Meaning |
|---|---|---|
| `stockCount` | — | Starting balance at import time (immutable input; schema naming is "stockCount" but semantically it's "starting balance" — see pending flag 1) |
| `totalCutBalance` | `sum(cuts where status === "FINAL")` | Cuts that have physically happened |
| `awaitingCutBalance` | `sum(cuts where status === "PENDING")` | Cuts promised but not yet executed |
| `uncutBalance` | `stockCount − totalCutBalance` | Physical stock that has NOT been cut yet (pending cuts are still physically there) |
| `availableBalance` | `stockCount − (totalCutBalance + awaitingCutBalance)` | Stock that is NOT committed to anything — free to allocate to a new cut |

Algebraic identity: `uncutBalance − awaitingCutBalance = availableBalance`. Not a definition, just arithmetic.

**`availableCoverage` derives through the canonical category computation function** (the hub-and-spoke primitive from `packages/domain/src/flooring/categories/`). For each inventory row:

`availableCoverage = convertStockToCoverage({ stockAmount: availableBalance, coveragePerUnit: product.coveragePerUnit, categorySlug: category.slug })`

The category rule governs the conversion:
- `vinyl-plank`, `carpet`, `pad` — `hasCoverageUnit: true` → emits a number.
- `baseboard` — `hasCoverageUnit: false` → emits `null` → normalizer renders `""`.
- Any category with `coveragePerUnit === null` on the product → also emits `null`.

The normalizer never does inline coverage math. Every coverage field in the system — `inventory.availableCoverage`, `cutLog.coverage`, and future work-order fulfillment totals — flows through the same `convertStockToCoverage` call. One source of truth per category, seeded once.

## Cut-log editability model (decided)

**Frozen on create; deletion is the only way to "edit" the quantity-shaped fields.**

- `cut`, `before`, `after`, `cost`, `freight` — all stored columns, all computed at create time, all immutable thereafter. To change a cut amount: delete the cut (in reverse order, see below) and re-create.

**Editable post-create:**

- `status` — `"PENDING"` / `"FINAL"` toggle. Freely flippable both directions. Flipping changes what counts toward `availableBalance` but does NOT recompute cost/freight. The save is idempotent + transactional + row-locked; the inventory row's computed balances update on save.
- `isWaste` — free toggle.
- `notes` — free-form edit.

**Read-only on inventory record view (set only via work-order record view in a future sweep):**

- `workOrderId` — linked work order.
- `workOrderItemId` — linked material item.

Rationale for read-only: cut-log ↔ work-order linkage is established through the work-order record view's material-item section (future sweep). A cut added directly from the inventory record view has NO work-order link (both fields null). A cut added from the work-order side auto-links both. There is no reverse-editing path from the inventory side — preserves a single source of truth for where work-order linkage is decided.

**Delete rule — reverse order only.**

A cut log is deletable only if it is the most-recent cut against its inventory row (by `createdAt`). Attempting to delete any other cut rejects with `CUT_LOG_DELETE_NOT_MOST_RECENT`. This preserves the meaning of each cut's stored `before` / `after` snapshots — they can never be left describing a history that no longer exists.

**Material-item delete does NOT cascade to cut logs** (next-sweep rule, documented here for continuity). When a work-order material item is deleted, any cut logs linked to it stay intact with their `workOrderId` and `workOrderItemId` both nullified. The cuts against inventory are a physical fact; only the link to the work-order context clears.

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

  // Frozen on create: before, cut, after, cost, freight.
  // Editable post-create (from inventory record view): status, isWaste, notes.
  // Work-order linkage (workOrderId, workOrderItemId) is READ-ONLY from the inventory record view.
  // Those fields are populated by future work-order-record-view flow; cuts created from inventory
  // side always have both fields null.
  export type CutLogRow = {
    id: string
    inventoryId: string
    workOrderId: string | null        // display-only from inventory side; set by work-orders sweep
    workOrderItemId: string | null    // display-only from inventory side; set by work-orders sweep
    before: string                    // frozen at create
    cut: string                       // frozen at create
    after: string                     // frozen at create (= before − cut)
    status: CutLogStatus              // editable, flips freely both directions
    isWaste: boolean                  // editable
    cost: string                      // frozen at create; "" when null in DB
    freight: string                   // frozen at create; "" when null in DB
    coverage: string                  // computed at normalize time; "" when no coverage applicable
    notes: string                     // editable
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

  // Delete is only allowed for the most-recent cut against an inventory row.
  // siblingsSameInventory is the list of all cuts against the same inventoryId (includes `cutLog` itself).
  export function isCutLogMostRecent(
    cutLog: Pick<CutLogRow, "id" | "createdAt">,
    siblingsSameInventory: ReadonlyArray<Pick<CutLogRow, "id" | "createdAt">>,
  ): boolean {
    // Find max createdAt; the cut whose id matches that winner is the most recent.
    const newest = siblingsSameInventory.reduce((a, b) =>
      a.createdAt >= b.createdAt ? a : b,
    )
    return newest.id === cutLog.id
  }

  export function assertCutLogDeleteAllowed(
    cutLog: Pick<CutLogRow, "id" | "createdAt">,
    siblingsSameInventory: ReadonlyArray<Pick<CutLogRow, "id" | "createdAt">>,
  ): void {
    if (!isCutLogMostRecent(cutLog, siblingsSameInventory)) {
      throw new CutLogDomainError("CUT_LOG_DELETE_NOT_MOST_RECENT", { cutLogId: cutLog.id })
    }
  }
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
    | "CUT_LOG_DELETE_NOT_MOST_RECENT"
  export class CutLogDomainError extends Error { /* code, field, detail */ }
  ```

  No `CUT_LOG_FINAL_REVERSAL_NOT_ALLOWED` — flips are free. No work-order / material-item link validation codes — those concerns move to the work-orders sweep where the linking UI lives; cut-log save from the inventory record view never accepts those fields as client input.
- `index.ts` — barrel.

### Inventory removal step
- `packages/domain/src/flooring/inventory/types.ts` — delete inline `CutLogStatus` + `CutLogRow` (lines 1–15). Import from `../cut-logs` and re-export for back-compat.

### Wiring
- `packages/domain/src/index.ts` — `export * from "./flooring/cut-logs/index.js"`.

## Inventory — adapter

Add a thin adapter to the categories primitive so inventory's normalizer stops doing inline coverage math. Balance semantics (`availableBalance`, `uncutBalance`, etc.) are already correct in the current code — no math changes, no rename.

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
- **Modified:** `inventory-rules.ts` — the cut-log-precondition helper uses the current-code semantics: the post-diff sum of all cuts (`totalCut + awaitingCut`) must be `≤ stockCount`, i.e. `availableBalance ≥ 0`. Throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` from the cut-logs domain. No rename, no math change.
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
  - Cut-log select payload: add `cost: true`, `freight: true`, and `isWaste: true`.
  - Inventory select: add `product.category.slug` (needed by the category-math adapter). Today it includes `product.category.name`; extend with `slug` and the five unit relations' `name` + `abbreviation`.
- `packages/db/src/flooring/inventory/read-repository.ts`:
  - `normalizeCutLogRow(row, coveragePerUnit, category)` — import `computeCutCoverage` from `@builders/domain`'s `cut-logs/category-math.ts`. Emits `cost` and `freight` (`""` when null in DB), `isWaste`, and computed `coverage`.
  - `normalizeInventoryRow(payload, aggregate)` — replace the inline `computeAvailableCoverage` helper with `computeInventoryAvailableCoverage` from `@builders/domain`'s `inventory/category-math.ts`. Thread `category.slug` + `coveragePerUnit`. Balance math (`uncut = stockCount − totalCut`, `available = stockCount − totalCut − awaitingCut`) stays as-is — semantics are already correct.
  - Detail variant (`normalizeInventoryDetail`) threads the same args into its cut-log mapping.

## Inventory (writes)

- `packages/db/src/flooring/inventory/write-repository.ts` — no changes for cut-log writes directly (the atomic-diff primitive lives alongside):
- `packages/db/src/flooring/inventory/` — confirm or add `applyInventoryCutLogsDiff(tx, input) → { logs, tempIdMap }` per REFERENCE.md. This primitive:
  - CREATE: persists `before`, `cut`, `after`, `status`, `notes`, `isWaste`, **`cost` and `freight` from input** (application layer has already computed them from the inventory snapshot).
  - UPDATE: forwards each patched field from the restricted modify-set (`status`, `isWaste`, `notes`). Never recomputes `cost` / `freight` / `before` / `after` / `cut` — those are frozen on create.
  - DELETE: removes cut logs by id. Reverse-order-only rule enforced at application layer, not here.
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
5. Load full sibling list of cut logs for this inventory (`id`, `createdAt`) — used for reverse-delete enforcement.
6. **Domain checks — added cuts:**
   - `canAddCutLog(inventory)` → throws `CUT_LOG_INVENTORY_NOT_IMPORTED` if `inventory.isImported === false`.
   - `isCutLogStatus(status)` — enum guard.
   - `assertBeforeCutAfterInvariant({ before, cut, after })` — arithmetic invariant on the server-computed snapshot. `after = before − cut`.
7. **Domain checks — modified cuts (restricted):**
   - Allowed fields on a modify patch: `status`, `isWaste`, `notes`. **Any attempt to modify `cut`, `before`, `after`, `cost`, `freight`, `workOrderId`, `workOrderItemId` is rejected by the validator before reaching the use case.** The use case backstops by ignoring those fields if they somehow reach it.
   - `isCutLogStatus(status)` on status changes.
8. **Domain checks — deleted cuts:**
   - For each deleted `id`, call `assertCutLogDeleteAllowed(cutLog, siblings)`. Throws `CUT_LOG_DELETE_NOT_MOST_RECENT` unless the cut is the newest by `createdAt`. If the diff deletes multiple cuts, they must be the `N` most-recent cuts in reverse order — validated by walking from newest backward and checking each deleted id against the receding tail.
9. **Domain checks — post-diff aggregate:**
   - Compute fresh `SUM(cut)` across all this inventory's cut logs after applying the diff.
   - Throw `CUT_LOG_EXCEEDS_STARTING_BALANCE` if `stockCount − newSumOfCuts < 0`.
10. **Server-stamped cost + freight + before + after (added cuts only — frozen at create):**
    - `costPerUnit = (inventory.cost != null && inventory.stockCount > 0) ? inventory.cost / inventory.stockCount : null`
    - `freightPerUnit = (inventory.freight != null && inventory.stockCount > 0) ? inventory.freight / inventory.stockCount : null`
    - `cutCost = costPerUnit != null ? costPerUnit × cut : null` → persisted to `FlooringCutLog.cost`.
    - `cutFreight = freightPerUnit != null ? freightPerUnit × cut : null` → persisted to `FlooringCutLog.freight`.
    - `before = stockCount − sum(existing cut logs' cut)` (snapshot at moment of create) → persisted.
    - `after = before − cut` → persisted.
    - `workOrderId` and `workOrderItemId` → **always null** on cuts added from the inventory record view. (Future work-orders sweep adds a distinct save path that sets these on create.)
    - These are **frozen**. Modifying a cut never recomputes them (cut amount itself is immutable).
11. **Link-only modify path:** for modified rows, the patch contains only the editable subset (`status`, `isWaste`, `notes`). No cost / freight / before / after / cut re-computation and no work-order linkage changes.
12. Call `applyInventoryCutLogsDiff(tx, { inventoryId, diff })`.
13. Re-read full detail, return `{ inventory: InventoryDetailRecord, tempIdMap }`.

### `packages/application/src/flooring/inventory/update-inventory.ts`
Unchanged by Sweep 3 directly; the Sweep-2 `IMPORTED_REVERSAL_NOT_ALLOWED` + `INVENTORY_PENDING_IMPORT` guards stay.

### `packages/application/src/flooring/inventory/errors.ts`
Add execution-error codes if not present:
- `CUT_LOG_INVENTORY_NOT_IMPORTED`
- `CUT_LOG_EXCEEDS_STARTING_BALANCE`
- `CUT_LOG_ARITHMETIC_MISMATCH`
- `CUT_LOG_DELETE_NOT_MOST_RECENT`
- `INVENTORY_COST_LOCKED_POST_IMPORT` (from PREFLIGHT item 7 — the cost/freight lock-down rule)

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
Shape is asymmetric by intent — added rows carry the create payload, modified rows carry only the editable subset, deletes carry `id`+`expectedUpdatedAt` and are validated reverse-order-only at the use-case layer.

- **Added rows** accept:
  - `inventoryId` (required, matches the route's `[id]` param)
  - `cut` (required — the only quantity the client sends)
  - `status` (optional, default `"PENDING"`)
  - `isWaste` (optional, default `false`)
  - `notes` (optional)
  - **Rejected** at validator: `before`, `after`, `cost`, `freight`, `workOrderId`, `workOrderItemId`. Server computes the first four; the last two stay null on inventory-side creates.
- **Modified rows** accept **only** the editable-post-create subset:
  - `id` (required)
  - `expectedUpdatedAt` (required — per-row concurrency check)
  - `status` (optional)
  - `isWaste` (optional)
  - `notes` (optional)
  - **Rejected** at validator: `cut`, `before`, `after`, `cost`, `freight`, `workOrderId`, `workOrderItemId`. Any of these in a modify patch → `400 INVALID_BODY`. The message should point the user to delete + recreate for cut-amount changes; work-order linkage is managed from the work-order record view (future sweep).
- **Deleted rows:** `id`, `expectedUpdatedAt`. The reverse-order-only rule is enforced at the domain / use-case layer, not the validator — the validator just accepts the shape.

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
- `cut` — input on **added** (unsaved) rows only; on persisted rows renders as read-only text. To change the value: delete the cut (must be the newest) and re-add.
- `before` — read-only on all rows (server-computed on create, frozen).
- `after` — read-only on all rows (server-computed on create, frozen).
- `status` — editable `<select>` PENDING/FINAL on **all** rows (including persisted). Freely flippable both directions.
- `isWaste` — editable checkbox on all rows.
- `cost` — read-only on all rows. Renders `row.cost` (blank/dash when `""`).
- `freight` — read-only on all rows. Renders `row.freight` (blank/dash when `""`).
- `coverage` — read-only on all rows. Renders `row.coverage` (blank/dash when `""` — baseboard or product with null `coveragePerUnit`).
- `workOrder` — **read-only label**. Renders the linked work-order number when `row.workOrderId` is set; blank otherwise. No dropdown, no setter. Work-order linkage is managed exclusively from the work-order record view (future sweep).
- `workOrderItem` — **read-only label**. Renders the linked material-item label when `row.workOrderItemId` is set; blank otherwise. No dropdown, no setter.
- `notes` — editable text input on all rows.
- Delete action — "trash" icon per row. **Only rendered on the most-recent cut** (the cut with the latest `createdAt`). All older cuts show the icon disabled with a tooltip: "Delete the newer cut first." The UI mirrors the domain rule; the server backstops with `CUT_LOG_DELETE_NOT_MOST_RECENT`.

Empty state + gate:
- When `!isImported`: "Cut logs unlock once this row is marked Final on the imports record view." (Sweep-2 behavior preserved.)

### Controller updates — `controllers/use-inventory-cut-logs-section.ts`

Setters (all operate on the draft; the section's dirty-diff generator shapes payloads on submit):
- `setRowCut(index, string)` — active only on unsaved (added) rows. No-op on persisted rows.
- `setRowStatus(index, CutLogStatus)` — all rows.
- `setRowIsWaste(index, boolean)` — all rows.
- `setRowNotes(index, string)` — all rows.

No setters for `workOrderId`, `workOrderItemId`, `cut` (on persisted rows), `before`, `after`, `cost`, `freight`. Attempting them is a type error.

Delete-handler logic:
- `canDeleteRow(index)` returns `true` only when the row is the one with the max `createdAt` among saved rows. Draft (unsaved) rows can always be removed from the local draft (they haven't hit the server yet).
- The grid's trash-icon renderer calls `canDeleteRow` and flips disabled state accordingly.

Diff payload generators:
- `toDraftPayload(row)` → `{ inventoryId, cut, status, isWaste, notes }`. **No** `before`/`after`/`cost`/`freight`/`workOrderId`/`workOrderItemId` — server computes or leaves null.
- `toUpdatePatch(row, original)` → diff of changed fields only from the editable subset: `{ status?, isWaste?, notes? }`. Plus `id` + `expectedUpdatedAt`. Never emits other fields.

Loader dependencies:
- No new option bundles. `workOrderOptions` / `materialItemOptionsByWorkOrder` are NOT needed for this sweep (dropdowns removed). The section renders the read-only work-order / material-item labels from whatever the normalizer already returns on `CutLogRow`.
- If the normalizer needs to surface work-order / material-item **display strings** (not just IDs), add minimal relation-loading in `inventoryRowSelect`: `cutLogs → workOrder { number } → workOrderItem { id, label-source }`. Emit `workOrderLabel: string` and `workOrderItemLabel: string` on the normalized cut-log row for UI consumption. **Default:** skip this nicety for this sweep — show `""` for both labels until the work-orders sweep lights up the linking path and a fully meaningful label is available.

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
3. Attempt to edit `cost` from inventory record view → no editable input surface (PREFLIGHT item 7).
4. Back to imports: flip the row to FINAL, save. Confirm imports view now renders `cost` / `freight` cells read-only on this row (PREFLIGHT item 7).
5. Reload inventory record: balance tiles show `availableBalance = 10`, `uncutBalance = 10`, `awaitingCutBalance = 0`, `totalCutBalance = 0`, `availableCoverage = 237.70` (= 10 × 23.77).
6. Add cut A (PENDING, `cut = 2`): `availableBalance = 8` (stockCount − all cuts), `uncutBalance = 10` (stockCount − final; nothing final yet), `awaitingCutBalance = 2`, `totalCutBalance = 0`, `availableCoverage = convertStockToCoverage({ stockAmount: 8, coveragePerUnit: 23.77, categorySlug: "vinyl-plank" }) = 190.16`. Cut row persists with `cut = 2`, `before = 10`, `after = 8`, `cost = 20.00`, `freight = 4.00`, `coverage = 47.54`, `workOrderId = null`, `workOrderItemId = null`.
7. Flip cut A to FINAL: `availableBalance = 8`, `uncutBalance = 8`, `awaitingCutBalance = 0`, `totalCutBalance = 2`, `availableCoverage = 190.16`. `cost` / `freight` / `before` / `after` / `cut` unchanged (frozen). `availableBalance` unchanged because status flip doesn't move stock between "cut" and "not cut" categories — only between pending and final. `uncutBalance` drops from 10 to 8 because the cut has now physically happened.
8. Flip cut A back to PENDING → saves clean (no reject). Inventory balances recompute: `availableBalance = 8`, `uncutBalance = 10`, `awaitingCutBalance = 2`, `totalCutBalance = 0`, `availableCoverage = 190.16`. Cut row's `cost` / `freight` still frozen.
9. Add cut B (PENDING, `cut = 1`): cut B's `before = 8` (= stockCount − existing cuts = 10 − 2), `after = 7`, `cost = 10.00`, `freight = 2.00`. Inventory: `availableBalance = 7`, `uncutBalance = 10`, `awaitingCutBalance = 3`, `totalCutBalance = 0`, `availableCoverage = 166.39`.
10. Attempt to delete cut A (not the newest) → UI trash icon is disabled; direct API attempt returns `CUT_LOG_DELETE_NOT_MOST_RECENT`.
11. Delete cut B (newest) → saves. Now cut A is newest again; its trash icon enables.
12. Attempt to edit cut A's `cut` via direct API patch with `cut: 5` in body → validator rejects with `400 INVALID_BODY`.
13. Delete cut A → no cuts remain. Balances return to initial.
14. Add a cut of 11 → `CUT_LOG_EXCEEDS_STARTING_BALANCE`.
15. Add a cut of 2, toggle `isWaste = true` → saves clean. Row persists with `isWaste = true`.
16. Inventory record view's cut-logs grid: verify `workOrder` and `workOrderItem` columns render blank (no editable dropdown anywhere — display-only, no linked WO since creation was from inventory side).

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

1. **Pre-flight** — see `PREFLIGHT.md`. Sweep-2 verification + two Sweep-3 hardening rules (inventory cost/freight lock; freight validator reach).
2. **Phase 1** — Prisma migration. Apply, rebuild `@builders/db`.
3. **Phase 2** — Seed carpet, pad, baseboard. Re-run seed.
4. **Phase 3** — Domain. In order: Categories primitive → Cut Logs (incl. `category-math` spoke) → Inventory adapter.
5. **Phase 4** — Data. Update `inventory/shared.ts` selects, normalizers in `inventory/read-repository.ts`, confirm `applyInventoryCutLogsDiff` primitive shape.
6. **Phase 5** — Application. `saveInventoryCutLogsUseCase` with lock scope, fresh-total load, server-stamped `cost` + `freight` + `before` + `after` on added rows, link-only modify path, domain-rule enforcement.
7. **Phase 6** — Routes. `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` + `_validators.ts` updates.
8. **Phase 7** — Module. UI columns in cut-logs section, controller setters, balance tiles in primary section.
9. **Phase 8** — Dashboard pages. Confirm imports; expected no-op.
10. **Phase 9** — Verification sweep (builds, greps, dev smoke).

Each phase leaves the tree buildable. Layer boundaries are the pause points. One commit per phase (or per module-within-phase if a phase grows large).

---

# Resolved decisions (for posterity)

These were open questions in earlier drafts. Each has been folded into the plan; no action needed beyond following it.

- **Column naming — keep `cost` / `freight` on `FlooringCutLog`.** Shadowing with `FlooringInventory.cost` / `.freight` is accepted. Prisma namespaces by model; paired with `cut` / `before` / `after` the meaning is obvious at call-sites.
- **Cost/freight historical drift — solved architecturally.** Inventory cost + freight are only editable from the imports record view AND only while `isImported === false`. Once confirmed, those fields lock forever. Cut-log snapshots against a confirmed row always equal the final immutable inventory value. No drift possible. Enforcement is PREFLIGHT item 7.
- **`before` / `after` stored — paired with reverse-order-only delete.** Stored as real columns. The reverse-order-only delete rule (most-recent cut deletable first, then next, etc.) means the `before` / `after` snapshots can never describe a stale history. Simpler than computed-on-read and preserves the audit shape of each individual cut.
- **Work-order linkage — one-way from the work-order record view.** Cut-log ↔ work-order / material-item linking is set exclusively through the work-order record view (future sweep). Cuts created from the inventory record view produce null links. Inventory-side UI shows those fields as read-only display. Removes the entire cascading-dropdown / product-match-invariant path from this sweep.
- **Material-item delete does NOT cascade to cut logs.** Future-sweep rule, documented here for continuity: deleting a material item sets `cutLog.workOrderId = null` AND `cutLog.workOrderItemId = null` on every cut that referenced it. Cuts against inventory are physical facts; only the link to the WO context clears.
- **Fulfillment + work-order totals are computed on read.** Never stored. Matches REFERENCE.md. No drift, no reconcile job, no backfill. Work-orders sweep implements.
- **Dropdown UX questions — moot.** No dropdowns in the inventory-side cut-logs UI this sweep. `workOrder` and `workOrderItem` columns are read-only labels (or hidden entirely — see pending flag 2).
- **Nullable `cost` / `freight` propagation.** Cut-log snapshot carries null if the inventory source was null at create time. No backfill when inventory cost is later set. Frozen-snapshot contract.
- **No "change quantity" shortcut.** Delete-in-reverse-order is the only quantity-change path.
- **Status flip needs no audit trail.** Row-locked, transactional, idempotent save covers correctness. Any cut-logs use case locks the inventory row + its cut logs. Inventory balances recompute on save.

---

# Pending flags and concerns

Open items that still warrant discussion before or during execution.

1. **`FlooringInventory.stockCount` is semantically "starting balance," not "current stock."** Schema naming mismatch — the name sounds live but the column is immutable. Stays (migration cost > rename benefit). Mitigate with a `StartingBalance` TypeScript alias + JSDoc on the domain `InventoryRow` type, so call-sites reading `stockCount` for the first time are not misled. Decide during Phase 3 whether to add the alias.

2. **Read-only `workOrder` / `workOrderItem` columns may look broken in this sweep.** Every cut created from the inventory record view renders blank in those columns. Users may read "blank" as "broken." Options: (a) hide both columns entirely until the work-orders sweep ships — recommended, less noise; (b) show with tooltip explaining "Work-order linkage activates with the work-orders sweep"; (c) leave blank without explanation. Decide during Phase 7.

3. **Reverse-order delete interaction with concurrent writes.** Two users both targeting the current newest cut for deletion: first commit wins; second gets `CUT_LOG_DELETE_NOT_MOST_RECENT` because what was "newest" is now gone. Server error is correct; UI needs to handle it gracefully — refresh the section with new server state and show a brief toast. Non-blocking; Phase 7 UI polish.

4. **Edge case: `stockCount = 0` inventory row.** Schema allows `>= 0`. Any cut immediately violates `CUT_LOG_EXCEEDS_STARTING_BALANCE`. No special handling; existing guard catches it. Flagged for awareness only.

5. **`stockCount = 0` at creation — additional nuance.** Users cannot create cut logs that would drive `availableBalance` negative (same guard as above). Normal flow on a zero-stock row: no cuts possible. Combined with (4) means such a row is effectively unusable — which may or may not be desired. If the product side wants to prevent `stockCount = 0` rows from being saved in the first place, that's an inventory-side validation change (not in this sweep).

6. **Material-item-delete cascade-clear is a future-sweep contract.** When the work-orders sweep ships material-item delete, it must null both `cutLog.workOrderId` and `cutLog.workOrderItemId` on every cut referencing the deleted item. Add a `TODO` or schema-level note near `FlooringCutLog.workOrderItemId` during Phase 1 so this commitment survives across sweeps.

7. **Verify `CUT_LOG_FINAL_REVERSAL_NOT_ALLOWED` is fully purged.** Earlier drafts of this plan included the code. Grep during Phase 3: `grep -rn "FINAL_REVERSAL\|isFinalReversal" packages apps/web | grep -v dist | grep -v node_modules` → zero. Non-blocking, just hygiene.