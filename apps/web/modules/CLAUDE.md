# Modules Directory

Every feature module under `apps/web/modules/` follows the same three-folder shape. Modules hold UI + client-side orchestration only — no business logic, no direct database access.

## Folder shape (canonical)

```
apps/web/modules/{module}/
├── components/
│   ├── list/                                     — list-view components (table, filters, columns, toolbar)
│   │   ├── {module}-client.tsx
│   │   └── {module}-table.tsx
│   └── record/
│       ├── {module}-detail-client.tsx            — record-view client wrapper
│       ├── {module}-create-client.tsx            — create-flow client wrapper
│       ├── {module}-record-panel.tsx             — shared record panel chrome
│       ├── primary/                              — primary-section components
│       │   └── {module}-primary-fields-section.tsx
│       ├── {child-section-a}/                    — one folder per child section on the record view
│       │   ├── {module}-{child-section-a}-section.tsx
│       │   └── {sub-feature}/                    — optional: sub-feature folder for the section (e.g. an edit panel)
│       └── {child-section-b}/
├── controllers/                                  — controllers split by view (list / record), then by section
│   ├── list/
│   │   ├── use-{module}-list-controller.ts
│   │   └── use-{module}-list-mutations.ts
│   └── record/
│       ├── drafts.ts                             — shared draft / diff helpers across sections (optional)
│       ├── primary/
│       │   └── use-{module}-primary-section.ts
│       ├── {child-section-a}/
│       │   ├── use-{module}-{child-section-a}-section.ts
│       │   └── use-{sub-feature}.ts              — optional: sub-feature controller alongside its section
│       └── {child-section-b}/
└── data/
    ├── queries.ts                                — thin wrappers over @builders/db canonical reads
    ├── mutations.ts                              — client POST/PATCH/DELETE helpers (withMutationMeta)
    └── list-{module}-request.ts                  — list-request shape (URL-binding contract for the list view)
```

## `components/`

- `components/list/` holds everything rendered by the list view: the table wrapper, filter defs, column configs, toolbar, any list-scoped subcomponents.
- `components/record/` holds everything rendered by the record view. **Each section on the record view gets its own folder** under `components/record/{section}/` — primary section, and every child section. Keeping section components colocated makes section-scoped changes local.

## `controllers/` (plural)

- One controller hook per section on the record view, plus the list controller.
- Controllers build diffs client-side, call their section's mutation helper in `data/mutations.ts`, and reconcile the response in place.
- **Use the plural `controllers/`.** Some existing modules use `controller/` (singular). **Going forward the plural is canonical.** Those singular-folder modules will flip when they're next touched.

## `data/`

- `data/queries.ts` — thin wrappers over `@builders/db` canonical reads. Every function imports from `@builders/db` only. **No Prisma imports. No direct DB access.** Contacts (`apps/web/modules/contacts/data/queries.ts`) is the reference implementation: every function is a small wrap around a canonical read exported by `@builders/db`.
- `data/mutations.ts` — client-side HTTP helpers (`createXRequest`, `updateXRequest`, `deleteXRequest`, one per section-save route). All wrap `withMutationMeta`. Same thin-wrapper discipline as `queries.ts`.

## Forbidden inside a module folder

- No `domain/` — business rules live in `packages/domain/`.
- No `application/` — use cases live in `packages/application/`.
- No `record/` as a sibling of `components/` — record UI is colocated under `components/record/{section}/`.
- No `data/api.ts` — split into `queries.ts` + `mutations.ts`.
- No direct Prisma imports anywhere under `apps/web/modules/{module}/`.

## Routing — sectional, under `apps/web/app/api/`

Routes live outside the module folder, under `apps/web/app/api/{module}/`. **Routing is sectional: each section on the record view gets its own route file.**

```
apps/web/app/api/{module}/
├── _validators.ts                            — per-module input validators
├── route.ts                                  — GET list + POST create
├── options/route.ts                          — GET form options
└── [id]/
    ├── route.ts                              — DELETE
    ├── primary/section/route.ts              — PATCH primary section
    └── {child-section}/section/route.ts      — PATCH atomic diff per child section
```

Each mutation route calls exactly one use case from `packages/application/`. No business logic in route handlers. Dashboard pages under `apps/web/app/dashboard/{module}/` are SSR loaders that import only from `modules/{module}/data/queries.ts`.
