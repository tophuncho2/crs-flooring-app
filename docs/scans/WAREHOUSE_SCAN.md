# Warehouse Module Scan

Read-only audit. Every claim cites a file path; uncertainties are flagged. No changes made to source.

Reference points used:
- Module spec: `apps/web/modules/CLAUDE.md`
- Route spec: `apps/web/app/CLAUDE.md`
- Architecture docs: `docs/patterns/MODULE_ANATOMY.md`, `docs/patterns/REFERENCE_DATA.md`, `docs/execution/ROUTE_POLICY.md`, `docs/execution/ERROR_HANDLING.md`, `docs/cross-cutting/TRANSACTIONS.md`, `docs/cross-cutting/VALIDATION.md`, `docs/cross-cutting/TESTING.md`, `docs/engines/RECORD_VIEW_ENGINE.md`
- Reference modules: Manufacturers (single-section, hardened), Admin (hardened with domain/application/data split), Categories + Unit of Measures (reference data)

---

## Section 1 — Prisma Schema Inventory

Source: `packages/db/prisma/schema.prisma`. All warehouse-domain models live in a single schema file.

### 1.1 `FlooringWarehouse` (lines 455–469)

```prisma
model FlooringWarehouse {
  id         String                @id @default(uuid())
  name       String                @unique
  address    String?
  phone      String?
  createdAt  DateTime              @default(now())
  updatedAt  DateTime              @updatedAt
  imports    FlooringImportEntry[]
  sections   FlooringSection[]
  locations  FlooringLocation[]
  workOrders FlooringWorkOrder[]
  templates  FlooringTemplate[]

  @@map("flooring_warehouse")
}
```

- `@@map`: `flooring_warehouse`
- Fields: `id` (uuid), `name` (String **@unique**), `address` (String?), `phone` (String?), `createdAt`, `updatedAt`
- Constraints: `@unique` on `name` only — no `@@unique`, no `@@index`
- `createdAt` / `updatedAt`: present
- Slug / `nameNormalized`: **absent**
- Outgoing relations: `imports[]`, `sections[]`, `locations[]`, `workOrders[]`, `templates[]`

### 1.2 `FlooringSection` (lines 471–482)

```prisma
model FlooringSection {
  id          String             @id @default(uuid())
  warehouseId String
  warehouse   FlooringWarehouse  @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  name        String
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  locations   FlooringLocation[]

  @@unique([warehouseId, name])
  @@map("flooring_section")
}
```

- `@@map`: `flooring_section`
- Constraints: `@@unique([warehouseId, name])`
- `createdAt` / `updatedAt`: present
- Slug / normalized: **absent**
- Relations: `warehouse` (M:1, **onDelete: Cascade**); `locations[]` (1:M)

### 1.3 `FlooringLocation` (lines 484–498)

```prisma
model FlooringLocation {
  id           String              @id @default(uuid())
  warehouseId  String
  warehouse    FlooringWarehouse   @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  sectionId    String
  section      FlooringSection     @relation(fields: [sectionId], references: [id], onDelete: Restrict)
  locationCode String
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  inventories  FlooringInventory[]

  @@unique([warehouseId, locationCode])
  @@index([sectionId])
  @@map("flooring_location")
}
```

- `@@map`: `flooring_location`
- Constraints: `@@unique([warehouseId, locationCode])`, `@@index([sectionId])`
- `createdAt` / `updatedAt`: present
- Slug / normalized: **absent**
- Relations: `warehouse` (**onDelete: Cascade**), `section` (**onDelete: Restrict**), `inventories[]`
- **Note**: `warehouseId` is denormalized — also reachable via `section.warehouseId`. Application code (`apps/web/modules/warehouse/api.ts:250–259`, `ensureWarehouseSectionMatch`) enforces consistency.

### 1.4 Models with FK to Warehouse / Section / Location (FK only, not audited)

| Model | FK | Target | onDelete |
|---|---|---|---|
| `FlooringImportEntry` (lines 332–349) | `warehouseId` | `FlooringWarehouse` | `SetNull` (nullable FK) |
| `FlooringTemplate` (lines 372–399) | `warehouseId` | `FlooringWarehouse` | `SetNull` (nullable FK) |
| `FlooringWorkOrder` (lines 500–542) | `warehouseId` | `FlooringWarehouse` | `SetNull` (nullable FK) |
| `FlooringInventory` (lines 303–330) | `locationId` | `FlooringLocation` | `SetNull` (nullable FK) |

### 1.5 Cardinality

```
FlooringWarehouse  1—*  FlooringSection  1—*  FlooringLocation  1—*  FlooringInventory
                   1—*  FlooringLocation  (denormalized, also through Section)
                   1—*  FlooringWorkOrder | FlooringImportEntry | FlooringTemplate
```

Sections and Locations are **separate models**, not nested. `Warehouse.name` is `@unique`. No slug column on any of the three.

---

## Section 2 — File Tree Inventory

### 2.1 `apps/web/modules/warehouse/`

```
apps/web/modules/warehouse/
├── api.ts                                                       (415 lines) Prisma server-side mutations + queries; row normalizers; delete-blocking; section/warehouse match check
├── queries.ts                                                    (77 lines) Server-side page loaders (list + detail) wrapping prisma + withLoaderTiming + withPrismaConnectivityHandling
├── types.ts                                                      (90 lines) WarehouseRow / WarehouseDetail / WarehouseDraft type definitions
├── use-warehouse-client-controller.ts                            (71 lines) Client list-page controller (rows, createDraft, message, error, isCreating, isSaving)
├── use-warehouse-record-controller.ts                           (364 lines) Legacy detail controller — full CRUD for warehouse + sections + locations all in one hook
├── controllers/
│   ├── use-warehouse-list-controller.ts                          (1 line)  Re-export shim → `../use-warehouse-client-controller`
│   └── use-warehouse-record-controller.ts                        (1 line)  Re-export shim → `../use-warehouse-record-controller`
├── data/
│   ├── api.ts                                                    (1 line)  Re-export shim → `../api`
│   └── queries.ts                                                (1 line)  Re-export shim → `../queries`
├── domain/
│   └── types.ts                                                  (1 line)  Re-export shim → `../types`
├── components/
│   ├── warehouse-client.tsx                                    (101 lines) List-page client wrapper using list-view-engine
│   ├── warehouse-create-modal.tsx                               (66 lines) Modal form for creating warehouses (name/address/phone)
│   ├── warehouse-table.tsx                                      (61 lines) Table column config + grouped-rows rendering
│   └── list/
│       └── warehouse-client.tsx                                  (1 line)  Re-export shim → `../warehouse-client`
└── record/
    ├── create/
    │   └── warehouse-create-client.tsx                          (99 lines) Single-section create scaffold (RecordCreateClientScaffold)
    ├── detail/
    │   └── warehouse-detail-client.tsx                          (32 lines) Detail page scaffold wrapper
    └── panel/
        ├── warehouse-record-panel.tsx                          (137 lines) Multi-section detail panel (primary + sections-and-locations)
        ├── controllers/
        │   ├── use-warehouse-primary-section.ts                 (52 lines) Primary section controller (useSingleSectionRecordController wrapper)
        │   └── use-warehouse-sections-section.ts               (408 lines) Sections+locations section controller — all validation, CRUD, uniqueness checks live here
        └── sections/
            ├── warehouse-primary-fields-section.tsx            (103 lines) Primary fields form (name, phone, address)
            ├── warehouse-sections-section.tsx                  (166 lines) Sections grid with expandable nested locations
            └── warehouse-item-grid.ts                           (13 lines) Column layout specs for the section/location grids
```

