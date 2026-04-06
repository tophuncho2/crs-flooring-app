# Module Structure Consistency Audit

> Generated 2026-04-06. Maps every module in `apps/web/modules/`, identifies inconsistencies, and produces a canonical anatomy recommendation.

---

## 1. Module Inventory

### 18 modules confirmed:

| # | Module | Type | Has List | Has Record | Uses List Engine | Uses Record Engine |
|---|--------|------|:--------:|:----------:|:----------------:|:------------------:|
| 1 | app-shell | shell | — | — | — | — |
| 2 | auth | auth | — | — | — | — |
| 3 | builder | admin | — | — | — | — |
| 4 | categories | feature | yes | yes | yes | yes |
| 5 | contacts | feature | yes | yes | yes | yes |
| 6 | cut-logs | feature | yes | — | yes | — |
| 7 | imports | feature | yes | yes | yes | yes |
| 8 | inventory | feature | yes | yes | yes | yes |
| 9 | management-companies | feature | yes | yes | yes | yes |
| 10 | manufacturers | feature | yes | yes | yes | yes |
| 11 | products | feature | yes | yes | yes | yes |
| 12 | properties | feature | yes | yes | yes | yes |
| 13 | services | feature | yes | yes | yes | yes |
| 14 | shared | infrastructure | — | — | — | — |
| 15 | templates | feature | yes | yes | yes | yes |
| 16 | unit-of-measures | feature | yes | yes | yes | yes |
| 17 | warehouse | feature | yes | yes | yes | yes |
| 18 | work-orders | feature | yes | yes | yes | yes |

---

## 2. Per-Module Inventories

### app-shell
```
app-shell/
├── components/
│   ├── dashboard-error-state.tsx
│   ├── header-controls.tsx
│   ├── header-nav.tsx
│   ├── tools-menu.tsx          ← fetch() to /api/account/flooring-nav
│   └── user-menu.tsx
├── hooks/
│   └── use-navigation-state.ts
└── navigation/
    └── definitions.ts
```
- **Type:** Shell infrastructure
- **Folders:** components/, hooks/, navigation/ (all non-standard — appropriate for a shell module)
- **Empty dirs:** None
- **Notes:** `tools-menu.tsx` calls fetch() directly from a component (bypasses controller pattern). Acceptable for shell — this is a preference-persistence action, not domain CRUD.

---

### auth
```
auth/
└── components/
    └── login-form.tsx          ← signIn() + fetch() to /api/auth/register
```
- **Type:** Auth
- **Folders:** components/ only
- **Empty dirs:** None
- **Notes:** Single file. Direct fetch() for registration. Will be simplified by FLO-43/44.

---

### builder
```
builder/
└── components/
    └── users-panel.tsx         ← requestJson() to /api/builder/users (GET/PATCH/DELETE)
```
- **Type:** Admin panel
- **Folders:** components/ only
- **Empty dirs:** None
- **Notes:** Single component with all state management and API calls inline. No controller layer. Will be replaced by engine-driven Users module (FLO-45).

---

### categories
```
categories/
├── components/
│   └── list/
│       ├── categories-client.tsx
│       └── categories-table.tsx
├── controllers/
│   └── use-categories-list-controller.ts
├── data/
│   └── queries.ts              ← re-exports from @builders/db
├── domain/
│   └── types.ts                ← types, validators, form converters
├── record/
│   ├── create/
│   │   └── category-create-client.tsx
│   ├── detail/
│   │   └── category-detail-client.tsx
│   └── panel/
│       ├── controllers/
│       │   └── use-category-primary-section.ts
│       └── sections/
│           └── category-primary-fields-section.tsx
└── transport/
    └── validate-category-input.ts
```
- **Type:** Feature (full CRUD)
- **Folders:** components/list/, controllers/, data/, domain/, record/, transport/
- **Empty dirs:** None
- **Notes:** `transport/` is unique to categories (server-side input validation). `data/queries.ts` is pure re-exports from `@builders/db`. Clean engine integration throughout.

---

### contacts
```
contacts/
├── application/
│   └── manage-contact.ts       ← delete-blocking business logic
├── components/
│   └── list/
│       ├── contacts-client.tsx
│       └── contacts-table.tsx
├── controllers/
│   └── use-contacts-list-controller.ts
├── data/
│   ├── mutations.ts            ← client-side requestJson() calls
│   ├── queries.ts              ← Prisma queries
│   ├── server-mutations.ts     ← re-export of server-records
│   └── server-records.ts       ← Prisma CRUD
├── domain/
│   ├── services.ts             ← normalization, computed fields
│   └── types.ts                ← types, validators
└── record/
    ├── create/
    │   └── contact-create-client.tsx
    ├── detail/
    │   └── contact-detail-client.tsx
    └── panel/
        ├── controllers/
        │   └── use-contact-primary-section.ts
        └── sections/
            └── contact-primary-fields-section.tsx
```
- **Type:** Feature (full CRUD)
- **Folders:** application/, components/list/, controllers/, data/, domain/, record/
- **Empty dirs:** None
- **Notes:** Most complete layering: application/ for use cases, domain/ for types+services, data/ split into client mutations vs server records. `data/mutations.ts` has client-side `requestJson()` calls (not used by controllers — controllers call `requestJson()` directly). `data/server-mutations.ts` is a re-export of `server-records.ts`.

---

