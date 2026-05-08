# Modules Directory

Every feature module under `apps/web/modules/` follows the same three-folder shape. Modules hold UI + client-side orchestration only — no business logic, no direct database access.

## Folder shape (canonical)

```
apps/web/modules/{module}/
├── components/
│   ├── list/                                     — list-view components (table, filters, columns, toolbar)
│   │   ├── {module}-client.tsx
│   │   └── {module}-table.tsx
│   ├── record/
│   │   ├── {module}-detail-client.tsx            — record-view client wrapper
│   │   ├── {module}-create-client.tsx            — create-flow client wrapper
│   │   ├── {module}-record-panel.tsx             — shared record panel chrome
│   │   ├── primary/                              — primary-section components
│   │   │   └── {module}-primary-fields-section.tsx
│   │   ├── {child-section-a}/                    — one folder per child section on the record view
│   │   │   ├── {module}-{child-section-a}-section.tsx
│   │   │   └── {sub-feature}/                    — optional: sub-feature folder for the section (e.g. an edit panel)
│   │   └── {child-section-b}/
│   └── picker/                                   — optional: this module's async dropdown picker (consumed by other modules' forms)
│       └── {module}-picker.tsx
├── controllers/                                  — controllers split by view (list / record), then by section
│   ├── list/
│   │   ├── use-{module}-list-controller.ts
│   │   └── use-{module}-list-mutations.ts
│   └── record/
│       ├── drafts.ts                             — shared draft / diff helpers + option types across sections (optional)
│       ├── primary/
│       │   └── use-{module}-primary-section.ts
│       ├── {child-section-a}/
│       │   ├── use-{module}-{child-section-a}-section.ts
│       │   └── use-{sub-feature}.ts              — optional: sub-feature controller alongside its section
│       └── {child-section-b}/
└── data/
    ├── queries.ts                                — server-side wrappers over @builders/db canonical reads
    ├── mutations.ts                              — client POST/PATCH/DELETE helpers (withMutationMeta)
    ├── list-{module}-request.ts                  — list-view URL/search-params contract (powers the main TABLE list view, not pickers)
    ├── {module}-options-request.ts              — optional: picker options request (powers a picker in components/picker/)
    └── {feature}-request.ts                      — rare: one-off feature/action request (see note below)
```

> **Note on `{feature}-request.ts`:** this is a rare pattern — only one example in the codebase today (`apps/web/modules/template-sync/data/sync-template-request.ts`). The `template-sync/` module is a tiny single-purpose "wrapper module" whose entire job is to expose one button that POSTs to a feature-specific route. Its single `*-request.ts` file stands in for a full `mutations.ts`. Don't reach for this pattern unless you're building a similar one-off wrapper module — for everything else, mutations belong in `data/mutations.ts`.

## `components/`

- `components/list/` — `{module}-client.tsx` (list-view client wrapper) + `{module}-table.tsx` (the table). Filter chips, column defs, and toolbar pieces colocate here.
- `components/record/` — three top-level wrappers at the root: `{module}-detail-client.tsx`, `{module}-create-client.tsx`, `{module}-record-panel.tsx` (shared panel chrome). **Each section on the record view gets its own folder** under `components/record/{section}/` — `primary/` plus one folder per child section. Section-scoped subcomponents (headers, row layouts, sub-feature panels) colocate inside the section folder; deeper sub-features get their own subfolder under the section (e.g. an edit panel).
- `components/picker/` *(optional)* — when this module exposes an async dropdown picker for *other* modules' forms, the picker component lives here and is paired with `data/{module}-options-request.ts`.

## `controllers/` (plural, split by view)

- `controllers/list/`
  - `use-{module}-list-controller.ts` — orchestrates the list view (selection, navigation, list-scoped state).
  - `use-{module}-list-mutations.ts` — list-scoped mutations (e.g. create-from-list) wired to react-query.
- `controllers/record/`
  - `drafts.ts` *(optional)* — shared diff/draft helpers + form-option types reused across multiple section controllers.
  - One folder per section, mirroring `components/record/{section}/`. Each contains `use-{module}-{section}-section.ts` plus optional sub-feature controllers (e.g. `use-{sub-feature}.ts`) used only by that section.
