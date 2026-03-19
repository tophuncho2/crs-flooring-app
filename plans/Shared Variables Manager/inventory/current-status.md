# Current Status Of Shared Variables Across The App

Last reviewed: 2026-03-19

## Current Shared-Variable Sources

### App Shell And Theme

- `app/layout.tsx`
  Holds global metadata plus boot-time theme and color-theme defaults through inline script values:
  - `theme`
  - `colorTheme`
  - fallback theme decision from `prefers-color-scheme`
  - default color theme `"1"`
- `app/globals.css`
  Global styling entrypoint for Tailwind import.

### Navigation And Access Catalogs

- `app/dashboard/flooring-navigation.ts`
  Centralized flooring navigation definitions:
  - `FLOORING_NAV_ITEMS`
  - `FLOORING_NAV_SLUGS`
  - route helpers for active state and ordering
- `server/platform/tool-subscriptions.ts`
  Centralized tool catalog and tool-slug typing:
  - `TOOL_CATALOG`
  - `ToolSlug`
  - catalog helpers and user-tool mapping

### Feature-Level Shared UI State And Defaults

- `features/flooring/shared/use-table-controls.ts`
  Centralized table-control defaults and behaviors:
  - `MAX_GROUP_FIELDS = 3`
  - `DEFAULT_TABLE_PAGE_SIZE = 50`
  - shared filtering, sorting, grouping, and pagination logic
- `features/flooring/shared/primary-record-panel.ts`
  Shared record-panel keys and panel width class:
  - `PRIMARY_RECORD_PANEL_WIDTH_CLASS`
  - `PRIMARY_RECORD_PANEL_KEYS`

### Workflow And Domain Constants

- `features/flooring/work-orders/contracts.ts`
  Strong example of domain constants kept out of page code:
  - `WORK_ORDER_STATUS_OPTIONS`
  - `WORK_ORDER_STATUS_LABELS`
  - `VACANCY_OPTIONS`
  - `SYNC_TEMPLATE_MODES`
  - `TEMPLATE_SYNC_POLICY`
- `server/flooring/hotkeys.ts`
  Shared flooring hotkey catalog:
  - `FLOORING_HOTKEYS`
- `server/flooring/unit-measures.ts`
  Shared Prisma include object and normalization helpers:
  - `flooringCategoryUnitInclude`
  - category unit normalization
  - unit option normalization

### Server Defaults And Job Names

- `server/pagination.ts`
  Shared server pagination defaults and helpers:
  - `DEFAULT_SERVER_PAGE_SIZE = 50`
  - page parsing and query-state parsing
- `server/queues/jobs/send-work-order.ts`
  Shared job key:
  - `SEND_WORK_ORDER_JOB`
- `server/queues/jobs/template-to-work-order.ts`
  Shared job key:
  - `TEMPLATE_TO_WORK_ORDER_JOB`
- `server/queues/jobs/sync-inventory.ts`
  Shared job key:
  - `SYNC_INVENTORY_JOB`

### Environment And Runtime Configuration

- `server/storage/s3.ts`
  Reads shared runtime env values directly from `process.env`:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_DEFAULT_REGION`
  - `AWS_ENDPOINT_URL`
  - `AWS_S3_BUCKET_NAME`
  - `AWS_SECRET_ACCESS_KEY`
- `server/auth/auth-options.ts`
  Reads:
  - `NEXTAUTH_SECRET`
- `server/db/prisma.ts`
  Reads:
  - `NODE_ENV`
- `plans/Platform Manager/ENVIRONMENT_VARIABLES_PLAN.md`
  Existing planning doc for env-variable discipline, but not yet implemented as a typed runtime env module.

## Current State Summary

### What Is Already Working

- The app already has several real shared-variable modules instead of burying everything in pages.
- Flooring domain work is the most organized area for shared constants.
- Reusable server-side defaults already exist for pagination, job names, tool catalogs, and unit-measure mapping.
- Shared constants are often typed with `as const`, which improves consistency.

### What Is Still Fragmented

- Global metadata and theme defaults are still embedded in `app/layout.tsx` instead of a shared app-config module.
- Runtime env access is spread across multiple server files instead of one validated env entrypoint.
- Some shared defaults are duplicated by meaning:
  - `DEFAULT_TABLE_PAGE_SIZE = 50`
  - `DEFAULT_SERVER_PAGE_SIZE = 50`
- Shared values are concentrated in the flooring feature; cross-app conventions are not yet formalized.
- Prisma include/select objects exist near mutations and services, but many are still local constants instead of clearly grouped shared contracts.

## Practical Category View

### Strongly Centralized Categories

- flooring navigation
- tool catalog access
- work-order statuses and sync rules
- flooring hotkeys
- pagination helpers
- table-control behavior

### Partially Centralized Categories

- theme and metadata
- runtime environment values
- Prisma include/select definitions
- shared visual layout classes

### Not Yet Formalized As A Shared System

- app-wide config module
- typed env validation layer
- single constants index by domain
- naming standards for shared defaults
- cross-feature variable ownership rules

## Recommended Next Cleanup Targets

1. Create a single `server/env` or equivalent validated env module.
2. Extract app metadata and theme defaults from `app/layout.tsx` into shared config/constants.
3. Reconcile pagination/table page-size defaults into one canonical source.
4. Continue moving feature literals from page/client files into domain contract files.
5. Introduce a clear convention for where shared constants live:
   - app-wide
   - server-wide
   - feature-wide
   - page-local only when truly single-use
