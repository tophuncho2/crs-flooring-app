# Controller Layer

> **Scope:** Interface between UI and backend. Controllers define the contract that UI components consume.
> **Package:** `apps/web/modules/` (per-module `controller/` directories)


## Rules

1. UI components do not call transport or application layer directly — all data flows through controllers.
2. Controllers are plain objects consumed by the UI through a well-defined interface.
3. List controllers and section controllers follow standardized contracts (see below).
4. Controller actions update the URL as the source of truth — URL drives state, not the other way around.
5. Controllers handle loading states, error states, and optimistic updates.
6. Controllers do not contain business rules — they delegate to domain/application via transport.

## Contract

### List Controller

Every list page controller exposes:

| Property | Type | Purpose |
|----------|------|---------|
| `items` | `T[]` | Current page of records |
| `totalCount` | `number` | Total matching records |
| `isLoading` | `boolean` | Fetch in progress |
| `error` | `string \| null` | Current error message |
| `filters` | `FilterState` | Active filter values |
| `sorting` | `SortState` | Active sort column + direction |
| `grouping` | `GroupState` | Active grouping (up to 3 levels) |
| `columns` | `ColumnConfig[]` | Visible columns + order |
| `search` | `string` | Current search query |
| `pagination` | `PaginationState` | Page index, page size |

Actions: `setFilter()`, `setSort()`, `setGroup()`, `setSearch()`, `setPage()`, `toggleColumn()`. All actions update URL query parameters.

### Section Controller (Record View)

Each record section controller exposes:

| Property | Type | Purpose |
|----------|------|---------|
| `data` | `T` | Current section data |
| `initialData` | `T` | Snapshot from server |
| `isDirty` | `boolean` | Any field differs from initial |
| `isLoading` | `boolean` | Fetch or save in progress |
| `isSaving` | `boolean` | Save in progress |
| `errors` | `FieldErrors` | Per-field validation errors |
| `validationState` | `ValidationState` | Overall validation status |

Actions: `setField()`, `validate()`, `save()`, `reset()`, `reload()`.

## Structure

```
modules/{name}/
├── controller/
│   ├── use-{name}-list-controller.ts      ← List controller hook
│   ├── use-{name}-primary-controller.ts   ← Primary section controller
│   └── use-{name}-{section}-controller.ts ← Additional section controllers
```

Controllers are React hooks that compose shared engine hooks (`useConfiguredTableState`, `useRecordSectionController`) with module-specific configuration.

## Anti-Patterns

1. **Do not** fetch data directly in UI components — route through controllers.
2. **Do not** store UI state that should be in the URL (filters, sort, page) in React state.
3. **Do not** put business validation in controllers — delegate to domain schemas.
4. **Do not** call API routes directly from components — controllers handle transport.
5. **Do not** build custom table or form state management — use the shared engine hooks.

## Related Docs

- [UI.md](UI.md) — presentational layer that consumes controllers
- [TRANSPORT.md](TRANSPORT.md) — how controllers communicate with the backend
- [../module-anatomy/shared/LIST_VIEW_ENGINE.md](../module-anatomy/shared/LIST_VIEW_ENGINE.md) — shared list engine
- [../module-anatomy/shared/RECORD_VIEW_ENGINE.md](../module-anatomy/shared/RECORD_VIEW_ENGINE.md) — shared record engine