Module total: 22 files, ~2,557 source lines (re-export shims excluded).

### 2.2 `apps/web/app/api/` (warehouses + sub-resources)

```
apps/web/app/api/warehouses/
├── route.ts                                                     (74 lines)
│   • GET    list warehouses (uses authorizeWarehouseRoute)
│   • POST   create warehouse (full mutation lifecycle)
└── [id]/
    └── route.ts                                                (154 lines)
        • GET    detail with sections + locations (uses authorizeWarehouseRoute)
        • PATCH  update + assertExpectedUpdatedAt + re-read; returns full snapshot
        • DELETE assertExpectedUpdatedAt + cascade-block check (in api.ts) + delete

apps/web/app/api/sections/
├── route.ts                                                     (79 lines)
│   • GET    list sections, optional ?warehouseId filter (applyRoutePolicy)
│   • POST   create section (full mutation lifecycle)
└── [id]/
    └── route.ts                                                (136 lines)
        • PATCH  update name (assertExpectedUpdatedAt; no re-read)
        • DELETE assertExpectedUpdatedAt + delete (cascade-block in api.ts)

apps/web/app/api/locations/
├── route.ts                                                     (79 lines)
│   • GET    list locations, optional ?warehouseId filter
│   • POST   create location (validates section belongs to warehouse)
└── [id]/
    └── route.ts                                                (136 lines)
        • PATCH  update locationCode/sectionId; re-validates section if changing
        • DELETE no blocking check on FlooringInventory (FK is SetNull)
```

Routes total: 6 files, 658 lines.

### 2.3 `apps/web/app/dashboard/warehouse/`

(Note: spelled **singular** `warehouse`, not `warehouses` — diverges from API path.)

```
apps/web/app/dashboard/warehouse/
├── page.tsx                                                     (43 lines) Server component → calls requireToolAccess("warehouse"), getResolvedUserTablePreference(user.id, "warehouse-main"), getWarehousePageData(); mounts <WarehouseClient>
├── new/
│   └── page.tsx                                                 (18 lines) Server component → requireToolAccess; mounts <WarehouseCreateClient>
└── [id]/
    └── page.tsx                                                 (47 lines) Server component → requireToolAccess + getWarehouseDetailPageData(id); mounts <WarehouseDetailClient>
```

### 2.4 `packages/domain/src/` — warehouse-related

**Absent as a dedicated module.** Warehouse appears only as a scoping concept in allocation domain:
- `packages/domain/src/allocation-compatibility.ts` (33 lines) — `assertWorkOrderAllocationCompatibility()` checks warehouse match between work order and inventory
- `packages/domain/src/auto-allocation-plan.ts` (~112 lines) — `WorkOrderAllocationCandidate` type carries `warehouseId`; FIFO planner filters by warehouse

No `packages/domain/src/flooring/warehouses/` directory exists.

### 2.5 `packages/application/src/` — warehouse-related

**Absent as a dedicated module.** Warehouse appears only as a denormalized field on allocation records:
- `packages/application/src/allocations/types.ts` (60 lines) — `InventoryAllocationOptionRecord` carries `warehouseId`, `warehouseName`
- `packages/application/src/allocations/mappers.ts` (128 lines) — maps inventory rows → allocation options, projecting warehouse fields
- `packages/application/src/allocations/process-auto-allocation-run.ts` (~230 lines) — uses warehouse only for candidate scoping
- `packages/application/src/allocations/apply-manual-allocation-change.ts`, `request-auto-allocation.ts`, `remove-allocation.ts`, `reconcile-allocation-statuses.ts` — warehouse only as guard/filter

No `packages/application/src/flooring/warehouses/` directory exists. **No warehouse use cases** (no `create-warehouse.ts`, `update-warehouse.ts`, `delete-warehouse.ts`, no equivalents for sections or locations).

### 2.6 `packages/db/src/` — warehouse-related

**Absent as a dedicated module.** Warehouse data access is embedded in:
- `packages/db/src/allocations/read-repository.ts` (417 lines) — `getWorkOrderItemAllocationContext`, `getInventoryAllocationContext`, `getInventoryAllocationCandidatesByProductId` (filter by warehouseId)
- `packages/db/src/allocations/shared.ts` (230 lines) — `inventoryAllocationCandidateQuery` projects warehouse name + location

**No `packages/db/src/flooring/warehouses/` directory.** No `read-repository.ts`, no `write-repository.ts`. Warehouse / section / location persistence happens entirely via direct Prisma calls in `apps/web/modules/warehouse/api.ts`. **No warehouse export from `packages/db/src/index.ts`** (verified — only categories, contacts, manufacturers, services, unit-of-measures, allocations, admin, outbox are exported).

### 2.7 `apps/web/tests/` — warehouse-related

```
apps/web/tests/modules/warehouse/
├── warehouse-client.test.tsx       (214 lines)   6 tests — UI component tests for WarehouseClient + WarehouseDetailClient; mocks fetch globally
├── warehouse-locations.test.ts     (361 lines)  11 tests — route tests for /api/locations and /api/locations/[id]; mocks @builders/db (prisma) + route helpers
└── warehouse-sections.test.ts      (264 lines)   9 tests — route tests for /api/sections and /api/sections/[id]; same mock pattern as locations

(Total: 3 files, 839 lines, 26 tests)
```

