```markdown
# Modules Directory

> **Scope:** This directory contains all feature modules for the Builders Web App (Single-Tenant Flooring System).

## Enforcement Rules

1. Every module must follow this exact folder structure:
   - `controllers/` — list controller, primary section controller, additional section controllers
   - `data/` — server-side queries (server-records.ts) and mutation helpers (server-mutations.ts)
   - `components/list/` — client wrapper, table config, filter definitions
   - `components/record/` — detail client wrapper, primary section form, additional section forms
   - `transport/` — HTTP boundary types (request/response shapes)
   - `views/` — page-level compositions (optional)

2. Naming conventions are strict:
   - `use-{name}-list-controller.ts`
   - `use-{name}-primary-controller.ts`
   - `use-{name}-{section}-controller.ts`
   - `{name}-client.tsx`
   - `{name}-table.tsx`
   - `{name}-filters.tsx`
   - `{name}-detail-client.tsx`
   - `{name}-primary.tsx`

3. No module calls APIs directly from UI components — all data flows through controllers.
4. Every list page uses `useConfiguredTableState` from the shared list view engine.
5. Every record section uses `useRecordSectionController` from the shared record view engine.
6. No module builds its own table or form infrastructure.
7. No module-specific code lives outside its module folder (except route files in `app/dashboard/`).
8. No domain logic lives here — business rules belong in `packages/domain/`, use cases in `packages/application/`, persistence in `packages/db/`.

## Reference Data Exception

Modules that represent seeded, read-only reference data (see `docs/patterns/REFERENCE_DATA.md`) are exempt from the standard structure above. Reference data modules:

- **Must have:** `controllers/`, `components/list/`, `data/`, module-root `types.ts`, `CLAUDE.md`
- **Must not have:** `record/`, `transport/`, `views/`, `domain/`, or any subdirectory for mutation surface
- **Must not have:** entries under `packages/application/src/flooring/{name}/` or `packages/domain/src/flooring/{name}/`
- **Must not have:** `write-repository.ts` under `packages/db/src/flooring/{name}/`
- **Must declare themselves** as reference data modules in their module-root `CLAUDE.md` with a link to `docs/patterns/REFERENCE_DATA.md`

This exception is documented in `docs/module-anatomy/ACCEPTED_EXCEPTIONS.md` as Exception 3.

When auditing, treat a module with a "Reference Data Module" declaration in its `CLAUDE.md` as conforming to the reference data structure rather than the standard structure.

## Audit Task

When asked to audit or organize, compare every subdirectory against the structure above and flag deviations.
```