### cut-logs
```
cut-logs/
├── components/
│   └── cut-logs-client.tsx     ← requestJson() DELETE directly in component
└── data/
    └── queries.ts              ← Prisma queries + row normalization
```
- **Type:** Feature (list only, no create/record)
- **Folders:** components/, data/
- **Empty dirs:** None
- **Notes:** Minimal — list-only view with inline delete. Component calls API directly (no controller). Cascading update logic after delete (updates related rows). Uses `useConfiguredTableState` directly.

---

### imports
```
imports/
├── api.ts                      ← re-export
├── contracts.ts                ← status/transport type constants
├── summary.ts                  ← re-export
├── table-filters.ts            ← filter definitions
├── application/
│   ├── import-entry.ts         ← create/update/delete use cases
│   └── import-ingest.ts        ← ingest wrapper
├── controllers/
│   └── use-imports-list-controller.ts
├── data/
│   ├── api.ts                  ← Prisma queries + mutations
│   └── queries.ts              ← server-side page data loaders
├── domain/
│   ├── contracts.ts            ← re-export
│   ├── filters.ts              ← filter parsing
│   ├── summary.ts              ← summary calculations
│   └── types.ts                ← types, validators, payload builders
└── record/
    ├── create/
    │   └── import-create-client.tsx
    ├── detail/
    │   └── import-detail-client.tsx
    └── panel/
        ├── controllers/
        │   ├── use-import-primary-section.ts
        │   └── use-import-inventory-rows-section.ts
        └── sections/
            ├── import-primary-fields-section.tsx
            └── import-inventory-rows-section.tsx
```
- **Type:** Feature (full CRUD, multi-section)
- **Folders:** application/, controllers/, data/, domain/, record/, + root-level re-exports
- **Empty dirs:** None
- **Notes:** Multi-section record (primary + inventory rows). Several root-level re-export files (`api.ts`, `contracts.ts`, `summary.ts`). `data/api.ts` combines queries and mutations (not split).

---

### inventory
```
inventory/
├── queries.ts                  ← re-export
├── api.ts                      ← re-export
├── table-filters.ts            ← filter definitions
├── application/
│   ├── cut-logs.ts             ← FIFO cut log management
│   ├── inventory-detail.ts     ← update use case
│   └── inventory-sync.ts       ← sync stub
├── controllers/
│   └── use-inventory-list-controller.ts
├── data/
│   ├── api.ts                  ← Prisma queries + mutations + normalization
│   ├── cut-logs.ts             ← cut log Prisma operations
│   └── queries.ts              ← server-side page data loaders
├── domain/
│   ├── filters.ts              ← status/warehouse filtering
│   ├── formatters.ts           ← display formatting
│   └── types.ts                ← types, validators
└── record/
    └── panel/
        ├── controllers/
        │   ├── use-inventory-primary-section.ts
        │   └── use-inventory-cut-logs-section.ts
        └── sections/
            ├── inventory-primary-fields-section.tsx
            └── inventory-cut-logs-section.tsx
```
- **Type:** Feature (list + record, no create page — created via imports)
- **Folders:** application/, controllers/, data/, domain/, record/
- **Empty dirs:** None
- **Notes:** No `record/create/` — inventory is created through the imports flow. Multi-section record (primary + cut logs). Complex allocation tracking with computed fields.

---

### management-companies
```
management-companies/
├── services.ts                 ← root-level normalization (NOT a re-export)
├── validators.ts               ← root-level input validation (NOT a re-export)
├── components/
│   ├── management-companies-client.tsx
│   └── list/
│       └── management-companies-client.tsx  ← re-export of parent
├── data/
│   ├── queries.ts              ← Prisma queries + normalization
│   └── mutations.ts            ← Prisma mutations
├── domain/
│   ├── types.ts                ← types, validators
│   ├── validators.ts           ← re-export of ../validators
│   └── services.ts             ← re-export of ../services
└── record/
    ├── create/
    │   └── management-company-create-client.tsx
    ├── detail/
    │   └── management-company-detail-client.tsx
    └── panel/
        ├── management-company-record-panel.tsx
        ├── controllers/
        │   └── use-management-company-primary-section.ts
        └── sections/
            ├── management-company-primary-fields-section.tsx
            └── management-company-properties-section.tsx
```
- **Type:** Feature (full CRUD, multi-section)
- **Folders:** components/, data/, domain/, record/
- **Empty dirs:** None
- **Notes:** Missing `controllers/` directory for list controller (list component manages its own state). Root-level `services.ts` and `validators.ts` are NOT re-exports — they contain real logic, with `domain/` re-exporting them (inverted relationship). Multi-section record (primary + linked properties).

---

