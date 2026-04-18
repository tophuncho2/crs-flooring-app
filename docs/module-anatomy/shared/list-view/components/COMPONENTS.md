# UI Layer

> **Scope:** Strictly presentational. Components render props and controller state. No data fetching, no business logic.
> **Package:** `apps/web/modules/` (per-module `components/` and `views/` directories)


## Rules

1. UI components are strictly presentational — no data fetching, no business logic, no direct API calls.
2. All state flows through controllers. Components receive props or read controller state.
3. Components do not reach into controller internals — they consume the published interface only.
4. No inline data fetching outside the controller pattern.
5. Server Components handle initial data loading in `page.tsx` files and pass data as props.
6. Client Components consume controller hooks for interactive behavior.

## Contract

UI components follow one of two patterns:

**Page-level view (Server Component):**
```typescript
// apps/web/app/dashboard/{module}/page.tsx
export default async function ModuleListPage() {
  const user = await requireSessionUser()
  const data = await getServerSideData()
  return <ModuleListClient initialData={data} />
}
```

**Client component (consumes controller):**
```typescript
// modules/{name}/components/list/{name}-client.tsx
function ModuleListClient({ initialData }) {
  const controller = useModuleListController({ initialData })
  return <ListViewShell controller={controller} />
}
```

## Structure

```
modules/{name}/
├── components/
│   ├── list/
│   │   ├── {name}-client.tsx       ← Client wrapper with controller
│   │   ├── {name}-table.tsx        ← Table configuration
│   │   └── {name}-filters.tsx      ← Filter panel configuration
│   └── record/
│       ├── {name}-detail-client.tsx ← Client wrapper for record view
│       ├── {name}-primary.tsx       ← Primary section form
│       └── {name}-{section}.tsx     ← Additional section forms
└── views/
    ├── {name}-list-view.tsx         ← Page-level list composition
    └── {name}-record-view.tsx       ← Page-level record composition
```

Shared presentational components live in:
```
modules/shared/engines/
├── list-view/       ← Table shell, controls, column rendering
├── record-view/     ← Section shells, form layouts, save controls
└── common/display/  ← Badges, status indicators, formatters
```

## Anti-Patterns

1. **Do not** call `fetch()` or any API from UI components — route through controllers.
2. **Do not** put conditional business logic in components — delegate to domain or controllers.
3. **Do not** build custom table or form rendering — use the shared engine components.
4. **Do not** manage data state in component-local `useState` when it should be in the controller.
5. **Do not** import from `packages/application/` or `packages/db/` in client components.

## Related Docs

- [../controllers/CONTROLLERS.md](../controllers/CONTROLLERS.md) — controllers that components consume
- [../LIST_VIEW_ENGINE.md](../LIST_VIEW_ENGINE.md) — shared list view components
- [../../record-view/RECORD_VIEW_ENGINE.md](../../record-view/RECORD_VIEW_ENGINE.md) — shared record view components
