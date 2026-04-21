# Sweep 2 — Phase E / F / G analysis + cut-logs architecture

Companion to `docs/sweeps/CURRENT.PLAN.md`. Phases A → D are green; this doc plots the remaining three phases of Sweep 2 plus the forward-looking cut-logs module decision.

---

## Where we are

| Phase | Status | Scope |
|---|---|---|
| A — DB migration | ✅ Shipped | `warehouseId`, `isImported`, drop `reservedStockCount` |
| B — Domain | ✅ Shipped | `packages/domain/src/flooring/inventory/` full set |
| C — Data | ✅ Shipped | `packages/db/src/flooring/inventory/` + `applyImportInventoryRowsDiff` |
| D — Application | ✅ Shipped | 3 inventory use cases + `saveImportInventoryRowsUseCase` |
| **E — Routes** | ⏭️ Next | This doc |
| **F — Module collapse** | ⏭️ | This doc |
| **G — Dashboard pages** | ⏭️ | This doc |

---

## Corrections to your Phase E summary

| Your statement | Verdict |
|---|---|
| Atomic save for import's inventory-rows lives in **imports API** (`apps/web/app/api/imports/[id]/inventory-rows/section/route.ts`). | ✅ Correct. Parent-context rule. |
| Inventory API has **1 DELETE + 1 PATCH**. | ✅ Correct for mutations on existing rows. `DELETE` lives under `[id]/route.ts`; `PATCH` under `[id]/primary/section/route.ts`. |
| "Creates are done through imports." | ⚠️ **Both paths exist.** Primary flow is the imports inventory-rows diff (adds rows into a specific import). But inventory also has a standalone `POST /api/inventory` for creating inventory rows **not** tied to any import (schema allows `importEntryId: null`; `createInventoryUseCase` supports this). Keep both — the standalone route is cheap and unlocks "I received material outside the normal import flow" workflows. |
| Inventory API also has **GET list, GET form options, GET detail**. | ✅ Correct. `route.ts` GET list + POST create, `options/route.ts` GET, `[id]/route.ts` GET detail + DELETE. |
| Routes follow the canonical gauntlet (auth → rate limit → mutation envelope → snapshot + expectedUpdatedAt → mutation receipt → telemetry + use case → finalize receipt → routeJson). | ✅ Exactly right. Lifecycle below. |
| Routes call use cases; use cases call domain + db; domain tells the data layer what to do. | ⚠️ Wording correction. **Routes** call use cases. **Use cases (application)** orchestrate: they import domain for rules, import data for I/O, own the transaction, and decide what happens and in what order. **Domain** is a pure library of allowed-state rules and formatters — imported for consultation, never invokes anything, never touches the DB. **Data** executes exactly what the use case asks for and returns normalized records. The flow of *control* is routes → application → data; the flow of *rules* is application pulling from domain as needed. See §"Layer responsibility model" below for the full direction map. |

**Imports POST create (`POST /api/imports`) — stays as-is.** That route creates import entries (the parent aggregate). It's Sweep-1 code, untouched by Sweep 2. Our new `saveImportInventoryRowsUseCase` is a separate route (PATCH section on an existing import). Confirmed: no regression risk to the imports create flow.

Your Phase F + G understanding is otherwise correct — laid out in full below.

---

## Layer responsibility model

