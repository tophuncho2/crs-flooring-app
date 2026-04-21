# Current Plan — Imports · Inventory · Cut Logs Sweep

This plan executes layer-by-layer, module-by-module, across three interconnected modules: **imports**, **inventory**, **cut-logs**. Categories (seeded, read-only) is pulled in as a fourth passive participant because it owns the canonical UoM + unit-conversion logic that all three consume. **Work orders** is the next sweep — referenced here only where it informs a shared shape that we set up now.

See `REFERENCE.md` for the full four-module vision (imports + inventory + cut-logs + work-orders in one sweep). This plan is the narrowed, executable slice: we ship imports + inventory + cut-logs end-to-end first, then pick up work-orders against the patterns established here.

---

## Strict layering (non-negotiable, every module)

| Layer | Path | Responsibility | Forbidden |
|---|---|---|---|
| Domain | `packages/domain/src/flooring/{module}/` | Pure types, diff shapes, rules, formatters, errors. | **No I/O.** No Prisma, no fetch, no DB client. |
| Application | `packages/application/src/flooring/{module}/` | Use cases. Orchestrate domain rules + db reads/writes. Own transactions. | No HTTP. No domain re-implementation. |
| Data | `packages/db/src/flooring/{module}/` | Canonical read + write repositories per module. Normalizers feed domain helpers. | No business logic. No conditional domain rules. |
| App module | `apps/web/modules/{module}/` | `controllers/`, `components/{list,record/{section}}/`, `data/{queries.ts, mutations.ts}`. | No domain logic. No application logic. No direct Prisma. |
| Routes | `apps/web/app/api/{module}/` | One mutation route per section. Each route calls exactly one use case. | No business logic. No direct Prisma. |
| Dashboard | `apps/web/app/dashboard/{module}/` | SSR page loaders; import only from `modules/{module}/data/queries.ts`. | No direct Prisma. No domain/application imports. |

**Consequence:** anything currently living in `apps/web/modules/{module}/domain/` or `/application/` or as routing logic inside the module folder migrates to the correct `packages/*` home by the end of this sweep. The module folder ends the sweep with only `controllers/`, `components/`, `data/`.

---

## End-state module directory shape (target for every swept module)

```
apps/web/modules/{module}/
├── components/
│   ├── list/                       — list-view (table, filters, columns, toolbar)
│   └── record/
│       ├── primary/                — primary-section components
│       ├── {child-section-a}/      — one folder per child section
│       └── {child-section-b}/
├── controllers/
│   ├── use-{module}-primary-section.ts
│   ├── use-{module}-{child-section-a}-section.ts
│   └── use-{module}-{child-section-b}-section.ts
└── data/
    ├── queries.ts                  — thin wrappers over @builders/db canonical reads
    └── mutations.ts                — client POST/PATCH/DELETE helpers (withMutationMeta)
```

- **One controller per section**, one save path per section, one lock scope per section.
- **One components folder per section**, so that section-specific components stay colocated.
- **`data/queries.ts`** is a thin wrapper — no Prisma imports, no direct DB — just re-exports / typed calls into `@builders/db`.
- **`data/mutations.ts`** wraps every write the module can initiate (one helper per section-save route + create/delete).
- **No legacy** `domain/`, `application/`, `record/`, or `data/api.ts`. All deleted by end-of-sweep.

This shape has not been applied to earlier-swept modules (warehouses, products, contacts, etc.). **From this sweep forward it is the canonical module directory layout.** Earlier modules get retro-fitted when they next get touched, not eagerly.

---

## Route shape (section-per-file)

Every module follows the same skeleton. **Each record-view section gets its own save route.**

```
apps/web/app/api/{module}/
├── _validators.ts                            — per-module input validators
├── route.ts                                  — GET list + POST create
├── options/route.ts                          — GET form options
└── [id]/
    ├── route.ts                              — DELETE
    ├── primary/section/route.ts              — PATCH primary section (record-level fields)
    └── {child-section}/section/route.ts      — PATCH atomic diff for the child section
```

### Standard mutation lifecycle per route

```
applyRoutePolicy(toolSlug, rateScope)
  → parseMutationEnvelope(body, validator, { requireExpectedUpdatedAt: PATCH | DELETE })
  → snapshot via getXById + assertExpectedUpdatedAt (PATCH | DELETE)
  → enforceMutationReceipt(idempotencyKey)
  → withMutationTelemetry(() => useCase(...))
  → finalizeMutationReceipt
  → routeJson(canonicalResponse)
```

