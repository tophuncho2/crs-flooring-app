# Modules Directory

## Scope
This directory contains all feature modules for the Builders Web App (Single-Tenant Flooring System).

## Enforcement Rules

1. Every module must follow this exact folder structure:
   - controller/ — list controller, primary section controller, additional section controllers
   - data/ — server-side queries (server-records.ts) and mutation helpers (server-mutations.ts)
   - components/list/ — client wrapper, table config, filter definitions
   - components/record/ — detail client wrapper, primary section form, additional section forms
   - views/ — page-level compositions (optional)

2. Naming conventions are strict:
   - use-{name}-list-controller.ts
   - use-{name}-primary-controller.ts
   - use-{name}-{section}-controller.ts
   - {name}-client.tsx
   - {name}-table.tsx
   - {name}-filters.tsx
   - {name}-detail-client.tsx
   - {name}-primary.tsx

3. No module calls APIs directly from UI components — all data flows through controllers.
4. Every list page uses useConfiguredTableState from the shared list view engine.
5. Every record section uses useRecordSectionController from the shared record view engine.
6. No module builds its own table or form infrastructure.
7. No module-specific code lives outside its module folder (except route files in app/dashboard/).

## Audit Task
When asked to audit or organize, compare every subdirectory against the structure above and flag deviations.