- Section controllers build diffs client-side, call their section's mutation helper in `data/mutations.ts`, and reconcile the server response in place.
- **Use the plural `controllers/`.** Some legacy modules still use `controller/` (singular) or a flat `controllers/` (no `list/` + `record/` split); both will flip to this shape next time they're touched.

## `data/`

- `data/queries.ts` — server-side wrappers over `@builders/db` canonical reads. Returns `PrismaDetailPageResult<T>` (or similar) for dashboard loaders. Imports from `@builders/db` only. **No Prisma imports. No direct DB access.**
- `data/mutations.ts` — `"use client"` HTTP helpers (`createXRequest`, `updateXRequest`, `deleteXRequest`, plus per-section/per-row save helpers). All wrap `withMutationMeta` and call `requestJson`.
- `data/list-{module}-request.ts` — URL/search-params contract for the **list view (table)**. Defines `*ListInput`, the react-query key, page size, filter keys, and the parser that turns `searchParams` into a `ListInput`. Calls `/api/{module}` (GET). This is the list-view contract — pickers do **not** use this file.
- `data/{module}-options-request.ts` *(optional)* — picker options request. Defines a query key + an async search function that calls `/api/{module}/options` and returns option rows. Paired with a picker in `components/picker/`.
- `data/{feature}-request.ts` *(optional)* — one-off feature/action request when a module exposes a feature that doesn't fit `mutations.ts` (e.g. sync, export).

## Forbidden inside a module folder

- No `domain/` — business rules live in `packages/domain/`.
- No `application/` — use cases live in `packages/application/`.
- No `record/` as a sibling of `components/` — record UI is colocated under `components/record/{section}/`.
- No `data/api.ts` — split into `queries.ts` + `mutations.ts`.
- No direct Prisma imports anywhere under `apps/web/modules/{module}/`.

## Routing — under `apps/web/app/api/`

Routes live outside the module folder, under `apps/web/app/api/{module}/`. Each route handler calls exactly one use case from `packages/application/` (or one repository read) — no business logic in route handlers. Every mutation goes through the canonical gauntlet (`applyRoutePolicy`, `parseMutationEnvelope`, `enforceMutationReceipt`, `finalizeMutationReceipt`, `withMutationTelemetry`). Validators colocate in `_validators.ts`.

### Module-level routes

```
apps/web/app/api/{module}/
├── _validators.ts                       — per-module input validators
├── route.ts                             — GET list + POST create
├── options/route.ts                     — GET form options (powers components/picker/)
└── {action}/route.ts                    — optional: module-scoped action route (e.g. POST /from-template)
```

### Section-diff routes (atomic per record section)

```
apps/web/app/api/{module}/[id]/
├── route.ts                             — GET detail + DELETE record
├── primary/section/route.ts             — PATCH primary section
└── {child-section}/section/route.ts     — PATCH atomic diff for the section
```

Each `section/route.ts` accepts the section's diff (added/updated/removed) and applies it in one transaction. This is the canonical pattern for sections whose state is reconciled as a single atomic diff (e.g. primary fields, material items).

### Per-row sync routes (canonical for new per-row mutations)

For sections that mutate **one row at a time** synchronously (no worker, no outbox), the canonical shape is one folder per child collection with per-row + sub-action route files:

```
apps/web/app/api/{module}/[id]/{collection}/
├── route.ts                                   — POST create one row
├── {action}/route.ts                          — POST collection-scoped action (e.g. /finalize)
└── [{rowId}]/
    ├── route.ts                               — PATCH update / DELETE one row
    └── {action}/route.ts                      — POST per-row action (e.g. /void)
```

Each handler calls one use case, takes the necessary `FOR UPDATE` lock, and returns 200 with the post-mutation row + recomputed parent totals. The section controller patches local state from the response without a refetch.

### Sub-resource routes (per-row reads / scoped helpers)

```
apps/web/app/api/{module}/[id]/{collection}/[{rowId}]/{action}/route.ts   — e.g. GET /download (signed URL)
apps/web/app/api/{module}/[id]/{collection}/[{rowId}]/{scope}/route.ts    — e.g. GET /eligible-inventory
```

Used for read-only helpers scoped to a specific row (signed download URLs, eligibility lookups, etc.).

### Loaders

Dashboard pages under `apps/web/app/dashboard/{module}/` are SSR loaders that import only from `modules/{module}/data/queries.ts`.
