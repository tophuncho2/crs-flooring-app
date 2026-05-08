# Modules Directory

Every feature module under `apps/web/modules/` follows the same three-folder shape. Modules hold UI + client-side orchestration only — no business logic, no direct database access.

## Forbidden inside a module folder

- No `domain/` — business rules live in `packages/domain/`.
- No `application/` — use cases live in `packages/application/`.
- No `record/` as a sibling of `components/` — record UI is colocated under `components/record/{section}/`.
- No `data/api.ts` — split into `queries.ts` + `mutations.ts`.
- No direct Prisma imports anywhere under `apps/web/modules/{module}/`.

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

> **Note on `{feature}-request.ts`:** this pattern is only used for template sync right now (`apps/web/modules/template-sync/data/sync-template-request.ts`). The `template-sync/` module is a tiny single-purpose "wrapper module" whose entire job is to expose one button that POSTs to a feature-specific route. Its single `*-request.ts` file stands in for a full `mutations.ts`. Don't reach for this pattern unless unless i explicitely mention to — for everything else, mutations belong in `data/mutations.ts`.

## `components/`

- [ ] **`components/list/`** — `{module}-client.tsx` (list-view client wrapper) + `{module}-table.tsx` (the table). Filter chips, column defs, and toolbar pieces colocate here.
- [ ] **`components/record/` root** — three top-level wrappers: `{module}-detail-client.tsx`, `{module}-create-client.tsx`, `{module}-record-panel.tsx` (shared panel chrome).
- [ ] **`components/record/primary/`** — primary-section components (`{module}-primary-fields-section.tsx`).
- [ ] **`components/record/{child-section}/`** — one folder per child section on the record view. Section-scoped subcomponents (headers, row layouts, sub-feature panels) colocate inside the section folder.
- [ ] **`components/record/{child-section}/{sub-feature}/`** *(optional)* — deeper sub-features get their own subfolder under the section (e.g. an edit panel).
- [ ] **`components/picker/`** *(optional)* — this module's async dropdown picker (consumed by other modules' forms). Paired with `data/{module}-options-request.ts`.
- [ ] **Imports `@/components/` directly** — module components freely import from the top-level `apps/web/components/` (shared cells, dialogs, dropdowns, badges, sections, etc.). No need to re-wrap.
- [ ] **Imports `@/controllers/` directly** — module components also import from the top-level `apps/web/controllers/` (e.g. `useAsyncRichDropdownController` for pickers, list-view controllers for table chrome).

## `controllers/` (plural, split by view)

- [ ] **Use the plural `controllers/`** — some legacy modules still use `controller/` (singular) or a flat `controllers/` (no `list/` + `record/` split); both will flip to this shape next time they're touched.
- [ ] **`controllers/list/use-{module}-list-controller.ts`** — orchestrates the list view (selection, navigation, list-scoped state).
- [ ] **`controllers/list/use-{module}-list-mutations.ts`** — list-scoped mutations (e.g. create-from-list) wired to react-query.
- [ ] **`controllers/record/drafts.ts`** *(optional)* — shared diff/draft helpers + form-option types reused across multiple section controllers.
- [ ] **`controllers/record/{section}/use-{module}-{section}-section.ts`** — one folder per section, mirroring `components/record/{section}/`. Section controllers build diffs client-side, call their section's mutation helper in `data/mutations.ts`, and reconcile the server response in place.
- [ ] **`controllers/record/{section}/use-{sub-feature}.ts`** *(optional)* — sub-feature controllers used only by that section.
- [ ] **Imports `@/controllers/` directly** — module controllers freely import from the top-level `apps/web/controllers/` (e.g. `useRecordSectionController`, `useServerListController`, dropdown-search controllers). No re-wrapping.
- [ ] **Imports `@/components/` directly** — module controllers may import from the top-level `apps/web/components/` when needed (cells, dialogs, sections, etc.).

## `data/`

- [ ] **`data/queries.ts`** — server-side wrappers over `@builders/db` canonical reads. Returns `PrismaDetailPageResult<T>` (or similar) for dashboard loaders. Imports from `@builders/db` only. **No Prisma imports. No direct DB access.**
- [ ] **`data/mutations.ts`** — `"use client"` HTTP helpers (`createXRequest`, `updateXRequest`, `deleteXRequest`, plus per-section/per-row save helpers). All wrap `withMutationMeta` and call `requestJson`.
- [ ] **`data/list-{module}-request.ts`** — URL/search-params contract for the **list view (table)**. Defines `*ListInput`, the react-query key, page size, filter keys, and the parser that turns `searchParams` into a `ListInput`. Calls `/api/{module}` (GET). This is the list-view contract — pickers do **not** use this file.
- [ ] **`data/{module}-options-request.ts`** *(optional)* — picker options request. Defines a query key + an async search function that calls `/api/{module}/options` and returns option rows. Paired with a picker in `components/picker/`.
- [ ] **`data/{feature}-request.ts`** *(rare)* — one-off feature/action request when a module is a tiny single-purpose wrapper (see note under folder shape; only `template-sync/` uses this today).