**Response shape.** Primary + create + delete return the canonical Record. Atomic-diff saves return `{ parent: CanonicalDetailRecord, tempIdMap }` so the client reconciles temp → real ids in place without refetching.

---

## Per-section save model — rules

1. **Own controller.** Each section owns a hook in `controllers/` that builds its diff client-side, calls its mutation helper in `data/mutations.ts`, and reconciles the response in place.
2. **Own route.** Each section has one PATCH file under `[id]/{section-name}/section/route.ts`. Route calls one use case.
3. **Own use case.** Each section's use case opens its own `withDatabaseTransaction`, decides its lock set, validates via domain, applies via db write primitive, re-reads, returns canonical.
4. **Own lock scope.** Each section locks only what it writes. See the lock matrix below.
5. **Per-row `expectedUpdatedAt`** on every modified / deleted diff entry. Envelope-level `expectedUpdatedAt` on the parent detects gross concurrent failure (record deleted mid-edit) but is a plain read, not a lock.

### Lock scope matrix

| Section-save | Row(s) locked | Row(s) NOT locked |
|---|---|---|
| Imports — primary section | `flooring_import_entry` for this id (FOR UPDATE) | Inventory rows, nothing else |
| Imports — inventory-rows section | `flooring_import_entry` (parent) FOR UPDATE + any touched inventory rows (modified/deleted ids) | Cut logs, other imports |
| Inventory — primary section | `flooring_inventory` for this id FOR UPDATE | Cut logs, parent import |
| Inventory — cut-logs section | `flooring_inventory` (parent) FOR UPDATE + touched `flooring_cut_log` rows (modified/deleted) | Work orders, material items, other inventory rows |
| Cut log — standalone save (when the user edits a single cut-log row directly) | The single `flooring_cut_log` row FOR UPDATE + its parent `flooring_inventory` FOR UPDATE (stock-available invariant depends on parent) | Work orders, material items |

**Cross-category order** (when more than one category is locked in the same transaction): `flooring_inventory` → `flooring_cut_log` → (future: `flooring_work_order_item`). Within each category, sort by `id`. Every code path obeys this order so concurrent overlapping saves queue cleanly rather than deadlock.

### Concurrency invariant the locks preserve