### manufacturers
```
manufacturers/
├── services.ts                 ← root-level normalization
├── validators.ts               ← root-level validation with duplicate checking
├── application/
│   └── manage-manufacturer.ts  ← use cases with conflict checking
├── components/
│   ├── manufacturers-client.tsx  ← re-export
│   └── list/
│       ├── manufacturers-client.tsx
│       └── manufacturers-table.tsx
├── controllers/
│   ├── use-manufacturers-list-controller.ts
│   └── use-manufacturer-record-controller.ts  ← re-export of panel controller
├── data/
│   ├── mutations.ts            ← client-side requestJson()
│   ├── queries.ts              ← Prisma queries
│   ├── server-records.ts       ← Prisma CRUD
│   └── server-mutations.ts     ← server use cases with conflict handling
├── domain/
│   ├── types.ts
│   ├── validators.ts           ← re-export of ../validators
│   ├── services.ts             ← re-export of ../services
│   └── manufacturer-rules.ts   ← business rules (uniqueness, delete-blocking)
└── record/
    ├── create/
    │   └── manufacturer-create-client.tsx
    ├── detail/
    │   └── manufacturer-detail-client.tsx
    └── panel/
        ├── manufacturer-record-panel.tsx
        ├── controllers/
        │   └── use-manufacturer-primary-section.ts
        └── sections/
            └── manufacturer-primary-fields-section.tsx
```
- **Type:** Feature (full CRUD)
- **Folders:** application/, components/list/, controllers/, data/, domain/, record/
- **Empty dirs:** `components/record/` (EMPTY), `components/detail/` (EMPTY)
- **Notes:** Same inverted re-export pattern as management-companies (root `services.ts`/`validators.ts` with `domain/` re-exporting). `controllers/use-manufacturer-record-controller.ts` is a re-export of the panel controller. Has `domain/manufacturer-rules.ts` for business rules.

---

### products
```
products/
├── services.ts                 ← re-export
├── validators.ts               ← re-export
├── application/
│   └── manage-product.ts
├── components/
│   ├── products-client.tsx     ← re-export
│   └── list/
│       ├── products-client.tsx
│       └── products-table.tsx
├── controllers/
│   └── use-products-list-controller.ts
├── data/
│   ├── mutations.ts            ← Prisma mutations (server-side)
│   └── queries.ts              ← Prisma queries
├── domain/
│   ├── inventory-summary.ts
│   ├── services.ts
│   ├── types.ts
│   └── validators.ts
└── record/
    ├── create/
    │   └── product-create-client.tsx
    ├── detail/
    │   └── product-detail-client.tsx
    └── panel/
        ├── product-record-panel.tsx
        ├── controllers/
        │   └── use-product-primary-section.ts
        └── sections/
            ├── product-inventory-rows-section.tsx
            └── product-primary-fields-section.tsx
```
- **Type:** Feature (full CRUD, multi-section)
- **Folders:** application/, components/list/, controllers/, data/, domain/, record/
- **Empty dirs:** `components/detail/` (EMPTY)
- **Notes:** Multi-section record (primary + inventory rows). `data/mutations.ts` contains server-side Prisma mutations (not client `requestJson()`). Server-side filtering/sorting/pagination.

---

### properties
```
properties/
├── services.ts                 ← re-export
├── validators.ts               ← re-export
├── queries.ts                  ← Prisma queries (NOT a re-export)
├── mutations.ts                ← Prisma mutations (NOT a re-export)
├── components/
│   ├── properties-client.tsx
│   └── list/
│       └── properties-client.tsx  ← re-export
├── data/                       ← EMPTY DIRECTORY (no files)
├── domain/
│   ├── services.ts
│   ├── types.ts
│   └── validators.ts
└── record/
    ├── create/
    │   └── property-create-client.tsx
    ├── detail/
    │   └── property-detail-client.tsx
    └── panel/
        ├── property-record-panel.tsx
        ├── controllers/
        │   └── use-property-primary-section.ts
        └── sections/
            ├── property-primary-fields-section.tsx
            └── property-templates-section.tsx
```
- **Type:** Feature (full CRUD, multi-section)
- **Folders:** components/list/, domain/, record/, + root-level queries/mutations
- **Empty dirs:** `data/` (EMPTY), `controllers/` (EMPTY), `components/detail/` (EMPTY), `components/record/` (EMPTY)
- **Notes:** Most structurally inconsistent module. `queries.ts` and `mutations.ts` live at root instead of in `data/`. `data/` directory exists but is empty. `controllers/` directory exists but is empty (controller lives in `record/panel/controllers/`). Multi-section record (primary + templates).

---

### services
```
services/
├── services.ts                 ← root-level re-export
├── application/
│   └── manage-service.ts       ← delete-blocking logic
├── components/
│   ├── services-client.tsx     ← re-export
│   └── list/
│       ├── services-client.tsx
│       └── services-table.tsx
├── controllers/
│   └── use-services-list-controller.ts
├── data/
│   ├── mutations.ts            ← client-side requestJson()
│   ├── queries.ts              ← Prisma queries
│   └── server-records.ts       ← Prisma CRUD
├── domain/
│   ├── services.ts
│   └── types.ts
└── record/
    ├── create/
    │   └── service-create-client.tsx
    ├── detail/
    │   └── service-detail-client.tsx
    └── panel/
        ├── service-record-panel.tsx
        ├── controllers/
        │   └── use-service-primary-section.ts
        └── sections/
            └── service-primary-fields-section.tsx
```
- **Type:** Feature (full CRUD)
- **Folders:** application/, components/list/, controllers/, data/, domain/, record/
- **Empty dirs:** `components/record/` (EMPTY), `components/detail/` (EMPTY)
- **Notes:** `data/mutations.ts` contains client-side `requestJson()` calls (unique — most modules put these in controllers). Single-section record.

---