Import direction (enforced by each package's `CLAUDE.md`):

```
routes              → application + (data for pure reads)
application         → domain + data
data                → (domain: pure helpers ONLY — Sweep-1 carve-out)
domain              → (nothing — zero outbound imports)
```

- **Domain** — pure rules. Zero imports from data or application. Never computes against real data, never issues a write. A library of `validate*`, `is*Blocked`, `describe*Issue`, `format*` functions that application consults. Enforced by `packages/domain/CLAUDE.md` rule 1.
- **Application** — the orchestrator. Imports domain for rules, data for I/O. Decides what happens: validate → existence-check → write → re-read → return canonical. Use cases own the transaction (`withDatabaseTransaction`). Enforced by `packages/application/CLAUDE.md` rule 5 ("Business rules are delegated to domain — use cases do not contain their own").
- **Data** — executor. Issues Prisma queries as told. No conditional rules, no invariant checks. Enforced by `packages/db/CLAUDE.md` rule 2.

### The one carve-out

`packages/db/CLAUDE.md` rule 1 has a Sweep-1 carve-out: **data-layer normalizers MAY import pure domain helpers** (formatters + pure computations), never rules that throw. Examples:

- `packages/db/src/flooring/imports/read-repository.ts:1` — imports `calculateImportSummary`, `buildFlooringProductDisplayName`
- `packages/db/src/flooring/inventory/read-repository.ts:1` — imports `formatFullLocationCode`

This is data *reusing* a pure utility so the same display string/math isn't re-implemented in both places. Domain is still a source of truth, not an actor. The helper has no side effects, no throws, no DB knowledge. Control flow still runs routes → application → data; rules flow from domain into application on demand.

---

## Phase E — Routes (plan)

### Canonical route lifecycle (from `apps/web/app/api/imports/**`)

**Query routes (GET):**
```
authorizeWarehouseRoute(request)
  → enforceQueryRateLimit(request, access, routePath)
  → <canonical db read>
  → routeJson(access, body)
```

**Mutation routes (POST/PATCH/DELETE):**
```
applyRoutePolicy(request, { toolSlug, rateLimit: { scope, limit, windowMs, route } })
  → parseMutationEnvelope(body, validator, { requireExpectedUpdatedAt?: boolean })
  → [PATCH/DELETE only] getXById(id) → assertExpectedUpdatedAt({ actual, expected, snapshot, message })
  → enforceMutationReceipt({ scope, request, access, mutation, body })
  → withMutationTelemetry(access, { message, action, route, entityType, entityId }, () => useCase(...))
  → finalizeMutationReceipt({ scope, access, mutation, responseStatus, responseBody })
  → routeJson(access, responseBody)
```

All helpers imported from `@/server/http/route-policy`, `@/server/http/route-helpers`, `@/modules/shared/access/domain-tools`, and `@/modules/shared/engines/common/application/mutation-telemetry`.

### Inventory routes — `apps/web/app/api/inventory/`

| File | Method(s) | Use case / read | Rate scope |
|---|---|---|---|
| `_validators.ts` | — | `validateCreateInventoryInput`, `validateUpdateInventoryInput` (throw `InventoryExecutionError("INVENTORY_VALIDATION_FAILED", 400)`) | — |
| `route.ts` | GET | `listInventory()` from `@builders/db` | query limit per `/api/inventory` |
| `route.ts` | POST | `createInventoryUseCase(input)` | `inventory.create` (50 / 10 min) |
| `options/route.ts` | GET | `getInventoryFormOptions()` from `modules/inventory/data/queries` | query limit per `/api/inventory/options` |
| `[id]/route.ts` | GET | `getInventoryDetailById(id)` | query limit per `/api/inventory/[id]` |
| `[id]/route.ts` | DELETE | `deleteInventoryUseCase(id)` (envelope requires `expectedUpdatedAt`) | `inventory.delete` (30 / 10 min) |
| `[id]/primary/section/route.ts` | PATCH | `updateInventoryUseCase(id, input)` (envelope requires `expectedUpdatedAt`) | `inventory.primary.section.replace` (50 / 10 min) |

**Response shapes:**
- `GET /api/inventory` → `{ inventory: InventoryRecord[] }`
- `POST /api/inventory` → `{ inventory: InventoryRecord }` (201)
- `GET /api/inventory/options` → `InventoryFormOptions` (unwrapped — matches imports' options convention)
- `GET /api/inventory/[id]` → `{ inventory: InventoryDetailRecord | null }`
- `DELETE /api/inventory/[id]` → `{ ok: true }`
- `PATCH /api/inventory/[id]/primary/section` → `{ inventory: InventoryRecord }`

### Imports extension — `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts`

| Method | Use case | Rate scope |
|---|---|---|
| PATCH | `saveImportInventoryRowsUseCase(id, diff)` (envelope requires `expectedUpdatedAt` on the parent import) | `imports.inventory-rows.section.replace` (50 / 10 min) |

**Response:** `{ import: ImportDetailRecord, tempIdMap: Record<string, string> }` — the full re-read parent aggregate plus the tempId→uuid map so the client can reconcile in place without a second fetch.

The validator lives in the existing `apps/web/app/api/imports/_validators.ts` — add `validateInventoryRowsDiff(body)` that shapes the raw JSON body into an `InventoryRowsDiff` (domain type) without applying business rules — the use case handles diff validation via `validateInventoryRowsDiff` from `@builders/domain`.

### Rate-scope registry

Add these scopes (used in `applyRoutePolicy` + `enforceMutationReceipt` + `finalizeMutationReceipt`):
- `inventory.create`
- `inventory.delete`
- `inventory.primary.section.replace`
- `imports.inventory-rows.section.replace`

All follow the existing naming convention (verified against `imports.create`, `imports.delete`, `imports.primary.section.replace` in the reference routes).

---

## Phase F — Module collapse (`apps/web/modules/inventory/`)

### Target shape (mirrors `apps/web/modules/imports/`)

```
apps/web/modules/inventory/
├── components/
│   ├── list/
│   │   ├── inventory-client.tsx         — list-view client wrapper
│   │   └── inventory-table.tsx          — table component
│   └── record/
│       ├── inventory-detail-client.tsx  — record-view client wrapper
│       ├── inventory-record-panel.tsx   — panel shell
│       └── sections/
│           ├── inventory-primary-section.tsx
│           └── inventory-cut-logs-section.tsx   (shell this sweep; wired in Sweep 3)
├── controllers/
│   ├── use-inventory-list-controller.ts
│   ├── use-inventory-primary-section.ts
│   └── use-inventory-cut-logs-section.ts        (shell this sweep; wired in Sweep 3)
└── data/
    ├── queries.ts                       — thin wrappers over @builders/db canonical reads (import for dashboard pages + options route)
    └── mutations.ts                     — client POST/PATCH/DELETE helpers (createInventoryRequest, updateInventoryRequest, deleteInventoryRequest, updateInventoryCutLogsRequest[shell])
```

### File moves (current → target)

Current layout (from actual repo inspection):
```
modules/inventory/
├── domain/                               ❌ DELETE — now in packages/domain/src/flooring/inventory/
│   ├── types.ts
│   ├── formatters.ts
│   └── filters.ts
├── application/                          ❌ DELETE — now in packages/application/src/flooring/inventory/
├── record/                               ❌ DELETE (folder) — contents move below
│   ├── detail/
│   │   └── inventory-detail-client.tsx   → components/record/inventory-detail-client.tsx
│   └── panel/
│       ├── controllers/                  → merged into controllers/
│       ├── inventory-record-panel.tsx    → components/record/inventory-record-panel.tsx
│       └── sections/                     → components/record/sections/
├── controllers/
│   └── use-inventory-list-controller.ts  ✅ already canonical
├── components/
│   ├── inventory-client.tsx              ❓ de-dup with components/list/inventory-client.tsx — pick one, delete the other
│   └── list/
│       ├── inventory-client.tsx          ✅ already canonical
│       └── inventory-table.tsx           ✅ already canonical
├── data/
│   └── api.ts                            ❌ DELETE — split into data/queries.ts + data/mutations.ts
├── queries.ts                            → data/queries.ts (the canonical location per CLAUDE.md)
└── table-filters.ts                      → components/list/table-filters.ts (list-scoped concern)
```

### Module-level regressions to clean during collapse

`apps/web/modules/inventory/data/api.ts` currently references stale schema fields (`reservedStockCount`, dropped `location.locationCode` column, `section.name`, etc.) — these surface as 20+ TS errors in today's web typecheck. Phase F **deletes** this file and rebuilds its functionality in `data/queries.ts` (reads) + `data/mutations.ts` (writes) against `@builders/db`. This alone knocks the web TS baseline down from 138 toward a much lower number.

Similarly, `modules/inventory/domain/types.ts` still has the `reservedStockCount`, `totalAllocated`, `unreservedTotal`, `availableToAllocate`, `runningBalance` fields on `InventoryRow`. Phase F deletes this file wholesale — all consumers re-import from `@builders/domain`.

### Api.ts shim note (your explicit ask)

Any module that still needs `api.ts` as a shim through the end of the current sweep can keep it temporarily. For **inventory**, we delete `api.ts` this sweep (it's the target of the collapse). For **cut-logs**, `modules/cut-logs/data/api.ts` doesn't exist today — it's already just `data/queries.ts`. Nothing to shim there. See §cut-logs below.

### Imports' inventory-rows controller rewrite

`apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` exists today but posts to a now-removed combined PATCH endpoint. Phase F rewires it to:
- Build an `InventoryRowsDiff` client-side from the editor state (added/modified/deleted arrays with `tempId`s and per-row `expectedUpdatedAt`)
- Call new `updateImportInventoryRowsRequest(importId, diff, revisionKey)` in `modules/imports/data/mutations.ts`
- On response, reconcile `tempIdMap` → real uuids in place; no refetch

---

## Phase G — Dashboard pages

### Target shape (`apps/web/app/dashboard/inventory/`)

```
apps/web/app/dashboard/inventory/
├── page.tsx                 — list page; imports from modules/inventory/data/queries only
├── new/page.tsx             — create page (if we keep standalone create UI)
└── [id]/page.tsx            — record page; imports from modules/inventory/data/queries only
```

### Rules

- `page.tsx` files are Server Components. They call `requireSessionUser()`, fetch initial data via `modules/inventory/data/queries.ts`, pass props to a client wrapper under `components/list/` or `components/record/`.
- **No direct Prisma imports.**
- **No imports from `@builders/domain` or `@builders/application`** — dashboard pages are thin SSR loaders only.
- Remove any existing server-side pagination in favor of canonical load-all (matches contacts / warehouses pattern per CURRENT.PLAN).
- `app/dashboard/imports/[id]/page.tsx` stays unchanged — it already consumes `ImportDetailRecord` which now includes the updated inventory rows.

---

## Cut-logs architecture — decision

> **Question:** Should cut-logs have its own routes and keep its own module directory, even though it doesn't have a list view page?

### Routes: **NO top-level cut-logs API routes.**

Cut-logs save through their **parent context** — never standalone. Per CURRENT.PLAN §"Cross-module use-case placement":

- Route location depends on where the save originates:
  - From **inventory record view** → `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` (Sweep 3)
  - From **work orders material-items editor** → nested inside the material-items section save (Sweep 4)
- Rationale: a cut-log's transactional boundary is always its parent (inventory row or work-order item). Letting a save originate from `/api/cut-logs/[id]` would break the `flooring_inventory` FOR UPDATE → `flooring_cut_log` lock order and invite deadlocks.
- There's no list view of cut-logs because cut-logs aren't a first-class entity users browse; they're a ledger attached to an inventory row.

### Module directory: **KEEP `apps/web/modules/cut-logs/` — thin, shared UI primitives only.**

Current state is already close to the right shape:
```
apps/web/modules/cut-logs/
├── components/
│   └── cut-logs-client.tsx           — presentational row/grid component (reused by inventory's cut-logs section; Sweep 4 reuses by work-orders' items section)
└── data/
    └── queries.ts                    — thin wrappers (e.g., list cut-logs for an inventory row)
```

**Why keep the folder:** The cut-log row component is used by **two** parent record views (inventory's cut-logs section now, work-orders' material-items section later). Co-locating in a neutral shared namespace avoids forcing one parent to own components the other needs.

**What does not live here:**
- No `controllers/` — save controllers live with their parent (`use-inventory-cut-logs-section.ts` under `modules/inventory/controllers/`, `use-work-order-material-items-section.ts` under `modules/work-orders/controllers/`).
- No `data/mutations.ts` — mutations are parent-scoped: `updateInventoryCutLogsRequest` lives in `modules/inventory/data/mutations.ts`; the work-orders equivalent in `modules/work-orders/data/mutations.ts`.
- No `components/list/` — no list view.
- No `components/record/` — no record view.

### Canonical layer folders: **YES — cut-logs gets full `@builders/*` presence (Sweep 3).**

- `packages/domain/src/flooring/cut-logs/` — types, `before − cut = after` invariant, `CutLogsDiff`, link-shape rules, errors. Pure. Reused by inventory + work-orders use cases.
- `packages/db/src/flooring/cut-logs/` — single-row CRUD (`createCutLog`, `updateCutLog`, `deleteCutLogById`, `getCutLogById`, `listCutLogsByInventory`). Atomic-diff primitive `applyInventoryCutLogsDiff` lives under inventory-db (parent-scoped).
- `packages/application/src/flooring/inventory/save-cut-logs.ts` — `saveInventoryCutLogsUseCase(inventoryId, diff)`. Lives under inventory-app because inventory is the parent of this save.

### Summary

| Concern | Location |
|---|---|
| Top-level API routes | **None.** Cut-log saves route through parent (`/api/inventory/[id]/cut-logs/section`, nested inside work-orders items save). |
| Web module folder | Keep `apps/web/modules/cut-logs/` — thin, only shared UI primitives + `data/queries.ts` helper. |
| Domain layer | `packages/domain/src/flooring/cut-logs/` (Sweep 3). |
| DB layer | `packages/db/src/flooring/cut-logs/` for single-row CRUD (Sweep 3). Diff primitive under the parent (inventory-db). |
| Application layer | Use case lives under the parent: `packages/application/src/flooring/inventory/save-cut-logs.ts` (Sweep 3). |

This mirrors the pattern we just executed for inventory's `saveImportInventoryRowsUseCase` — diff primitive + use case under the parent, not under the child's namespace.

---

## Critical files

### Phase E — new
- `apps/web/app/api/inventory/_validators.ts`
- `apps/web/app/api/inventory/route.ts`
- `apps/web/app/api/inventory/options/route.ts`
- `apps/web/app/api/inventory/[id]/route.ts`
- `apps/web/app/api/inventory/[id]/primary/section/route.ts`
- `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts`

### Phase E — modified
- `apps/web/app/api/imports/_validators.ts` — add `validateInventoryRowsDiff(body)` body shaper

### Phase F — new (client-facing)
- `apps/web/modules/inventory/components/record/inventory-detail-client.tsx` (moved)
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` (moved)
- `apps/web/modules/inventory/components/record/sections/inventory-primary-section.tsx` (moved)
- `apps/web/modules/inventory/components/record/sections/inventory-cut-logs-section.tsx` (shell)
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` (moved/new)
- `apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts` (shell)
- `apps/web/modules/inventory/data/queries.ts` (rewritten against `@builders/db`)
- `apps/web/modules/inventory/data/mutations.ts` (new)

### Phase F — deleted
- `apps/web/modules/inventory/domain/` (whole folder)
- `apps/web/modules/inventory/application/` (whole folder)
- `apps/web/modules/inventory/record/` (whole folder after moves)
- `apps/web/modules/inventory/data/api.ts`
- `apps/web/modules/inventory/queries.ts` (root-level — replaced by `data/queries.ts`)
- `apps/web/modules/inventory/table-filters.ts` (moved to `components/list/`)

### Phase F — modified
- `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` — rewrite from full-replace to atomic diff
- `apps/web/modules/imports/data/mutations.ts` — add `updateImportInventoryRowsRequest(importId, diff, revisionKey)`

### Phase G — new / rewritten
- `apps/web/app/dashboard/inventory/page.tsx`
- `apps/web/app/dashboard/inventory/[id]/page.tsx`
- `apps/web/app/dashboard/inventory/new/page.tsx` (if we keep standalone create UI)

---

## Verification gates (Phase E → G combined)

- `pnpm -F @builders/web typecheck` — expect substantial **drop** in error count (today 138; Phase F deletions should remove ≈20+ schema-stale errors from `modules/inventory/data/api.ts` + `modules/inventory/domain/types.ts`).
- Regression greps:
  - `grep -rn "@/modules/inventory/\(domain\|application\|record\)" apps/web` → zero
  - `grep -rn "reservedStockCount" apps/web/modules/inventory apps/web/tests` → zero
  - `grep -rn "from \"@/modules/inventory/data/api\"" apps/web` → zero
- Dev smoke:
  - **Inventory module:** list → new (warehouse → location dropdown filters correctly) → detail → primary save → delete blocks once cut logs exist (Sweep 3 will enable the other side)
  - **Imports' inventory-rows section:** on an import detail page, add rows (atomic diff with tempIds → real ids in response) → edit a cost (modified diff) → delete a row (deleted diff) → warehouse mismatch rejected → duplicate itemNumber at same location rejected → parent's `totalCost` updates correctly
  - **Cross-lock:** concurrent primary-section + inventory-rows saves on the same import serialize cleanly (both need `flooring_import_entry` FOR UPDATE)

---

## Open decisions flagged for you

1. **Standalone inventory create UI.** The API route `POST /api/inventory` stays per CURRENT.PLAN + existing `createInventoryUseCase`. But do we ship a **dashboard page** for it (`app/dashboard/inventory/new/page.tsx`) this sweep, or just the API and defer the UI? Lean: ship the page — the create path is already built end-to-end, no work saved by deferring.
- i think we keep this in and defer. we dont need to ship a dashboard page or create flow for a single inv item right now. this can stay out of scope, we will address this in the future.
2. **Table-filters file location.** Current `modules/inventory/table-filters.ts` — move to `components/list/table-filters.ts` (list-scoped) or `components/list/filters.tsx` (rename to match imports convention)? Lean: `components/list/table-filters.ts` (preserve filename, match canonical folder).
- whichever makes more sense. as long as its under components. 
3. **Cut-logs section shell depth.** In Phase F we scaffold `components/record/sections/inventory-cut-logs-section.tsx` + `controllers/use-inventory-cut-logs-section.ts` as empty shells. Do we render a read-only cut-logs grid now (using the data that's already computable since `status` is live), or truly empty until Sweep 3? Lean: read-only grid now — shows `totalCutBalance` + `awaitingCutBalance` + the cut-log list, no editing. Small lift, immediate user value.
- they dont need to be manually set to read only. definetly lets include the scaffolding. changing weather its editable or not wont make a difference because mutations likely aren't correct. i think that would be scope creep to do anything other than include the component and ui primitives for the cut log section of inventory.
- Confirm cut logs are not viewable by toggle of inventory row from imports record view.

