# Modules Directory

## Purpose

A module directory under `apps/web/modules/<module>/` is the thin UI-facing shell for a feature: Client Components, their view-state hooks, and the thin server/HTTP glue that connects them to the canonical domain, application, and data packages. It is **not** where domain rules, use cases, or persistence live.

## Targeted structure

```
apps/web/modules/<module>/
├── components/
│   ├── list/
│   │   ├── <module-plural>-client.tsx
│   │   └── <module-plural>-table.tsx
│   └── record/
│       ├── <module>-create-client.tsx
│       ├── <module>-detail-client.tsx
│       ├── <module>-primary-fields-section.tsx
│       └── <module>-record-panel.tsx
├── controller/
│   ├── use-<module>-primary-section.ts
│   └── use-<module-plural>-list-controller.ts
└── data/
    ├── mutations.ts
    └── queries.ts
```

## Folder responsibilities

- **`components/list/`** — React Client Components for the list view (table wrapper + table body).
- **`components/record/`** — React Client Components for the record view (create client, detail client, primary fields section, record panel).
- **`controller/`** — view-state hooks: one for the record view's primary section, one for the list view.
- **`data/queries.ts`** — server-side thin wrappers around `@builders/db` reads, consumed by dashboard loaders. Translates Prisma errors into page-level result shapes.
- **`data/mutations.ts`** — `"use client"` HTTP functions that call API routes. These are HTTP clients; real persistence lives in `packages/db/`.
- Additional data helpers (e.g. foreign-key option loaders) may be colocated in `data/`.

## Naming conventions

- Record-view filenames and the primary-section hook use the **singular** module name (`<module>-`, `use-<module>-`).
- List-view filenames and the list controller hook use the **plural** module name (`<module-plural>-`, `use-<module-plural>-`).
- Folder names match the module's plural form, except where the domain entity is inherently singular.
- The controller folder is `controller/` (singular), not `controllers/`.

## Violations checklist

- [ ] Module directory contains a `domain/`, `application/`, `use-cases/`, or similar folder — those belong in `packages/domain/`, `packages/application/`.
- [ ] Module directory contains persistence code (Prisma queries/mutations) anywhere other than in the `data/queries.ts` server wrappers and `data/mutations.ts` HTTP clients.
- [ ] `data/mutations.ts` performs Prisma writes directly instead of HTTP-calling an API route.
- [ ] `data/queries.ts` calls Prisma directly rather than going through `@builders/db`.
- [ ] Folder named `controllers/` (plural) instead of `controller/` (singular).
- [ ] Record-view files use plural naming, or list-view files use singular naming.
- [ ] Client Components placed outside `components/list/` or `components/record/`.
- [ ] View-state hooks placed inside `components/` rather than `controller/`.
- [ ] Module directory re-exports domain types from a local `types.ts` instead of consuming `@builders/domain`.
- [ ] `data/queries.ts` calls `data/mutations.ts` or vice versa — the two have different runtime boundaries (server vs. client).