### templates
```
templates/
├── types.ts                    ← root-level types (NOT a re-export)
├── application/
│   ├── validate-template.ts
│   └── record-sections.ts
├── components/
│   ├── templates-client.tsx    ← re-export
│   ├── work-order-sync-modal.tsx
│   └── work-order-expense-summary.tsx
├── controllers/
│   └── use-templates-list-controller.ts
├── data/
│   └── queries.ts
├── domain/
│   └── types.ts
├── list/
│   └── templates-client.tsx    ← actual list component (non-standard location)
└── record/
    ├── create/
    │   └── template-create-client.tsx
    ├── detail/
    │   └── template-detail-client.tsx
    └── panel/
        ├── template-record-panel.tsx
        ├── shared.ts
        ├── controllers/
        │   ├── use-template-primary-section.ts
        │   ├── use-template-material-section.ts
        │   ├── use-template-service-section.ts
        │   └── use-template-sales-reps-section.ts
        └── sections/
            ├── template-primary-fields-section.tsx
            ├── template-material-items-section.tsx
            ├── template-service-items-section.tsx
            ├── template-sales-reps-section.tsx
            └── template-item-grid.ts
```
- **Type:** Feature (full CRUD, multi-section)
- **Folders:** application/, components/, controllers/, data/, domain/, list/, record/
- **Empty dirs:** `components/record/` (EMPTY)
- **Notes:** List component lives in `list/` instead of `components/list/`. 4 record sections (primary, material items, service items, sales reps). `components/` contains cross-cutting components (sync modal, expense summary) shared with work-orders.

---

### unit-of-measures
```
unit-of-measures/
├── types.ts                    ← root-level types (NOT re-export)
├── queries.ts                  ← root-level re-export
├── application/
│   └── manage-unit-of-measure.ts
├── components/
│   ├── unit-of-measures-client.tsx  ← re-export
│   └── list/
│       ├── unit-of-measures-client.tsx
│       └── unit-of-measures-table.tsx
├── controllers/
│   └── use-unit-of-measures-list-controller.ts
├── data/
│   ├── queries.ts              ← re-export from @builders/db
│   └── mutations.ts            ← client-side requestJson() with withMutationMeta
├── domain/
│   ├── types.ts                ← re-export of ../types
│   └── unit-of-measure-rules.ts
└── record/
    ├── create/
    │   └── unit-of-measure-create-client.tsx
    ├── detail/
    │   └── unit-of-measure-detail-client.tsx
    └── panel/
        ├── unit-of-measure-record-panel.tsx
        ├── controllers/
        │   └── use-unit-of-measure-primary-section.ts
        └── sections/
            └── unit-of-measure-primary-fields-section.tsx
```
- **Type:** Feature (full CRUD)
- **Folders:** application/, components/list/, controllers/, data/, domain/, record/
- **Empty dirs:** None
- **Notes:** Simplest full CRUD module. Only module that uses `useListViewEngine()` hook (all others use `useConfiguredTableState()`). Single-section record.

---

### warehouse
```
warehouse/
├── types.ts                    ← root-level types
├── queries.ts                  ← root-level re-export
├── api.ts                      ← root-level re-export
├── use-warehouse-client-controller.ts   ← root-level controller
├── use-warehouse-record-controller.ts   ← root-level controller (extensive)
├── components/
│   ├── warehouse-client.tsx    ← re-export
│   ├── warehouse-table.tsx
│   ├── warehouse-create-modal.tsx
│   └── list/
│       └── warehouse-client.tsx
├── controllers/
│   ├── use-warehouse-client-controller.ts   ← re-export
│   └── use-warehouse-record-controller.ts   ← re-export
├── data/
│   ├── queries.ts              ← re-export
│   └── api.ts                  ← Prisma queries + mutations (combined)
├── domain/
│   └── types.ts                ← re-export
└── record/
    ├── create/
    │   └── warehouse-create-client.tsx
    ├── detail/
    │   └── warehouse-detail-client.tsx
    └── panel/
        ├── warehouse-record-panel.tsx
        ├── controllers/
        │   ├── use-warehouse-primary-section.ts
        │   └── use-warehouse-sections-section.ts
        └── sections/
            ├── warehouse-primary-fields-section.tsx
            ├── warehouse-sections-section.tsx
            └── warehouse-item-grid.ts
```
- **Type:** Feature (full CRUD, multi-section with nested entities)
- **Folders:** components/, controllers/, data/, domain/, record/, + root-level files
- **Empty dirs:** `components/detail/` (EMPTY)
- **Notes:** Most structurally scattered. Real controllers live at module root (`use-warehouse-record-controller.ts` — 200+ lines of state management with direct `requestJson()` calls), with `controllers/` directory just re-exporting them. `data/api.ts` combines queries and mutations. Nested entity management (sections + locations within warehouse).

---