- Two saves (any module) that touch **the same inventory row** serialize on the inventory lock.
- Two saves that touch **different inventory rows** run in parallel.
- Primary-section edits never interact with child-section saves unless they happen to touch the same row (they don't, by design — primary writes only the parent, child-section writes only children).

### Concrete examples (as stated by the user)

- **Saving the inventory-rows section from the imports record view** locks the import main row. (Rationale: integrity of the inventory row-set depends on the parent import's warehouse + status — we need to prevent a concurrent import-primary update from changing the warehouse while rows are mid-diff.)
- **Saving cut-logs from the inventory record view** locks the inventory row. (Rationale: `physicalStock = startingStock − sum(cuts)` must stay ≥ 0 under the lock — we read the fresh cut-total inside the lock, never a pre-lock snapshot.)
- **Saving material-items from the work-order record view** (future sweep — included for pattern completeness) locks the inventory rows referenced by the nested cut-log diffs + the touched cut-log rows + the touched material-item rows. The work-order primary row is **not** locked.

---

## Category / UoM / unit-conversion — canonical home

**Categories own the conversion.** Canonical pure functions live at `packages/domain/src/flooring/categories/unit-conversion.ts`. See `docs/sweeps/categories/domain/unit-conversion.md` for the full spec.

### Inheritance chain (never re-declare units anywhere downstream)

```
FlooringCategory (seeded: stockUnit, sendUnit, coverageAvailableUnit, itemCoverageUnit, serviceUnit)
    ↓  FlooringProduct.categoryId         — product inherits UoMs via this relation
    ↓  plus FlooringProduct.coveragePerUnit (decimal; e.g., 23.77 sqft per box)
FlooringProduct
    ↓  FlooringInventory.productId        — inventory inherits product → category UoMs
FlooringInventory (starting stock in stockUnit)
    ↓  FlooringCutLog.inventoryId         — cut log inherits stockUnit from its inventory row
FlooringCutLog (before / after / cut all in stockUnit)
    ↓  FlooringCutLog.workOrderItemId?    — when linked: fulfillment conversion happens here
FlooringWorkOrderItem (quantity in sendUnit)
```

### Unit-conversion rule

The conversion only happens **where a cut log intersects a material item**. Everywhere else the units line up by inheritance and no conversion is needed:

- Cut log `cut` is in stockUnit. Inventory `startingStock`, `physicalStock`, `awaitingCutBalance`, `totalCutBalance` are all in stockUnit.
- Material item `quantity` is in sendUnit.
- Fulfillment check converts cut-log totals → sendUnit via `product.coveragePerUnit`, then compares against `quantity`. Overage allowed.

### Inventory row — computed fields (all derived, none stored)

| Field | Definition | Unit |
|---|---|---|
| `startingStock` (stored) | `FlooringInventory.stockCount` | stockUnit |
| `physicalStock` | `startingStock − sum(cutLogs.cut)` | stockUnit |
| `availableCoverage` | `physicalStock × product.coveragePerUnit` | coverageAvailableUnit |
| `awaitingCutBalance` | `sum(cutLogs.cut where status = PENDING)` | stockUnit |
| `totalCutBalance` | `sum(cutLogs.cut where status = FINAL)` | stockUnit |

Read-path pattern (from REFERENCE.md, carried forward): **list queries** compute cut-log totals as scalar SQL aggregates (no N+1). **Detail queries** relation-load the cut-log array for display.

### Cut log — stored fields

| Field | Type | Notes |
|---|---|---|
| `inventoryId` | FK, required | The inventory row this cut draws from. |
| `workOrderId` | FK, optional | If set, `workOrderItemId` must also be set. Validated at save time. |
| `workOrderItemId` | FK, optional | Must reference an item on `workOrderId` whose `productId === inventory.productId`. |
| `before` | decimal, stockUnit | stockCount before this cut. |
| `cut` | decimal, stockUnit | Amount removed. |
| `after` | decimal, stockUnit | `before − cut`, invariant. |
| `status` | string, `PENDING` \| `FINAL` | Default `PENDING`. |

**Cut-log cost** (computed, not stored): `cut × inventory.unitCost` (+ freight allocation per the existing cost helpers). Computed at read time by the cut-log read-repo normalizer. **Distinct from material-item price:** material-item rows store a manually-input customer price (`what the customer paid`); cut-log costs are `what this cut costed us` derived from inventory. Never conflated.

**Save shapes allowed:**

1. **Canonical / standalone**: `{ inventoryId }` only. Legal. Saves cleanly.
2. **Inventory-linked**: `{ inventoryId, workOrderId: null, workOrderItemId: null }`. Same as above.
3. **Fully-linked**: `{ inventoryId, workOrderId, workOrderItemId }`. All three required when `workOrderId` is present.
4. **Illegal**: `{ inventoryId, workOrderId, workOrderItemId: null }` → reject with `CUT_LOG_WORK_ORDER_REQUIRES_ITEM`.

---

## Execution order — layer-by-layer, module-by-module

Finish each layer across all three modules before advancing. Each phase leaves the workspace buildable.

### Phase A — Database (Prisma + migration)

One migration covering every schema change this sweep needs.

- `FlooringInventory`:
  - add `warehouseId String?` + relation + `@@index([warehouseId])`.
  - add `isImported Boolean @default(false)`.
  - drop `reservedStockCount` (dead after allocation retirement; superseded by `awaitingCutBalance`).
- `FlooringCutLog`:
  - add `status String @default("PENDING")` (closed set `PENDING` | `FINAL`, domain-validated).
  - (No new link columns — `workOrderId` + `workOrderItemId` already exist.)
- Allocation-related model/enum drops are **deferred** to the work-orders sweep unless they block a build here. See REFERENCE.md §Phase A for the full allocation drop.

Apply via `npm run db:deploy --workspace @builders/db`. Rebuild `@builders/db`.

**Verification gate.** `prisma migrate status` clean. `@builders/db` build clean. Expected TS error spike downstream — it's the roadmap for later phases.

### Phase B — Domain (`packages/domain/src/flooring/`)

Per module: pure types, diff shapes, rules, formatters, errors. No I/O.

- **categories/** (new folder) — `types.ts`, `unit-conversion.ts` (the canonical helpers), `rules.ts`, `errors.ts`, `index.ts`. See `docs/sweeps/categories/domain/` for detail.
- **imports/** — `types.ts` (`ImportRow`, `ImportForm`, status + transport enums), `import-rules.ts` (`isImportDeleteBlocked`, FIFO rule `fifoReceivedAt = importEntry.createdAt`), `errors.ts`, `index.ts`. See `docs/sweeps/imports/domain/`.
- **inventory/** — `types.ts` (`InventoryRow` canonical shape with `warehouseId`, `isImported`, no `reservedStockCount`), `inventory-rules.ts` (`canAddCutLog`, delete-blocked, location-warehouse match), `formatters.ts` (incl. `formatFullLocationCode`), `diff-types.ts` (`InventoryRowsDiff`), `errors.ts`, `index.ts`. See `docs/sweeps/inventory/domain/`. **Unit-conversion does NOT live here** — it lives under categories.
- **cut-logs/** — `types.ts` (`CutLogRow`, status enum), `cut-log-rules.ts` (`before − cut = after` invariant, link-shape rule: `workOrderId → workOrderItemId required`), `diff-types.ts` (`CutLogsDiff` with parent-context: `{ kind: "inventory", id }` or `{ kind: "workOrderItem", id }`), `errors.ts`, `index.ts`. See `docs/sweeps/cut-logs/domain/`.

**Verification gate.** `@builders/domain` build clean. Zero business-logic references in downstream `@builders/application` pointing at module-local domain (everything should point at `@builders/domain`).

### Phase C — Data repositories (`packages/db/src/flooring/`)

Per module: `shared.ts` (selects + payload types + raw SQL for list-view aggregates), `read-repository.ts` (normalizers that feed domain helpers), `write-repository.ts` (writers + atomic-diff primitive), `index.ts`.

- **categories/** — `listCategories`, `getCategoryById`, `getCategoryBySlug`. Read-only. Normalizer expands all five UoM roles.
- **imports/** — `createImport`, `updateImport`, `deleteImportById`, `listImports`, `getImportById`, `getImportDetailById`, `getImportDeleteState`, `listImportOptions`, `applyImportInventoryRowsDiff(tx, input) → { rows, tempIdMap }`.
- **inventory/** — `createInventory`, `updateInventory`, `deleteInventoryById`, `listInventory` (scalar cut-log aggregates via `$queryRaw`), `getInventoryById`, `getInventoryDetailById` (relation-loads cut logs), `getInventoryDeleteState`, `listInventoryOptions`, `applyInventoryCutLogsDiff(tx, input) → { logs, tempIdMap }`. Read normalizers call the categories-domain helpers (`computePhysicalStock`, `computeAwaitingCutBalance`, `computeTotalCutBalance`, `computeAvailableCoverage`) — no arithmetic inside the normalizer itself.
- **cut-logs/** — `createCutLog`, `updateCutLog`, `deleteCutLogById`, `listCutLogsByInventory`, `getCutLogById`. No own atomic-diff primitive — cut logs are always applied through a parent's primitive (`applyInventoryCutLogsDiff` or future `applyWorkOrderMaterialItemsDiff`). **Cost normalizer** computes `cut × inventory.unitCost` on the fly; reads include inventory + product + category.

**Read-path pattern (carried from REFERENCE.md §Phase C):** list queries use scalar SQL aggregates (`SUM("cut")`, `SUM("cut") FILTER (WHERE status = 'PENDING')`, `SUM("cut") FILTER (WHERE status = 'FINAL')`) grouped by inventoryId. Detail queries relation-load cut-logs. Normalizers accept the scalars and call domain helpers.

**Verification gate.** `@builders/db` build clean. Reads return canonical records with computed fields populated.

### Phase D — Application use cases (`packages/application/src/flooring/`)

Each use case: validate via domain, resolve FKs via db reads, apply via db writes, re-read, return canonical.

- **imports/** — `create-import.ts`, `update-import.ts`, `delete-import.ts`, `save-inventory-rows.ts` (locks the parent import row; rejects if status `FINAL`; sets `fifoReceivedAt = import.createdAt` on new rows; sets `warehouseId` from import's warehouse; returns `{ importEntry, tempIdMap }`).
- **inventory/** — `create-inventory.ts`, `update-inventory.ts`, `delete-inventory.ts` (blocked if cut logs reference it), `save-cut-logs.ts` (locks inventory row + touched cut-log rows; loads **fresh** cut-log totals under lock via scalar aggregate — never a pre-lock snapshot; runs `computePhysicalStock ≥ 0` assertion; validates link-shape rule on each added cut log; sets defaults; applies; returns `{ inventory, tempIdMap }`).
- **cut-logs/** — no standalone use cases this sweep. Parent use cases consume cut-log domain rules + db helpers. If a standalone cut-log CRUD becomes needed later (e.g., inline edit from a list), it slots in here without disturbing parents.

**Verification gate.** `@builders/application` build clean. Every use case opens its own transaction. No HTTP imports. No direct Prisma.

### Phase E — Routes (`apps/web/app/api/`)

Per module: `_validators.ts` + section-split route files. Each mutation follows the standard lifecycle (route policy → envelope parse → expectedUpdatedAt → receipt → telemetry → use case → receipt finalize → response).

- **imports/**:
  - `_validators.ts`, `route.ts` (GET list + POST create), `[id]/primary/section/route.ts`, `[id]/inventory-rows/section/route.ts`, `[id]/route.ts` (DELETE), `options/route.ts`.
- **inventory/**:
  - `_validators.ts`, `route.ts`, `[id]/primary/section/route.ts`, `[id]/cut-logs/section/route.ts`, `[id]/route.ts`, `options/route.ts`.
- **cut-logs/**: no top-level routes. Mutations flow through parent section routes. **Delete** any existing `apps/web/app/api/cut-logs/*` tree.

**Rate-scope strings.** One per route: `imports.list`, `imports.create`, `imports.primary.section.replace`, `imports.inventory-rows.section.replace`, `imports.delete`, `inventory.*` mirrors.

**Verification gate.** Routes typecheck. Idempotency replay works (same `idempotencyKey` → same response, no double-write).

### Phase F — Module directory cleanup (`apps/web/modules/`)

Per module, collapse to the four-folder target. Order per module:

1. Move `record/create/**` → `components/record/create/` (or fold into `components/record/primary/` if it's primary-section UI; keep a dedicated `create/` section folder only if the creation flow has its own components).
2. Move `record/panel/sections/{section}.tsx` → `components/record/{section}/`.
3. Move `record/panel/controllers/use-{module}-{section}-section.ts` → `controllers/use-{module}-{section}-section.ts`.
4. Write `data/mutations.ts` — one helper per section-save route + create/delete. All wrap `withMutationMeta`. Delete `data/api.ts`.
5. Rewrite `data/queries.ts` — thin wrappers over `@builders/db` canonical reads. No Prisma imports.
6. Delete `application/`, `domain/`, `record/`, any root-level shims (`services.ts`, `summary.ts`, `api.ts`, `table-filters.ts` if duplicated in `@builders/domain`).

Per-module helper counts:

- **imports**: 4 mutations — `createImportRequest`, `updateImportRequest`, `deleteImportRequest`, `updateImportInventoryRowsRequest`.
- **inventory**: 4 mutations — `createInventoryRequest`, `updateInventoryRequest`, `deleteInventoryRequest`, `updateInventoryCutLogsRequest`.
- **cut-logs**: thin module. Keep shared render helpers only (cut-log row component rendered inside inventory's cut-logs-section, and later work-orders' items-section). No dashboard presence, no own routes. Delete everything not needed for shared render.

**Verification gate.** For each module: `find apps/web/modules/{module} -type f | sort` matches the four-folder layout. `grep -rn "@/modules/{module}/(domain|application|record)" apps/web` → zero.

### Phase G — Dashboard loader hardening (`apps/web/app/dashboard/`)

- **imports**: `page.tsx`, `[id]/page.tsx`, `new/page.tsx` — import only from `modules/imports/data/queries.ts`. Remove any direct Prisma. Remove server pagination in favor of the canonical load-all pattern (matches contacts / warehouses).
- **inventory**: same shape. No cross-module reconciliation needed — inventory knows its warehouse via `warehouseId` directly.
- **cut-logs**: no dashboard pages; remove stubs if present.

**Security rules** (loader-level):
- Every page runs behind the existing auth guard (matches other modules).
- No direct Prisma in any page file.
- No `@/modules/*/domain` or `@/modules/*/application` imports from any dashboard page.
- Page loaders use only canonical reads; if a computed field is needed for display it comes pre-computed from the normalizer, not recomputed in the page.

**Verification gate.** `npm run typecheck --workspace @builders/web` — error count drops significantly. Regression greps pass. Dev smoke flows complete (see "Smoke flows" below).

---

## Smoke flows (Phase G verification)

**Imports**: list → new (create with metadata only; redirect to detail using id from response, no refetch) → detail → primary save (record view stays open; reconciles inline) → add inventory rows (atomic diff with tempIds → real ids in response) → edit an inventory row's cost (modified diff) → delete a row (deleted diff) → attempt to delete an import with `status = FINAL` (blocked) → delete a non-final import with zero inventory rows (succeeds).

**Inventory**: list → new (standalone create; warehouse → location dropdown filtered to that warehouse) → detail → primary save → flip `isImported` to true → add cut logs via record-view cut-logs section → atomic diff blocked by `CUT_LOG_INVENTORY_NOT_IMPORTED` until `isImported = true` → edit a cut log (modified diff; `before − cut = after`; `cut ≤ startingStock − othersCutsCutTotal`) → flip a cut log to `FINAL` (status stores; `awaitingCutBalance` drops; `totalCutBalance` rises; `physicalStock` unchanged) → delete a cut log (deleted diff) → verify `physicalStock`, `availableCoverage`, `awaitingCutBalance`, `totalCutBalance` all recompute correctly (vinyl-plank: boxes × 23.77 sqft/box) → verify `W{n}-S{n}-R{n}-L{n}` location code renders → delete inventory (blocked if cut logs exist).

**Cut logs**: exercised via inventory's cut-logs section. Cost display shows `cut × inventory.unitCost` on each row. Standalone cut log (no WO link) saves cleanly. `{ inventoryId, workOrderId, workOrderItemId: null }` rejected.

---

## Cross-cutting rules (carried from REFERENCE.md)

- **Idempotency.** Every mutation carries an `idempotencyKey`; `enforceMutationReceipt` + `finalizeMutationReceipt` bracket the use case. Retrying the same key returns the prior response.
- **Transactional.** Use cases own `withDatabaseTransaction`. All DB writes inside one transaction. Fresh reads under locks, never pre-lock snapshots.
- **Rate limited.** Per-route scope string. Applied via `applyRoutePolicy`.
- **Route policy.** `applyRoutePolicy(toolSlug, scope)` is the entry gate for every API route.
- **Expected-updated-at.** Envelope-level against parent record for PATCH / DELETE. Per-row on every modified / deleted diff entry.
- **Canonical response.** Every write returns a canonical Record (or `{ parent, tempIdMap }` for atomic diffs). No refetch on any save path.

---

## End-state deletions (per module)

By the end of Phase F, these are gone:

- `apps/web/modules/imports/domain/`, `/application/`, `/record/`, `/data/api.ts`, root-level shim files.
- `apps/web/modules/inventory/domain/`, `/application/`, `/record/`, `/data/api.ts`, root-level shim files. `domain/formatters.ts` content migrates to `@builders/domain/flooring/inventory/formatters.ts`.
- `apps/web/modules/cut-logs/domain/`, `/application/`, `/data/api.ts`, record files. Keep only shared render helpers under `components/record/`.
- `apps/web/app/api/cut-logs/*` route tree (if any).

---

## Out-of-scope this sweep

- **Work orders.** Next sweep. Uses every pattern established here: section-per-route, narrow locks, atomic diff with nested cut-log children under material items, computed `fulfillmentStatus` via the categories unit-conversion helpers.
- **Allocation model removal.** Tracked in REFERENCE.md §Phase A — executed in the work-orders sweep unless it blocks a build here.
- **Cut-log status behavior beyond `PENDING` / `FINAL`** (e.g., locking `before`/`cut`/`after` on FINAL). Deferred.
- **`isImported` flip trigger.** Field + gate are wired this sweep; the *action* that flips it (manual toggle vs. receiving workflow) defaults to a per-row UI toggle on the inventory record view.
- **Retro-fitting earlier modules** (warehouses, products, contacts) to the new four-folder shape. Happens lazily, when those modules are next touched.
- **Categories / UoM editing.** Seeded, read-only.
- **Auto-allocation worker.** Deferred; queue infrastructure stays intact.

---

## Phase order — one-line summary

**Database → Domain → Data repositories → Application → Routes → Module cleanup → Dashboard loader hardening.** Each layer across all three modules before advancing. Each phase leaves a buildable workspace.