No tests cover `/api/warehouses/route.ts` or `/api/warehouses/[id]/route.ts` directly. (`apps/web/tests/server/http/route-policy-parity.test.ts` references `authorizeWarehouseRouteMock` but that's a parity check on the auth helper, not a warehouse route test.)

---

## Section 3 — Deviation Report Against MODULE_ANATOMY + apps/web/modules/CLAUDE.md

`apps/web/modules/CLAUDE.md` requires: `controllers/`, `data/` with `server-records.ts` + `server-mutations.ts`, `components/list/`, `components/record/`, `transport/`, `views/` (optional). Naming: `use-{name}-list-controller.ts`, `use-{name}-primary-controller.ts`, `use-{name}-{section}-controller.ts`. No `domain/`. No use cases inside the module. Business rules in `packages/domain/`, use cases in `packages/application/`, persistence in `packages/db/`.

### Required-folder check

| Required | Status | Evidence |
|---|---|---|
| `controllers/` | **PARTIAL** — directory exists with two 1-line re-export shims; real controllers live at module root (`use-warehouse-client-controller.ts`, `use-warehouse-record-controller.ts`) and inside `record/panel/controllers/` | `apps/web/modules/warehouse/controllers/use-warehouse-list-controller.ts` (1 line), `controllers/use-warehouse-record-controller.ts` (1 line); real files at module root |
| `data/server-records.ts` | **FAIL** — absent | No file exists |
| `data/server-mutations.ts` | **FAIL** — absent | No file exists; mutations in `apps/web/modules/warehouse/api.ts` |
| `data/queries.ts` | **PARTIAL** — exists as 1-line re-export of `../queries.ts` | `apps/web/modules/warehouse/data/queries.ts` |
| `components/list/` | **PARTIAL** — exists with one 1-line re-export shim; real list code in `components/` (not `components/list/`) | `apps/web/modules/warehouse/components/list/warehouse-client.tsx` (1 line) → `../warehouse-client.tsx` |
| `components/record/` | **FAIL** — absent. Record-view code lives under `record/` (sibling to `components/`) instead | `apps/web/modules/warehouse/record/{create,detail,panel}/` |
| `transport/` | **FAIL** — absent | No directory |
| `views/` | N/A — optional |  |

### Forbidden-content check

| Forbidden | Status | Evidence |
|---|---|---|
| `domain/` inside module | **FAIL** — exists | `apps/web/modules/warehouse/domain/types.ts` (1 line) |
| Use cases inside module | **FAIL** — `api.ts` is effectively a use-case file (createWarehouseRow, updateWarehouseRow, deleteWarehouseRow with delete-blocking; createSectionRow, updateSectionRow, deleteSectionRow with delete-blocking; createLocationRow, updateLocationRow, deleteLocationRow with section-warehouse match validation) | `apps/web/modules/warehouse/api.ts:58–345` |
| Direct Prisma in module | **FAIL** — `api.ts:1` imports `prisma` from `@builders/db` and calls it directly | `apps/web/modules/warehouse/api.ts:1, 49, 58, 71, 87, 158, 173, 190, 207, 234, 261, 286, 323, 367` |
| Business rules in module | **FAIL** — delete-blocking, uniqueness validation, section-warehouse match all live in module | `api.ts:106–116` (warehouse delete blocks), `api.ts:221–223` (section delete blocks), `api.ts:250–259` (ensureWarehouseSectionMatch), `record/panel/controllers/use-warehouse-sections-section.ts:85–129` (client-side uniqueness) |

### Route-structure check

| Required | Status | Evidence |
|---|---|---|
| `/dashboard/warehouses` | **FAIL** — uses singular `/dashboard/warehouse` instead | `apps/web/app/dashboard/warehouse/page.tsx` |
| `/dashboard/warehouses/[id]` | **FAIL** — `/dashboard/warehouse/[id]` (singular) | `apps/web/app/dashboard/warehouse/[id]/page.tsx` |
| `/dashboard/warehouses/new` | **FAIL** — `/dashboard/warehouse/new` (singular) | `apps/web/app/dashboard/warehouse/new/page.tsx` |
| `/api/warehouses`, `/api/warehouses/[id]` | **PASS** — plural API path | `apps/web/app/api/warehouses/route.ts`, `[id]/route.ts` |
| Per-section + per-sub-resource routes | **PARTIAL** — sub-resources are at top level, not nested under warehouse | `/api/sections/`, `/api/sections/[id]/`, `/api/locations/`, `/api/locations/[id]/` (no `/api/warehouses/[id]/sections/[sectionId]/locations/[locationId]/...` nesting) |

**Naming inconsistency:** dashboard uses singular `warehouse/`, API uses plural `warehouses/`. No other module in the codebase uses singular dashboard paths (manufacturers, admin, categories, products all use plural).

### The 18 specific issues

**1. `domain/` exists inside `modules/warehouse/`** — **FAIL**
Files: `apps/web/modules/warehouse/domain/types.ts` (1 line) — re-exports `../types`. Single file, content is a one-line re-export.

**2. `modules/warehouse/record/` structure** — **DEVIATION**
Structure: `record/create/warehouse-create-client.tsx`, `record/detail/warehouse-detail-client.tsx`, `record/panel/warehouse-record-panel.tsx`, `record/panel/controllers/{use-warehouse-primary-section.ts, use-warehouse-sections-section.ts}`, `record/panel/sections/{warehouse-primary-fields-section.tsx, warehouse-sections-section.tsx, warehouse-item-grid.ts}`.
Deviation from spec: spec says detail + section forms live under `components/record/`. Warehouse instead splits into `record/create/`, `record/detail/`, `record/panel/`. Section controllers are nested under `record/panel/controllers/` rather than the module's top-level `controllers/`. Manufacturers (the closest hardened template) puts everything under `components/record/` (manufacturer-detail-client.tsx, manufacturer-record-panel.tsx, manufacturer-primary-fields-section.tsx, manufacturer-create-client.tsx) and section controllers under `controller/`.

**3. Use cases inside the module** — **FAIL**
Server-side use-case-equivalent functions in `apps/web/modules/warehouse/api.ts`:
- `createWarehouseRow` (lines 58–69)
- `updateWarehouseRow` (lines 71–85)
- `deleteWarehouseRow` (lines 87–126) — includes 3 delete-blocking rules
- `createSectionRow` (lines 173–188)
- `updateSectionRow` (lines 190–205)
- `deleteSectionRow` (lines 207–232) — delete-blocking on locations
- `createLocationRow` (lines 261–284) — calls `ensureWarehouseSectionMatch`
- `updateLocationRow` (lines 286–321) — calls `ensureWarehouseSectionMatch` if section changes
- `deleteLocationRow` (lines 323–345)

Client-side use-case-equivalents inside controllers:
- `apps/web/modules/warehouse/use-warehouse-record-controller.ts:364 lines` — owns `saveWarehouse`, `addSection`, `saveSection`, `deleteSection`, `addLocation`, `saveLocation`, `deleteLocation`
- `apps/web/modules/warehouse/record/panel/controllers/use-warehouse-sections-section.ts:408 lines` — owns batch save with full validation pipeline

**4. Canonical read/write repo in `packages/db/`** — **FAIL** (absent)
No `packages/db/src/flooring/warehouses/` directory. No `read-repository.ts`, no `write-repository.ts`. `packages/db/src/index.ts` does not export warehouse functions.

**5. Validators file per section route** — **FAIL** (absent)
No `_validators.ts` file in `apps/web/app/api/warehouses/`, `/api/sections/`, or `/api/locations/`. (Compare manufacturers which has `apps/web/app/api/manufacturers/_validators.ts` colocated with the route.) Validation is inline via `parseRequiredString` / `parseOptionalString` calls inside `apps/web/modules/warehouse/api.ts`.

**6. Routing for section and location adds** — **DEVIATION**
- Sections live at `/api/sections/` and `/api/sections/[id]/` (top-level, not nested under warehouse)
- Locations live at `/api/locations/` and `/api/locations/[id]/` (top-level, not nested)
- No `/api/warehouses/[id]/sections/route.ts` or `/api/warehouses/[id]/sections/[sectionId]/locations/route.ts`
- Filtering by warehouse uses query string (`?warehouseId=…` parsed via `parseWarehouseFilter` in `api.ts:363`)
- Manufacturers uses `apps/web/app/api/manufacturers/[id]/primary/section/route.ts` for the primary section PATCH split — warehouse does not split PATCH this way

**7. `withDatabaseTransaction` usage** — **FAIL**
Grep for `withDatabaseTransaction` returns zero matches inside `apps/web/modules/warehouse/api.ts` and zero inside `apps/web/app/api/{warehouses,sections,locations}/`. None of the multi-step write paths wrap in a transaction. Examples that should but don't:
- `deleteWarehouseRow` (api.ts:87–126): findUnique → 3 conditional throws → delete (would race against a concurrent insert of a section/location)
- `deleteSectionRow` (api.ts:207–232): findUnique → throw → delete (would race against location insert)
- `createLocationRow` (api.ts:261–284): ensureWarehouseSectionMatch (findUnique) → create (would race against section delete)
- `updateLocationRow` (api.ts:286–321): findUnique existing → ensureWarehouseSectionMatch → update (TOCTOU)

`api.ts` functions accept an optional `db: DbClient = prisma` parameter, where `DbClient = Prisma.TransactionClient | PrismaClient` (line 5) — i.e., the propagation slot exists but no caller uses it.

**8. Re-read after mutation** — **PARTIAL**
- `/api/warehouses/[id]/route.ts` PATCH: **YES** — re-reads via `getWarehouseDetailRow(id)` at line 79, returns snapshot (line 80). Also re-reads pre-mutation at line 50 for `assertExpectedUpdatedAt`.
- `/api/warehouses/[id]/route.ts` DELETE: returns `{ ok: true }` only (line 142) — no re-read needed.
- `/api/warehouses/route.ts` POST: returns the freshly-created row from `createWarehouseRow` (line 59); no re-read but the create select includes `_count`.
- `/api/sections/route.ts` POST and `/api/sections/[id]/route.ts` PATCH: return mutation result directly, **no re-read** of the warehouse detail.
- `/api/locations/route.ts` POST and `/api/locations/[id]/route.ts` PATCH: same — no re-read of containing warehouse.

Net effect: when a section or location is added/edited/deleted, the warehouse record-view consumer must re-fetch the parent warehouse to see the new sections/locations array.

**9. Current warehouse test files** — see Section 6.

**10. `data/queries.ts` matches the Manufacturers re-export pattern?** — **NO**
Manufacturers (`apps/web/modules/manufacturers/data/queries.ts`):
```
import { ..., getManufacturerById, ..., listManufacturers, ..., type ManufacturerRecord, ... } from "@builders/db"
export { listManufacturers, getManufacturerById }
export async function getManufacturersPageData() { return withPrismaConnectivityHandling(() => listManufacturers()) }
```
Warehouse (`apps/web/modules/warehouse/data/queries.ts`): `export * from "../queries"` — a 1-line re-export of `apps/web/modules/warehouse/queries.ts`, which calls `prisma.flooringWarehouse.findMany(...)` directly (queries.ts:7) rather than calling a `@builders/db` function (because no such function exists — see issue 4).

**11. Application orchestrates / data persists — are business rules in routes / use cases / domain?** — **OFFENDERS:**
- `apps/web/modules/warehouse/api.ts:106–116` — three delete-blocking rules for warehouse (workOrders, locations, sections counts) live in the module
- `apps/web/modules/warehouse/api.ts:221–223` — section delete-blocking on locations count
- `apps/web/modules/warehouse/api.ts:250–259` — `ensureWarehouseSectionMatch` business invariant
- `apps/web/modules/warehouse/api.ts:177, 194, 263, 289` — `.trim()` on name/locationCode (canonicalization rule embedded in DB layer)
- `apps/web/modules/warehouse/record/panel/controllers/use-warehouse-sections-section.ts:85–129` — uniqueness rules ("Section names must be unique", "Location codes must be unique per section") implemented client-side only
- `apps/web/modules/warehouse/record/create/warehouse-create-client.tsx:43–49` — "Warehouse name is required" validation in the client component

None of these rules live in `packages/domain/` or `packages/application/`.

**12. API route thinness — line counts and route-level Prisma/business logic**

| Route | Lines | Prisma direct? | Business logic? | Error classification? |
|---|---|---|---|---|
| `apps/web/app/api/warehouses/route.ts` | 74 | No (delegates to api.ts) | No (delegates) | Generic `routeError` |
| `apps/web/app/api/warehouses/[id]/route.ts` | **154** | No (delegates) | No (delegates) | Generic `routeError` |
| `apps/web/app/api/sections/route.ts` | 79 | No (delegates) | No | Generic `routeError` |
| `apps/web/app/api/sections/[id]/route.ts` | **136** | No (delegates) | No | Generic `routeError` |
| `apps/web/app/api/locations/route.ts` | 79 | No (delegates) | No | Generic `routeError` |
| `apps/web/app/api/locations/[id]/route.ts` | **136** | No (delegates) | No | Generic `routeError` |

5 of 6 routes exceed 60 lines (the audit threshold). The bulk is the inlined mutation-lifecycle scaffolding (`applyRoutePolicy` → `assertExpectedUpdatedAt` → `parseMutationEnvelope` → `enforceMutationReceipt` → `withMutationTelemetry` → `finalizeMutationReceipt` → `routeJson`), not business logic. The bloat is structural, not symptomatic of misplaced logic in the routes themselves — although `[id]/route.ts` files do still embed the lifecycle three times (one per HTTP method) instead of splitting into `[id]/primary/section/route.ts` like manufacturers.

**13. Error types** — **FAIL** (absent)
Grep for `WarehouseExecutionError` or `WarehouseErrorCode` returns zero matches anywhere in the codebase. Server-side errors are constructed via `createAppError("...", { status: 4xx })` from `@/server/http/api-helpers` (`api.ts:103, 107, 111, 115, 218, 222, 257, 298, 334, 407`). Client-side errors use `createRecordSectionError({ kind: "validation", message, retryable })` from the shared engine.

Compare hardened pattern from `packages/application/src/flooring/manufacturers/errors.ts`:
```
export type ManufacturerErrorCode =
  | "MANUFACTURER_NAME_CONFLICT"
  | "MANUFACTURER_NOT_FOUND"
  | "MANUFACTURER_IN_USE"
  | "MANUFACTURER_VALIDATION_FAILED"

export class ManufacturerExecutionError extends Error {
  readonly code: ManufacturerErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>
  ...
}
```

**14. Warehouse name uniqueness** — **PARTIAL**
- `Warehouse.name` is `@unique` at the DB layer (schema.prisma:457).
- No `nameNormalized` / slug column.
- No application-level uniqueness check (would surface the right field/message); a duplicate name fails on the Prisma unique constraint and is caught only as a generic error in `routeError`. There is no `MANUFACTURER_NAME_CONFLICT`-style mapping.
- Comparison: `FlooringSection` enforces `@@unique([warehouseId, name])` (DB only — no app message); `FlooringLocation` enforces `@@unique([warehouseId, locationCode])` (DB only).
- Client-side uniqueness checks exist only inside `record/panel/controllers/use-warehouse-sections-section.ts:91–129` (case-insensitive `toLowerCase()` comparison) for sections + locations, but only at save time and only against the in-memory draft set.

**15. Stale `authorizeWarehouseRoute` legacy helper — call sites**
Grep results across the repo:
- `apps/web/modules/shared/access/domain-tools.ts:59` — definition
- `apps/web/app/api/warehouses/route.ts:2, 14` — used by GET
- `apps/web/app/api/warehouses/[id]/route.ts:2, 17` — used by GET
- `apps/web/app/api/cut-logs/route.ts:1, 14` — non-warehouse usage (cut-logs reads warehouse-scoped data)
- `apps/web/app/api/imports/route.ts:3, 9` — non-warehouse usage
- `apps/web/app/api/imports/[id]/route.ts:3, 13` — non-warehouse usage
- `apps/web/app/api/imports/options/route.ts:2, 7` — non-warehouse usage
- `apps/web/tests/server/http/route-policy-parity.test.ts:4, 10, 34, 75` — test mock

**Inconsistency**: `/api/warehouses/*` routes use the legacy `authorizeWarehouseRoute` helper for GET; `/api/sections/*` and `/api/locations/*` use `applyRoutePolicy(...)` directly. Both eventually go through the same enforcement, but the two patterns coexist in the same module's route surface.

**16. Inline parsing vs `parseRequiredString` helpers** — **HELPER STYLE (consistent with admin)**
`apps/web/modules/warehouse/api.ts` uses the helpers throughout:
- `parseRequiredString(body.name, "name")` — api.ts:61, 74, 176, 177, 194, 262, 263, 264, 289, 290
- `parseOptionalString(body.address)` — api.ts:62, 63, 75, 76, 364

This matches the admin style (`apps/web/app/api/admin/users/route.ts:17–28` uses `parseRequiredString`) rather than the manufacturers inline-coercion style (`apps/web/app/api/manufacturers/_validators.ts` uses `typeof body.x === "string" ? body.x.trim() : ""` and throws `ManufacturerExecutionError`). Warehouse has no `WarehouseExecutionError` (issue 13) — it throws generic `AppError` via the helpers.

**17. Pass-through wrappers in `modules/warehouse/data/queries.ts`** — **PARTIAL (different problem)**
`data/queries.ts` (1 line): `export * from "../queries"` — single re-export of the sibling `queries.ts`.
`data/api.ts` (1 line): `export * from "../api"` — re-export of the sibling `api.ts`.
`controllers/use-warehouse-list-controller.ts` (1 line): re-export of `../use-warehouse-client-controller`.
`controllers/use-warehouse-record-controller.ts` (1 line): re-export of `../use-warehouse-record-controller`.
`domain/types.ts` (1 line): re-export of `../types`.
`components/list/warehouse-client.tsx` (1 line): re-export of `../warehouse-client`.

The wrappers are not the manufacturers-style "rename a `@builders/db` export under a module name" — they are organizational shims that put the spec-required folder names in place over a flat module body. The actual queries (`apps/web/modules/warehouse/queries.ts`) call `prisma` directly rather than calling a `@builders/db` function (because no such function exists — see issue 4).

**18. PATCH split vs combined** — **COMBINED**
`apps/web/app/api/warehouses/[id]/route.ts` exports `GET` (line 16), `PATCH` (line 31), and `DELETE` (line 94) in the same file. There is **no** `[id]/primary/section/route.ts`. Manufacturers, by contrast, splits PATCH into `apps/web/app/api/manufacturers/[id]/primary/section/route.ts` and keeps GET + DELETE in `[id]/route.ts`.

---

## Section 4 — Record View Structure (Two Sections + Sub-Resources)

**Number of sections.** Two top-level record-view sections, both rendered inside `record/panel/warehouse-record-panel.tsx` (137 lines):
1. **Primary** — name / address / phone (`record/panel/sections/warehouse-primary-fields-section.tsx`, 103 lines), driven by `use-warehouse-primary-section.ts` (52 lines), which wraps `useSingleSectionRecordController<WarehouseDetail, WarehouseDraft>`.
2. **Sections-and-locations** — a single section that contains a grid of sections plus an expandable per-section grid of locations (`record/panel/sections/warehouse-sections-section.tsx`, 166 lines), driven by `use-warehouse-sections-section.ts` (408 lines), which wraps `useRecordScopedSectionController<WarehouseDetail, WarehouseSectionsLocalState>`.

The sections-and-locations section is **one record-view section in engine terms**, but it owns CRUD for two child resources (sections + locations) at once, with a single batch save.

**Sections / locations rendering.** Rendered **inside the warehouse record view**, not as separate pages. The `record/panel/sections/warehouse-sections-section.tsx` renders the sections grid (rows per `FlooringSection`); each row is expandable to show a sub-grid of `FlooringLocation` rows belonging to that section.

**Add / edit / delete UI.** All inline within the section grid:
- Adding a section / location appends a draft row to local state.
- Editing happens in cells of the grid.
- Deleting marks the row for removal in local state.
- Save is a batch operation: the section controller validates the entire local state, then issues per-row HTTP calls to the appropriate sub-resource routes (`/api/sections`, `/api/sections/[id]`, `/api/locations`, `/api/locations/[id]`) as a sequence.
- There are **no separate routes** like `/dashboard/warehouse/[id]/sections/new`; sections and locations are not separately navigable.

The legacy `apps/web/modules/warehouse/use-warehouse-record-controller.ts` (364 lines) is a parallel **non-engine-based** controller exposing `addSection`, `saveSection`, `deleteSection`, `addLocation`, `saveLocation`, `deleteLocation` directly — uncertain whether this is still wired into the UI; it may be dead code from an earlier iteration. Need user input to confirm.

**Controller-state ownership.**
- `use-warehouse-primary-section.ts` (52 lines) — owns the primary section's dirty / saving / conflict / error state via the engine.
- `use-warehouse-sections-section.ts` (408 lines) — owns local `sections[]`, `locations[]`, draft tracking, dirty state, validation errors, batch-save coordination across multiple HTTP endpoints.
- `use-warehouse-client-controller.ts` (71 lines) — list-page state (rows, createDraft, message, error, isCreating, isSaving).
- `use-warehouse-record-controller.ts` (364 lines, **non-engine**) — full CRUD over warehouse + sections + locations as one hook; appears to predate the engine refactor.

**Engine alignment.** The two new section controllers (`use-warehouse-primary-section.ts`, `use-warehouse-sections-section.ts`) wrap `useSingleSectionRecordController` and `useRecordScopedSectionController` from `modules/shared/engines/record-view/`. The legacy `use-warehouse-record-controller.ts` does not use the engine at all. Per `docs/engines/RECORD_VIEW_ENGINE.md`, every record section should use `useRecordSectionController` — primary section meets this; sections-and-locations uses the engine but stuffs two child resources into one section, which is a custom shape.

**Draft state for new sections / locations.** Yes — the sections section controller (`use-warehouse-sections-section.ts:408 lines`) maintains in-memory drafts for new section / location rows before the batch save fires. The `addSection` / `addLocation` flows append to local state without an immediate POST.

**Section-with-linked-locations deletion.** Server enforces it: `apps/web/modules/warehouse/api.ts:221–223`:
```
if (section._count.locations > 0) {
  throw createAppError("Section cannot be deleted while locations are linked to it", { status: 409 })
}
```
Reinforced at the schema level: `FlooringLocation.section` uses `onDelete: Restrict` (schema.prisma:489). Client-side, the batch-save flow issues DELETE for sections after DELETE for locations, but the controller does not pre-check or block the user from queuing a section delete that still has locations — uncertain whether the UI surfaces the 409 cleanly to the user. Need user input.

---

## Section 5 — Existing Business Rules Inventory

| # | Rule | Current location | Target layer |
|---|---|---|---|
| 1 | Warehouse delete blocked when any `workOrders > 0` | `apps/web/modules/warehouse/api.ts:106–108` | Application use case (orchestration) + DB FK choice (currently `SetNull` on FlooringWorkOrder.warehouseId — schema.prisma:540 — so the rule is application-only and the DB would happily nullify on delete) |
| 2 | Warehouse delete blocked when any `locations > 0` | `apps/web/modules/warehouse/api.ts:110–112` | Same — DB FK is `Cascade` on FlooringLocation.warehouseId, so without the app check a delete would cascade-wipe locations + their inventory FKs (which are `SetNull`) |
| 3 | Warehouse delete blocked when any `sections > 0` | `apps/web/modules/warehouse/api.ts:114–116` | Same — DB FK is `Cascade` on FlooringSection.warehouseId |
| 4 | Section delete blocked when any `locations > 0` | `apps/web/modules/warehouse/api.ts:221–223` | Application use case + already enforced by `onDelete: Restrict` at schema.prisma:489 (so DB will error too — app provides the friendly message) |
| 5 | Location delete — **no blocking** | `apps/web/modules/warehouse/api.ts:323–345` (no precondition) | Open question — should it be blocked when `inventories > 0`? Current FK is `SetNull` on FlooringInventory.locationId (schema.prisma:~329), so deleting a location silently nullifies inventory location pointers |
| 6 | Section name uniqueness within warehouse | DB-level `@@unique([warehouseId, name])` (schema.prisma:480); also client-side case-insensitive in `record/panel/controllers/use-warehouse-sections-section.ts:91–101` | Domain predicate (case rule) + DB constraint + Application classification of conflict |
| 7 | Location code uniqueness within warehouse | DB-level `@@unique([warehouseId, locationCode])` (schema.prisma:496); also client-side case-insensitive in `use-warehouse-sections-section.ts:108–129` | Domain predicate + DB constraint + Application |
| 8 | Warehouse name uniqueness | DB-level `@unique` on name (schema.prisma:457); no app-level pre-check or friendly mapping | Application use case (catch P2002 → friendly message via `WarehouseExecutionError`) |
| 9 | `ensureWarehouseSectionMatch` invariant — section must belong to warehouse | `apps/web/modules/warehouse/api.ts:250–259`; called by `createLocationRow` and `updateLocationRow` | Domain invariant (the rule itself is pure: `section.warehouseId === warehouseId`) — currently enforced only via a pre-read DB query inside the data-layer file |
| 10 | Section name `.trim()` canonicalization | `apps/web/modules/warehouse/api.ts:177, 194` | Domain predicate / canonicalizer |
| 11 | Location code `.trim()` canonicalization | `apps/web/modules/warehouse/api.ts:263, 289` | Domain predicate / canonicalizer |
| 12 | Section name "is required" | client `record/panel/controllers/use-warehouse-sections-section.ts:85–90`; server enforces only via `parseRequiredString("name")` | Domain validator + Application use case |
| 13 | Location code "is required" + section "is required" for each row | client `use-warehouse-sections-section.ts:103–107` | Domain validator + Application use case |
| 14 | Warehouse name "is required" | client `apps/web/modules/warehouse/use-warehouse-client-controller.ts:25–28`; client `record/create/warehouse-create-client.tsx:43–49`; server `parseRequiredString("name")` in `api.ts:61, 74` | Domain validator + Application use case |
| 15 | Optimistic lock on warehouse update / delete (`assertExpectedUpdatedAt`) | `apps/web/app/api/warehouses/[id]/route.ts:51–56, 114–119` | Route-level (correct location — already aligned) |
| 16 | Optimistic lock on section / location update / delete | `apps/web/app/api/sections/[id]/route.ts:34–39, ~96–101`; `apps/web/app/api/locations/[id]/route.ts:34–39, ~96–101` | Route-level (correct) |
| 17 | No status / lifecycle rules surfaced | — | N/A |
| 18 | No cascading update rules surfaced | — | N/A |
| 19 | No "default warehouse" preference rules surfaced; no "section preferences" | Search returned only `"warehouse-main"` (a table-preference key in `apps/web/app/dashboard/warehouse/page.tsx:13`), not a default-warehouse business rule | N/A — uncertain, need user input |

---

## Section 6 — Test Inventory

### `apps/web/tests/modules/warehouse/warehouse-client.test.tsx`
- 214 lines, 6 tests
- Layer: **UI components** (`WarehouseClient`, `WarehouseDetailClient`)
- Mocks: `lucide-react` icons via `vi.mock`; `vi.stubGlobal("fetch", fetchMock)` with a hoisted `fetchMock` (does **not** mock `@builders/application` use cases — there are none — and does not mock `@builders/db`); also imports `navigationMocks` from `tests/helpers/next-navigation-mock`
- Match to target pattern: **partial** — uses `vi.hoisted` correctly, but the target pattern is to mock use cases from `@builders/application`; warehouse has no use cases, so this test mocks `fetch` directly. Will need rewrite once a `WarehouseExecutionError` + use cases land.
- Rewrite effort: **medium** — 6 tests covering navigation + list + detail + section/location interactions; will need new mock harness against use cases, but the assertions can largely survive
- Will break on file-move? Yes — imports `@/modules/warehouse/components/warehouse-client` and `@/modules/warehouse/record/detail/warehouse-detail-client`, both of which would move under a hardened structure

### `apps/web/tests/modules/warehouse/warehouse-locations.test.ts`
- 361 lines, 11 tests
- Layer: **route handlers** (GET, POST @ `/api/locations/route`; PATCH, DELETE @ `/api/locations/[id]/route`)
- Mocks: `vi.hoisted({ prismaMock: { flooringLocation: {...}, flooringSection: {...} }, requireRouteAccessMock, enforceRouteRateLimitMock })`; `vi.mock("@builders/db", ...)` to inject `prisma` and `db`; mocks `@/server/http/route-helpers`
- Match to target pattern: **mismatch** — target tests mock `@builders/application` use cases via `vi.hoisted`, not Prisma directly. These tests mock Prisma because there are no use cases. Once use cases land, the entire mock setup must be replaced.
- Rewrite effort: **large** — 11 route tests, each builds a Prisma response; rewriting against use-case mocks is a structural rewrite
- Will break on file-move? Yes — imports from `@/app/api/locations/route` and `@/app/api/locations/[id]/route`. If sub-resource routes move (e.g., to `/api/warehouses/[id]/sections/[sectionId]/locations/...`) these must be deleted and rewritten.

### `apps/web/tests/modules/warehouse/warehouse-sections.test.ts`
- 264 lines, 9 tests
- Layer: **route handlers** (GET, POST @ `/api/sections/route`; PATCH, DELETE @ `/api/sections/[id]/route`)
- Mocks: same pattern as `warehouse-locations.test.ts` — hoisted `prismaMock.flooringSection`, mocks `@builders/db`, mocks `@/server/http/route-helpers`
- Match to target pattern: **mismatch** (same reason)
- Rewrite effort: **large** (same)
- Will break on file-move? Yes (same)

**No tests for `/api/warehouses/route.ts` or `/api/warehouses/[id]/route.ts`.** This is a coverage gap orthogonal to the migration.

**Tests targeted for delete vs. rewrite during sweep:** All three current tests assert against Prisma-mock shapes from a structure that will not survive the sweep (no use cases exist today; use cases will exist after the sweep). All three should be considered **delete-and-rewrite** under the hardened pattern, not migrate-in-place.

---

## Section 7 — Seeding Decision — Data Gathering Only

**No decision proposed.** Inputs for the user:

- **Existing seed data for warehouses.** `packages/db/scripts/seed.js` does NOT seed warehouses. Warehouse seeding lives in `packages/db/scripts/reference-test-data.js`:
  - Lines 238–260: `WAREHOUSE_BLUEPRINTS` constant declares 3 warehouses ("North Warehouse", "Central Warehouse", "South Warehouse") with addresses, phones, one section each ("Receiving", "Main Stock", "Dispatch"), and 3 location codes per section ("A-01", "A-02", "A-03"; "B-01"…; "C-01"…)
  - Lines 749–812: upsert loop that creates warehouses by `where: { name }`, then sections by `(warehouseId, name)`, then locations by `(warehouseId, locationCode)`
  - Default count: 3 warehouses × 1 section × 3 locations = 9 location rows total
  - Names are prefixed with a configurable `normalizedPrefix` (e.g., `"TEST"`)
- **Current cardinality in seed:** 3 warehouses, 1 section per warehouse, 3 locations per section (per `WAREHOUSE_BLUEPRINTS`).
- **Code that references warehouse / section / location by hardcoded name or slug:** All hits are test fixtures, not production code.
  - `apps/web/tests/modules/work-orders/work-orders-client.test.tsx` — `warehouseName: "Main Warehouse"` (~8 occurrences)
  - `apps/web/tests/modules/products/products-detail-client.test.tsx` — `importWarehouseName: "Main Warehouse"`, `inventoryLabel: "Main Warehouse / A1 / Item A100"`
  - `apps/web/tests/modules/management-companies/management-company-record-view.test.tsx`, `tests/modules/imports/imports-routes.test.ts`, `tests/modules/imports/imports-client.test.tsx`, `tests/modules/properties/properties-client.test.tsx` — `"Main Warehouse"` or `{ id: "wh-1", name: "Main Warehouse" }`
  - `apps/web/tests/server/http/route-policy-parity.test.ts` — `{ name: "Main Warehouse" }` test fixture
  - `apps/web/tests/engines/record-view/record-create-clients.test.tsx` — `{ id: "wh-1", name: "Main Warehouse" }` mock option
  - `apps/web/app/dashboard/warehouse/page.tsx:13` — `"warehouse-main"` is a **table-preference scope key**, not a warehouse identifier
  - **No production code references a warehouse, section, or location by slug or hardcoded name.** All consumers reference by id (UUID).
- **Future inventory worker / warehouse references by slug or id.** `docs/domains/INVENTORY.md` does not exist. `docs/domains/WORK_ORDERS.md` does not exist. `docs/services/WORKER.md` does not exist. `apps/worker/` does not exist. **No future worker design currently expresses an opinion.**
- **Production deployment scripts that insert warehouse rows.** Only `packages/db/scripts/reference-test-data.js` (the test-data fixture script) inserts warehouse rows. `packages/db/scripts/seed.js` does not. Uncertain whether `reference-test-data.js` runs on prod deploy — need user input.
- **Reference data modules linked to warehouses.** None. `FlooringCategory` and `FlooringUnitOfMeasure` have no warehouse FK (verified by reading their model definitions). The reference-data ↔ warehouse coupling is zero.

**Decision-support summary for the user:**
- Schema currently has `name @unique` on warehouse but no slug — a slug column would be required if seeding by slug is desired
- Application code today references warehouses only by UUID id (no slug, no name lookup)
- The only "canonical names" exist in `reference-test-data.js` blueprints and in test fixtures (`"Main Warehouse"`)
- No external system (worker, queue, deployment script) currently demands a stable warehouse identity beyond the UUID
- If warehouses become reference data: would need (a) decision on canonical list, (b) addition of slug column or commitment to name-as-stable-key, (c) move from `apps/web/modules/warehouse/api.ts` writes to `packages/db/src/seed/warehouses.ts` + idempotent script, (d) removal of mutation routes
- If sections become reference data: same considerations, plus the FK to warehouse must point to a stable warehouse identity
- Locations are the highest-cardinality and most volatile (per blueprint, 3 per section vs. 1 section per warehouse) — least obvious candidate for seeding

---

## Section 8 — Open Questions for the User

Each question lists the code evidence that surfaces it; no answers are proposed.

1. **Should warehouse `name` be immutable once created?**
   - Evidence: `name` is `@unique` (schema.prisma:457), and the only stable handle the future inventory worker / external systems could use is `id` or `name` (no slug). If `name` is intended as the stable handle, mutation should be blocked. If `id` is the stable handle, free renames are fine. Currently `updateWarehouseRow` accepts `name` (`api.ts:74`).

2. **Should section `name` be immutable within a warehouse?**
   - Evidence: `@@unique([warehouseId, name])` (schema.prisma:480). `updateSectionRow` accepts `name` (`api.ts:194`). Renames work today.

3. **Should locations remain fully user-editable?**
   - Evidence: `updateLocationRow` accepts both `locationCode` and `sectionId` (`api.ts:286–321`). FlooringInventory.locationId uses `onDelete: SetNull` (no relocation logic). User input needed on whether moving a location across sections has business consequences.

4. **If seeding warehouses, what is the canonical list?**
   - Evidence: `reference-test-data.js:238–260` defines 3 test blueprints. No production canonical list exists in code.

5. **Soft-delete vs hard-delete for warehouses / sections / locations?**
   - Evidence: All deletes today are hard. No `deletedAt` column on any of the 3 models. Manufacturers also uses hard-delete.

6. **Multi-warehouse transfer flows?**
   - Evidence: No transfer endpoints in API surface. `FlooringWorkOrder.warehouseId` is nullable (`onDelete: SetNull`). `FlooringInventory.locationId` is nullable. Whether transfer flows are planned would change whether a stable warehouse key matters.

7. **Is the legacy `use-warehouse-record-controller.ts` (364 lines, top-level) still wired into the UI, or is it dead code superseded by `record/panel/controllers/`?**
   - Evidence: Both files exist; `controllers/use-warehouse-record-controller.ts` is a 1-line re-export of the legacy. Need user input.

8. **Does the location-delete flow need a guard against `FlooringInventory.locationId IS NOT NULL`?**
   - Evidence: `FlooringInventory.locationId` uses `onDelete: SetNull`; `deleteLocationRow` (`api.ts:323–345`) has no precondition check. Other deletes check counts; this one does not.

9. **Should the dashboard URL be plural (`/dashboard/warehouses`) to match every other module?**
   - Evidence: All hardened modules use plural dashboard paths (`/dashboard/manufacturers`, `/dashboard/admin/users`, `/dashboard/categories`). Warehouse uses singular (`/dashboard/warehouse`). Renaming has SEO / saved-link blast radius.

10. **Should the sections-and-locations record-view section be split into two separate sections (one per resource), or retained as a combined section with batch save?**
    - Evidence: Current shape (1 engine section, 2 resources, 1 batch save) is a bespoke variant of `useRecordSectionController`. Splitting would align with engine semantics; combining matches the inline-editing UX.

11. **Should `/api/sections` and `/api/locations` be moved under `/api/warehouses/[id]/sections/[sectionId]/...`?**
    - Evidence: Sub-resources are currently top-level routes. Move would add path-derived warehouseId, removing the need for `?warehouseId=` filtering and `ensureWarehouseSectionMatch`.

12. **Does the sections-and-locations save flow need transactional integrity across the batch?**
    - Evidence: Today the batch fires multiple HTTP calls in sequence from the client. A failure mid-batch leaves partial state. Server-side, no `withDatabaseTransaction` wraps any path. Whether the batch should be a single server endpoint accepting the whole local state is a design decision.

13. **Are warehouse / section / location names case-sensitive for uniqueness, or case-insensitive (as the client checker assumes)?**
    - Evidence: DB unique indexes (`@unique`, `@@unique([warehouseId, name])`) are case-sensitive in Postgres by default. The client uniqueness check at `use-warehouse-sections-section.ts:91–101` uses `toLowerCase()`. The two layers can disagree.

---

## Section 9 — Summary Tables

### Table A — Issue Status

| # | Issue | Status | Evidence |
|---|---|---|---|
| 1 | `domain/` exists in module | FAIL | `apps/web/modules/warehouse/domain/types.ts` (1-line re-export) |
| 2 | `record/` divergent from `components/record/` | FAIL | `apps/web/modules/warehouse/record/{create,detail,panel}/...` instead of `components/record/` |
| 3 | Use cases inside the module | FAIL | `apps/web/modules/warehouse/api.ts:58–345` (9 server-side functions); `record/panel/controllers/use-warehouse-sections-section.ts` (408 lines of CRUD orchestration) |
| 4 | Canonical read/write repo in `packages/db/` | FAIL | No `packages/db/src/flooring/warehouses/`; no warehouse export from `packages/db/src/index.ts` |
| 5 | Validators file per route | FAIL | No `_validators.ts` in `app/api/warehouses/`, `/api/sections/`, `/api/locations/` |
| 6 | Routing for section / location adds | DEVIATION | `/api/sections/`, `/api/sections/[id]/`, `/api/locations/`, `/api/locations/[id]/` (top-level, not nested under warehouse) |
| 7 | `withDatabaseTransaction` on writes | FAIL | Zero usages in `apps/web/modules/warehouse/api.ts` and zero in `apps/web/app/api/{warehouses,sections,locations}/`; client slot exists but unused |
| 8 | Re-read after mutation | PARTIAL | Only `/api/warehouses/[id]/route.ts` PATCH re-reads (line 79). Section + location PATCH/POST do not. |
| 9 | Test files in place | EXISTS BUT MISMATCH | 3 files / 26 tests (`tests/modules/warehouse/`); none cover `/api/warehouses/*` routes; all mock Prisma directly, not use cases |
| 10 | `data/queries.ts` matches manufacturers re-export pattern | FAIL | `apps/web/modules/warehouse/data/queries.ts` is `export * from "../queries"`; `queries.ts` calls `prisma` directly because no `@builders/db` warehouse loader exists |
| 11 | Application orchestrates / data persists | FAIL | Business rules embedded in `api.ts:106–116, 221–223, 250–259` and in `record/panel/controllers/use-warehouse-sections-section.ts:85–129`; not in domain/application |
| 12 | API route thinness (≤60 lines) | FAIL | 5 of 6 routes >60 lines (74, 154, 79, 136, 79, 136). No business logic in routes — bloat is mutation-lifecycle scaffolding repeated per method |
| 13 | `WarehouseExecutionError` + `WarehouseErrorCode` | FAIL | Zero matches anywhere in codebase. Uses generic `createAppError(message, { status })` |
| 14 | Warehouse name uniqueness | PARTIAL | DB `@unique` only; no `nameNormalized`/slug; no app-level pre-check or friendly conflict mapping |
| 15 | Stale `authorizeWarehouseRoute` call sites | EXISTS | `app/api/warehouses/route.ts:14`; `app/api/warehouses/[id]/route.ts:17` (warehouse routes only — sections + locations use `applyRoutePolicy` directly, an in-module inconsistency) |
| 16 | Inline parsing vs `parseRequiredString` helpers | HELPER STYLE | `apps/web/modules/warehouse/api.ts` uses `parseRequiredString` / `parseOptionalString` throughout (admin-style, not manufacturers-style) |
| 17 | Pass-through wrappers in `data/queries.ts` | DIFFERENT PROBLEM | Wrappers exist (`data/queries.ts`, `data/api.ts`, `controllers/use-warehouse-*.ts`, `domain/types.ts`, `components/list/warehouse-client.tsx` — all 1-line re-exports) but they shim folder names over a flat module body, not rename `@builders/db` exports |
| 18 | PATCH split vs combined | COMBINED | `/api/warehouses/[id]/route.ts` exports GET (line 16) + PATCH (line 31) + DELETE (line 94) in one file; no `[id]/primary/section/route.ts` |

### Table B — Layer Distribution Today

| Layer | Files | Lines (approx) | Notes |
|---|---|---|---|
| Domain (correct: `packages/domain/`) | 0 | 0 | None — warehouse appears only as a field on allocation types in `packages/domain/src/allocation-compatibility.ts` and `auto-allocation-plan.ts` |
| Domain (misplaced: `modules/warehouse/domain/`) | 1 | 1 | Single 1-line re-export of `../types`; can be deleted as part of the sweep |
| Application (correct: `packages/application/`) | 0 | 0 | None — warehouse only appears as a field on allocation use cases (`packages/application/src/allocations/...`) |
| Data (correct: `packages/db/`) | 0 | 0 | No `packages/db/src/flooring/warehouses/`; no read- or write-repository |
| Module (`apps/web/modules/warehouse/`) | 22 | ~2,557 | 415-line `api.ts` is the de facto repo + use-case layer. 364-line legacy controller; 408-line section controller. 7 files are 1-line re-export shims |
| Routes (`apps/web/app/api/{warehouses,sections,locations}/`) | 6 | 658 | 5 of 6 over 60 lines. Bloat is repeated mutation-lifecycle scaffolding, not business logic |
| Dashboard pages (`apps/web/app/dashboard/warehouse/`) | 3 | 108 | Singular path (diverges from API plural and from every other module) |
| Tests (`apps/web/tests/modules/warehouse/`) | 3 | 839 (26 tests) | Mock `@builders/db` (Prisma) directly, not use cases. No coverage of `/api/warehouses/*` routes |

### Table C — Sub-Resource Surface

| Sub-resource | Current route | Current handler location | Needs split? |
|---|---|---|---|
| Warehouse primary section | PATCH `apps/web/app/api/warehouses/[id]/route.ts` (combined with GET + DELETE, line 31) | Delegates to `updateWarehouseRow` in `apps/web/modules/warehouse/api.ts:71–85` | YES — split into `[id]/primary/section/route.ts` per manufacturers template; GET and DELETE remain in `[id]/route.ts` |
| Warehouse sections (child resource) | GET + POST `apps/web/app/api/sections/route.ts`; PATCH + DELETE `apps/web/app/api/sections/[id]/route.ts` | Delegates to `listSectionRows`, `createSectionRow`, `updateSectionRow`, `deleteSectionRow` in `apps/web/modules/warehouse/api.ts:158–232` | OPEN — could be moved under `/api/warehouses/[id]/sections/...` to make warehouseId path-derived (removes `?warehouseId=` filtering and `ensureWarehouseSectionMatch` need) |
| Locations (grandchild resource) | GET + POST `apps/web/app/api/locations/route.ts`; PATCH + DELETE `apps/web/app/api/locations/[id]/route.ts` | Delegates to `listLocationRows`, `createLocationRow`, `updateLocationRow`, `deleteLocationRow` in `apps/web/modules/warehouse/api.ts:234–345` | OPEN — could be nested as `/api/warehouses/[id]/sections/[sectionId]/locations/...`; `ensureWarehouseSectionMatch` becomes structural |

---

## Notes on Audit Confidence

- All file paths verified directly via Read or Glob during the scan.
- The `authorizeWarehouseRoute` finding in issue 15 was double-checked (one discovery agent reported it absent inside the module; a follow-up grep confirmed it's used by the warehouse route files which are in `apps/web/app/api/warehouses/`, not `apps/web/modules/warehouse/`).
- The split between the engine-based `record/panel/controllers/` controllers and the legacy `use-warehouse-record-controller.ts` (364 lines) was identified but not traced to its UI consumer — flagged as Open Question 7 for user confirmation.
- No write operations performed; no files modified.