### work-orders
```
work-orders/
├── types.ts                    ← extensive type definitions
├── queries.ts                  ← root-level (NOT re-export)
├── mutations.ts                ← root-level (NOT re-export)
├── validators.ts               ← root-level input validation
├── services.ts                 ← root-level
├── contracts.ts                ← status/mode constants
├── table-filters.ts            ← filter definitions
├── use-work-orders-client-controller.ts  ← root-level controller
├── application/
│   ├── manage-work-order.ts
│   ├── allocations.ts
│   ├── allocation-errors.ts
│   ├── sync-template.ts
│   ├── template-sync-runner.ts
│   └── record-sections.ts
├── components/
│   ├── work-orders-client.tsx  ← re-export
│   ├── work-order-sync-modal.tsx
│   └── work-order-expense-summary.tsx
├── controllers/
│   └── use-work-orders-list-controller.ts
├── domain/
│   ├── expense-summary.ts
│   ├── filters.ts
│   ├── material-allocations.ts
│   └── sales-reps.ts
├── list/
│   └── work-orders-client.tsx  ← actual list component
├── transport/
│   ├── allocations.ts          ← response type builders
│   └── detail.ts
└── record/
    ├── create/
    │   └── work-order-create-client.tsx
    ├── detail/
    │   └── work-order-detail-client.tsx
    └── panel/
        ├── work-order-record-panel.tsx
        ├── shared.ts
        ├── controllers/
        │   ├── use-work-order-primary-section.ts
        │   ├── use-work-order-material-section.ts
        │   ├── use-work-order-service-section.ts
        │   └── use-work-order-sales-reps-section.ts
        ├── sections/
        │   ├── work-order-primary-fields-section.tsx
        │   ├── work-order-material-items-section.tsx
        │   ├── work-order-service-items-section.tsx
        │   ├── work-order-sales-reps-section.tsx
        │   ├── work-order-calculations-section.tsx
        │   ├── material-allocations-editor.tsx
        │   ├── work-order-section-metrics.ts
        │   ├── material-grid-layout.ts
        │   └── work-order-line-item-grid.ts
        └── workflows/
            └── use-work-order-auto-allocation-workflow.ts
```
- **Type:** Feature (full CRUD, most complex)
- **Folders:** application/, components/, controllers/, domain/, list/, record/, transport/, + many root-level files
- **Empty dirs:** `components/record/sections/` (EMPTY), `detail/` (EMPTY), `controllers/record-panel/` (EMPTY)
- **Notes:** Most complex module (43+ files). List component in `list/` not `components/list/`. Has `transport/` for response shaping. Has `workflows/` for async allocation polling. 4 record sections + calculations. 3 empty directories (remnants of prior structure).

---

### shared (infrastructure)
```
shared/
├── access/
│   ├── tool-slugs.ts
│   ├── domain-tools.ts
│   ├── lookup-domains.ts
│   └── templates-work-orders.ts
└── engines/
    ├── common/
    │   ├── application/        ← telemetry, transactions, use-case results
    │   ├── display/            ← styling constants, surfaces
    │   ├── feedback/           ← UI state, notifications
    │   ├── navigation/         ← URL-based record panel state
    │   ├── record-entry/       ← record create/detail routing
    │   └── transport/          ← HTTP, mutations, conflict detection
    ├── list-view/
    │   ├── controllers/        ← useConfiguredTableState, useListViewEngine
    │   ├── controls/           ← top control bar
    │   ├── scaffold/           ← page shell layout
    │   └── table/              ← table rendering, cells, filtering
    └── record-view/
        ├── adapters/           ← data formatting
        ├── contracts/          ← type contracts
        ├── client/
        │   ├── controllers/    ← section/allocation/item CRUD hooks
        │   ├── hooks/          ← notices, dirty state, workflows
        │   └── scaffolds/      ← create/detail scaffolds
        ├── feedback/           ← error displays
        ├── forms/              ← form components
        ├── panel/              ← multi-section panel rendering
        ├── sections/           ← section rendering (cells, metrics, rows, panels, status)
        └── shell/              ← page-level shell, headers, footers
```
- **Type:** Infrastructure
- **158 files** across engines
- All content is genuinely shared across multiple feature modules
- No misplaced domain-specific code found

---

## 3. Consistency Matrix

| Module | controllers/ | data/ | domain/ | application/ | transport/ | components/list/ | record/ | root re-exports | empty dirs |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| categories | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | 0 |
| contacts | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | 0 |
| cut-logs | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 0 |
| imports | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | 3 | 0 |
| inventory | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | 2 | 0 |
| mgmt-companies | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | 2 | 0 |
| manufacturers | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | 2 | 2 |
| products | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | 2 | 1 |
| properties | ∅ | ∅ | ✓ | ✗ | ✗ | ✓ | ✓ | 4 | 4 |
| services | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | 1 | 2 |
| templates | ✓ | ✓ | ✓ | ✓ | ✗ | ✗† | ✓ | 1 | 1 |
| unit-of-measures | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | 2 | 0 |
| warehouse | ✓‡ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | 5 | 1 |
| work-orders | ✓ | ✗§ | ✓ | ✓ | ✓ | ✗† | ✓ | 7 | 3 |

Legend: ✓ = exists with files, ✗ = missing, ∅ = exists but empty
† = list component lives in `list/` instead of `components/list/`
‡ = `controllers/` contains only re-exports; real controllers at root
§ = queries/mutations at root, not in `data/`

---

## 4. Empty Directories

**13 empty directories found.** All are remnants from the migration of record/detail content from `components/` to the top-level `record/` directory.

| Empty Directory | Module | Recommendation |
|----------------|--------|----------------|
| `products/components/detail/` | products | **Delete** |
| `properties/components/record/` | properties | **Delete** |
| `properties/components/detail/` | properties | **Delete** |
| `properties/controllers/` | properties | **Delete** (controller in record/panel/) |
| `properties/data/` | properties | **Delete** (data at root level) |
| `manufacturers/components/record/` | manufacturers | **Delete** |
| `manufacturers/components/detail/` | manufacturers | **Delete** |
| `templates/components/record/` | templates | **Delete** |
| `warehouse/components/detail/` | warehouse | **Delete** |
| `services/components/record/` | services | **Delete** |
| `services/components/detail/` | services | **Delete** |
| `work-orders/components/record/sections/` | work-orders | **Delete** |
| `work-orders/detail/` | work-orders | **Delete** |
| `work-orders/controllers/record-panel/` | work-orders | **Delete** |

