# List View Engine

> **Scope:** Shared engine that powers every list page. No module builds its own table.
> **Location:** `apps/web/modules/shared/engines/list-view/`
> **Status:** Active

## Rules

1. Every list page is a configured instance of this engine — no module builds its own table implementation.
2. The URL is the single source of truth for all list state (search, filters, sort, grouping, page).
3. Controller reads URL on mount and on every URL change.
4. All user interactions (search, filter, sort, group, paginate) update URL query parameters.
5. User column preferences are debounced (400ms) to the server.
6. Server-side pagination is supported via the `disableClientPagination` flag.

## Contract

### Primary Orchestrator

`useConfiguredTableState` is the primary hook. Every list controller composes it with module-specific configuration:

```typescript
const tableState = useConfiguredTableState({
  columns: MODULE_COLUMNS,
  filters: MODULE_FILTERS,
  fetchData: fetchModuleData,
  tableKey: "module-name",
  disableClientPagination?: boolean,
})
```

### Standard Controls

| Control | Behavior |
|---------|----------|
| **Search** | Debounced text input, synced to `?q=` query param |
| **Filters** | Panel rendering per config, serialized to URL params |
| **Sorting** | Column header toggle (asc/desc/none), synced to `?sort=` and `?dir=` |
| **Grouping** | Up to 3 levels, collapsible group headers, synced to URL |
| **Column visibility** | Toggle per column, persisted per user per module via table preferences |
| **Pagination** | Page index + page size, synced to `?page=` and `?size=` |
| **Add new** | Modal or inline creation per module config |

### Table Rendering

- Grid-layout table with configurable columns.
- Read-only rows. Row click navigates to record view via URL push.
- Empty state, loading state, and error state handled by the engine.

## Patterns

```
modules/shared/engines/list-view/
├── shell/              ← Page-level layout wrapper
├── table/              ← Table grid, row rendering, column headers
├── controls/           ← Search bar, filter panel, sort controls, grouping
├── columns/            ← Column type renderers (text, date, badge, etc.)
└── hooks/              ← useConfiguredTableState, usePagination, etc.
```

Module-specific configuration:
```
modules/{name}/
├── controller/
│   └── use-{name}-list-controller.ts   ← Composes useConfiguredTableState
├── components/list/
│   ├── {name}-client.tsx               ← Client wrapper
│   ├── {name}-table.tsx                ← Column + filter config
│   └── {name}-filters.tsx              ← Filter definitions
```

## Anti-Patterns

1. **Do not** build custom table rendering in a module — configure the engine instead.
2. **Do not** store list state in React state — URL is the source of truth.
3. **Do not** fetch data outside the controller — the engine handles fetch lifecycle.
4. **Do not** mutate data from the list view — navigate to the record view for edits.
5. **Do not** bypass column preference persistence — all visibility changes flow through the preference system.

## Related Docs

- [../layers/CONTROLLER.md](../layers/CONTROLLER.md) — controller contract that list controllers implement
- [RECORD_VIEW_ENGINE.md](RECORD_VIEW_ENGINE.md) — companion engine for record pages
- [NAVIGATION_SHELL.md](NAVIGATION_SHELL.md) — app shell that wraps list pages