**All 13 should be deleted.** None are placeholders for planned work — the content that was intended for these locations now lives under `record/`.

---

## 5. The De Facto Pattern

Looking across all 14 feature modules, the **actual evolved pattern** is:

```
modules/{name}/
├── domain/                         ← Types, validators, business rules, normalization
│   ├── types.ts                    ← Row types, form types, converters, validators
│   ├── services.ts                 ← Normalization functions (optional)
│   └── {name}-rules.ts            ← Business rules (optional)
├── data/
│   ├── queries.ts                  ← Server-side page data loaders (Prisma)
│   └── api.ts | server-records.ts  ← Server-side CRUD (Prisma) (optional)
├── application/                    ← Use cases combining domain + data (optional)
│   └── manage-{name}.ts
├── controllers/
│   └── use-{name}-list-controller.ts
├── components/
│   └── list/
│       ├── {name}-client.tsx       ← Client wrapper composing engine hooks
│       └── {name}-table.tsx        ← Column definitions + table rendering
├── record/
│   ├── create/
│   │   └── {name}-create-client.tsx
│   ├── detail/
│   │   └── {name}-detail-client.tsx
│   └── panel/
│       ├── {name}-record-panel.tsx
│       ├── controllers/
│       │   └── use-{name}-primary-section.ts
│       └── sections/
│           └── {name}-primary-fields-section.tsx
└── table-filters.ts               ← Filter definitions (optional)
```

**What changed from the documented pattern:**
1. `domain/` directory emerged (not in docs) — used by 13/14 feature modules
2. `application/` directory emerged (not in docs) — used by 9/14 feature modules
3. Record content moved from `components/record/` to top-level `record/` with `panel/` sub-structure
4. Section controllers live in `record/panel/controllers/`, not top-level `controllers/`
5. No module uses `views/` directory (documented as optional, but 0% adoption)
6. `transport/` appeared in 2 modules (categories, work-orders) for API-layer concerns

---

## 6. The `data/` Directory Pattern

**What's in data/ across modules:**

| Module | data/queries.ts | data/mutations.ts or api.ts | Pattern |
|--------|:-:|:-:|---|
| categories | re-exports from @builders/db | — | Pure delegation |
| contacts | Prisma queries | client requestJson() | Split: server queries + client mutations |
| imports | server page loaders | Prisma queries + mutations combined | Combined in api.ts |
| inventory | server page loaders | Prisma queries + mutations + cut-logs | Combined in api.ts + separate cut-logs.ts |
| mgmt-companies | Prisma queries + normalization | Prisma mutations | Split by read/write |
| manufacturers | Prisma queries | client requestJson() + server Prisma | Split: client + server mutations |
| products | Prisma queries | Prisma mutations (server) | Split by read/write |
| services | Prisma queries | client requestJson() + server Prisma | Split: client + server |
| templates | server page loaders | — | Queries only |
| unit-of-measures | re-export from @builders/db | client requestJson() with mutationMeta | Delegation + client mutations |
| warehouse | re-export | Prisma queries + mutations combined | Combined in api.ts |
| work-orders | root-level (not in data/) | root-level (not in data/) | **Non-conforming** |

**Inconsistencies:**
1. **queries.ts naming is overloaded**: some are pure re-exports, some contain Prisma queries with normalization, some are full page data loaders with error handling
2. **mutations.ts meaning varies**: some contain client-side `requestJson()` calls, some contain server-side Prisma operations, some combine both
3. **Some modules use `api.ts` instead of `mutations.ts`** (imports, inventory, warehouse)
4. **Work-orders and properties have data files at root** instead of in `data/`

**Connects to FLO-38:** Several `data/queries.ts` files contain direct Prisma calls with business logic (normalization, computed fields). These should be split: raw Prisma access in `packages/db/`, normalization in domain layer.

---

## 7. The `controller/` Pattern

**Controller composition patterns:**

| Controller Type | Engine Hook Used | Modules |
|----------------|-----------------|---------|
| List controller | `useRecordNotices()` + `useState` | All with controllers/ |
| Single-section record | `useSingleSectionRecordController()` | categories, contacts, manufacturers, products, properties, services, unit-of-measures, imports, inventory, warehouse |
| Multi-section record | `useRecordScopedSectionController()` | templates, work-orders, imports (inventory rows), warehouse (sections) |
| Allocation controller | `useRecordAllocationController()` | work-orders only |
| Workflow controller | `useRecordSectionWorkflow()` | work-orders only |

**Components bypassing controllers (calling APIs directly):**
- `cut-logs/components/cut-logs-client.tsx` — DELETE call inline (no controller exists)
- `builder/components/users-panel.tsx` — all CRUD inline (pre-engine module)
- `auth/components/login-form.tsx` — registration POST (pre-engine module)
- `app-shell/components/tools-menu.tsx` — nav preference PATCH (shell, not domain)

**Verdict:** All engine-integrated modules properly route through controllers. Only pre-engine modules (auth, builder, cut-logs) bypass.

---

## 8. The Application Layer Question

**Where client-side orchestration logic lives today:**

| Pattern | Where | Modules | What It Does |
|---------|-------|---------|-------------|
| **In record/panel/controllers/** | Section controllers | All CRUD modules | `requestJson()` to API, validation, error handling |
| **In data/mutations.ts** | Separate file | contacts, manufacturers, services, unit-of-measures | `requestJson()` wrappers (but controllers also call `requestJson()` directly) |
| **In application/** | Use case files | contacts, imports, inventory, manufacturers, products, services, templates, unit-of-measures, work-orders | Server-side orchestration: validation → mutation → side effects |
| **In transport/** | Response builders | categories (validation), work-orders (response shaping) | API-layer input validation or response type construction |

**Key observation:** `data/mutations.ts` (client-side) files exist in some modules but are NOT consistently used by controllers. Controllers often call `requestJson()` directly. The `data/mutations.ts` files appear to be a transitional pattern that was partially adopted.

### Recommendation: Option A — Formalize `transport/`

**Rationale:**

The codebase has naturally evolved two distinct orchestration layers:
1. **`application/`** — Server-side use cases (called from API route handlers). Combines domain validation + data access + side effects. This is well-established and correct.
2. **Record panel controllers** — Client-side section state management. These compose engine hooks and call `requestJson()` directly. This is also well-established and correct.

The gap is in the middle: some modules have `data/mutations.ts` files with `requestJson()` wrappers, but controllers don't consistently use them. This layer doesn't earn its keep.

**Recommendation:**
- **`transport/`** (optional) — For modules that need server-side input validation called from API routes (what categories has today). This is API-boundary work, not client orchestration.
- **No client-side mutation wrapper layer.** Controllers call `requestJson()` directly. This is already the dominant pattern and adding an indirection layer doesn't add value — the controller IS the orchestration layer on the client side.
- **`application/`** (optional) — Server-side use cases, unchanged. Only needed when a mutation requires validation → DB operation → side effects.
- **Delete `data/mutations.ts` files that contain client-side `requestJson()` calls.** Move any logic into the consuming controller. If no logic exists (pure wrappers), just delete.

---

## 9. Canonical Module Anatomy — Recommended

Based on what actually works, here is the recommended structure. This supersedes what's in `docs/patterns/MODULE_ANATOMY.md`.

```
modules/{name}/
│
├── domain/                              ← REQUIRED for all CRUD modules
│   ├── types.ts                         ← Row types, form types, converters, validators
│   └── {name}-rules.ts                  ← Business rules, normalization (optional)
│
├── data/                                ← REQUIRED for all CRUD modules
│   └── queries.ts                       ← Server-side page data (SSR)
│
├── application/                         ← OPTIONAL — server-side use cases
│   └── manage-{name}.ts                 ← Validation → mutation → side effects
│
├── transport/                           ← OPTIONAL — API-boundary validation
│   └── validate-{name}-input.ts         ← Input parsing for API routes
│
├── controllers/                         ← REQUIRED for list view
│   └── use-{name}-list-controller.ts    ← Composes engine hooks + useState
│
├── components/                          ← REQUIRED for list view
│   └── list/
│       ├── {name}-client.tsx            ← useConfiguredTableState composition
│       └── {name}-table.tsx             ← Column defs + row rendering
│
├── record/                              ← REQUIRED for record view
│   ├── create/
│   │   └── {name}-create-client.tsx     ← RecordCreateClientScaffold
│   ├── detail/
│   │   └── {name}-detail-client.tsx     ← RecordDetailClientScaffold
│   └── panel/
│       ├── {name}-record-panel.tsx       ← Section composition
│       ├── controllers/
│       │   └── use-{name}-primary-section.ts  ← useSingleSectionRecordController
│       └── sections/
│           └── {name}-primary-fields-section.tsx  ← Form fields
│
└── table-filters.ts                     ← OPTIONAL — filter definitions for list view
```

### Directory rules:

| Directory | When Required | What Goes In | What NEVER Goes In |
|-----------|-------------|-------------|-------------------|
| `domain/` | All CRUD modules | Types, validators, business rules, normalization | Prisma calls, API calls, React components |
| `data/` | All CRUD modules | Server-side queries called from page.tsx | Client-side fetch/requestJson calls |
| `application/` | When mutations need orchestration | Server-side use cases | Client-side code, React hooks |
| `transport/` | When API routes need input validation | Server-side input parsing | Business rules, data access |
| `controllers/` | All modules with list view | List controller hook only | Record controllers (those go in record/panel/controllers/) |
| `components/list/` | All modules with list view | List client + table component | Record components |
| `record/` | All modules with record view | Create, detail, panel sub-tree | List components |

### What should NOT exist:

| Anti-pattern | Why | Migration |
|-------------|-----|-----------|
| `data/mutations.ts` with client `requestJson()` | Controllers call requestJson directly | Delete, move logic to controller |
| Root-level re-export files | Unnecessary indirection | Delete, update imports |
| `components/detail/` or `components/record/` | Record content lives in `record/` now | Delete empty dirs |
| `views/` | 0% adoption, no use case | Don't create |
| `list/` (top-level) | Should be `components/list/` | Move |

---

## 10. Violation List

### Structural Violations (need cleanup)

| # | Module | Violation | Fix |
|---|--------|-----------|-----|
| 1 | properties | `data/` and `controllers/` are empty directories | Delete both empty dirs |
| 2 | properties | `queries.ts` and `mutations.ts` at module root instead of `data/` | Move into `data/` |
| 3 | work-orders | `queries.ts`, `mutations.ts`, `validators.ts`, `services.ts`, `contracts.ts` at root | Move to `data/` and `domain/` respectively |
| 4 | work-orders | `list/` instead of `components/list/` | Move to `components/list/` |
| 5 | templates | `list/` instead of `components/list/` | Move to `components/list/` |
| 6 | warehouse | Real controllers at module root, `controllers/` has re-exports only | Move controllers into `controllers/` or `record/panel/controllers/` |
| 7 | warehouse | `use-warehouse-record-controller.ts` at root (200+ lines) | Refactor into `record/panel/controllers/` |
| 8 | mgmt-companies | `services.ts`/`validators.ts` at root with `domain/` re-exporting them (inverted) | Move into `domain/`, delete root files |
| 9 | manufacturers | Same inverted re-export pattern | Move into `domain/`, delete root files |

### Empty Directory Violations (delete all 13)

| # | Path |
|---|------|
| 1 | `products/components/detail/` |
| 2 | `properties/components/record/` |
| 3 | `properties/components/detail/` |
| 4 | `properties/controllers/` |
| 5 | `manufacturers/components/record/` |
| 6 | `manufacturers/components/detail/` |
| 7 | `templates/components/record/` |
| 8 | `warehouse/components/detail/` |
| 9 | `services/components/record/` |
| 10 | `services/components/detail/` |
| 11 | `work-orders/components/record/sections/` |
| 12 | `work-orders/detail/` |
| 13 | `work-orders/controllers/record-panel/` |

### Root Re-export Violations (evaluate per module)

Several modules have root-level files that are pure re-exports or contain logic that should be in `domain/` or `data/`:

| Module | Root File | Content | Action |
|--------|-----------|---------|--------|
| imports | `api.ts`, `contracts.ts`, `summary.ts` | Re-exports | Delete, update imports |
| inventory | `queries.ts`, `api.ts` | Re-exports | Delete, update imports |
| warehouse | `types.ts`, `queries.ts`, `api.ts` | Re-exports | Delete, update imports |
| work-orders | `types.ts` | Real types | Move to `domain/types.ts` |
| work-orders | `contracts.ts` | Real constants | Move to `domain/contracts.ts` |
| work-orders | `table-filters.ts` | Filter defs | Keep (established pattern) |
| unit-of-measures | `types.ts`, `queries.ts` | Mixed | Consolidate into domain/data |
| products | `services.ts`, `validators.ts` | Re-exports | Delete |
| properties | `services.ts`, `validators.ts`, `queries.ts`, `mutations.ts` | Mixed | Move to proper directories |

---

## 11. Suggested Linear Issues

| # | Title | Description | Priority | Effort |
|---|-------|-------------|----------|--------|
| **NEW-5** | Delete 13 empty ghost directories across modules | Post-migration cleanup. All are remnants of the move from `components/record/` to `record/`. Zero risk — they contain no files. | Low | XS |
| **NEW-6** | Standardize properties module structure | Most inconsistent module: empty `data/`, empty `controllers/`, root-level queries/mutations. Move files to canonical locations. | Medium | S |
| **NEW-7** | Move work-orders root-level files into canonical directories | 7 root-level files (`types.ts`, `queries.ts`, `mutations.ts`, `validators.ts`, `services.ts`, `contracts.ts`, `use-work-orders-client-controller.ts`) should move to `domain/`, `data/`, `controllers/`. | Medium | M |
| **NEW-8** | Move templates and work-orders list components from `list/` to `components/list/` | Two modules use `list/` instead of `components/list/`. Small rename for consistency. | Low | XS |
| **NEW-9** | Resolve inverted re-export pattern in manufacturers and management-companies | Root-level `services.ts`/`validators.ts` contain real logic while `domain/` re-exports them. Invert: move logic into `domain/`, delete root files. | Low | S |
| **NEW-10** | Refactor warehouse root-level controllers into record/panel/controllers/ | `use-warehouse-record-controller.ts` (200+ lines) sits at module root. Move and potentially decompose into panel controllers. | Medium | M |
| **NEW-11** | Delete unused client-side data/mutations.ts wrappers | Contacts, manufacturers, and services have `data/mutations.ts` with `requestJson()` wrappers that controllers don't consistently use. Audit usage, inline into controllers or delete. | Low | S |
| **NEW-12** | Update MODULE_ANATOMY.md to reflect evolved pattern | Current doc prescribes `controller/` (singular), `components/record/`, `views/`. Reality uses `controllers/`, `record/`, no views. Doc needs rewrite to match canonical structure from this audit. | High | S |

---

## 12. MODULE_ANATOMY.md — Specific Drift from Reality

| Documented | Actual | Impact |
|-----------|--------|--------|
| `controller/` (singular) | `controllers/` (plural) | Naming inconsistency. 12/14 feature modules use plural. |
| `components/record/` for record components | `record/` as top-level dir with `panel/controllers/` and `panel/sections/` | Major structural difference. ALL modules use `record/`. |
| `data/server-records.ts` prescribed name | `data/queries.ts` is the dominant name | Only contacts and manufacturers have `server-records.ts` |
| `views/` listed as optional | 0/14 modules use it | Remove from spec |
| No `domain/` directory mentioned | 13/14 modules have it | Must be added to spec |
| No `application/` directory mentioned | 9/14 modules have it | Must be added to spec |
| No `record/panel/` structure mentioned | All record modules use it | Must be added to spec |
| `components/list/{name}-filters.tsx` | `table-filters.ts` at module root | Different location and naming |
| API routes under `app/api/flooring/{name}/` | Actual: `app/api/{name}/` (no flooring prefix) | Route prefix is wrong in docs |
