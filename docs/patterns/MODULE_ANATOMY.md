# Module Anatomy

> **Scope:** What a feature module looks like — folder structure, required components, route conventions.
> **Status:** Active

## Rules

1. Every feature module uses the shared engines (list view, record view) — no module builds its own table or form infrastructure.
2. Every module has a controller layer — UI components do not call APIs directly.
3. Route structure follows the convention: `/dashboard/{name}` (list), `/dashboard/{name}/[id]` (record), `/dashboard/{name}/new` (create).
4. Server-side data functions live in `data/` — these are called from Server Components in `page.tsx` files.
5. Module folders are self-contained — all module-specific code lives within the module directory.

## Contract

### Required Module Structure

```
modules/{name}/
├── controller/
│   ├── use-{name}-list-controller.ts       ← List controller (composes useConfiguredTableState)
│   ├── use-{name}-primary-controller.ts    ← Primary section controller
│   └── use-{name}-{section}-controller.ts  ← Additional section controllers (optional)
├── data/
│   ├── server-records.ts                   ← Server-side queries for SSR (page.tsx)
│   └── server-mutations.ts                 ← Server-side mutation helpers (optional)
├── components/
│   ├── list/
│   │   ├── {name}-client.tsx               ← Client wrapper with controller hook
│   │   ├── {name}-table.tsx                ← Column definitions + table config
│   │   └── {name}-filters.tsx              ← Filter panel definitions (optional)
│   └── record/
│       ├── {name}-detail-client.tsx         ← Client wrapper for record view
│       ├── {name}-primary.tsx               ← Primary section form
│       └── {name}-{section}.tsx             ← Additional section forms (optional)
└── views/                                   ← Page-level compositions (optional)
```

### Route Structure

```
app/dashboard/{name}/
├── page.tsx                    ← List page (Server Component → Client wrapper)
├── [id]/
│   └── page.tsx                ← Record page (Server Component → Client wrapper)
└── new/
    └── page.tsx                ← Create page (optional, some modules use modals)
```

### API Route Structure

```
app/api/flooring/{name}/
├── route.ts                    ← GET (list) + POST (create)
└── [id]/
    ├── route.ts                ← GET (read) + PATCH (update) + DELETE (delete)
    └── {sub-resource}/
        └── route.ts            ← Sub-resource operations
```

## Patterns

Current modules following this anatomy:

| Module | List | Record | Create | Sections |
|--------|:----:|:------:|:------:|----------|
| Categories | Y | Y | Modal | Primary |
| Contacts | Y | Y | - | Primary |
| Imports | Y | Y | Y | Primary |
| Manufacturers | Y | Y | Y | Primary |
| Products | Y | Y | Y | Primary |
| Services | Y | Y | - | Primary |
| Templates | Y | Y | Y | Primary, Items, Sales Reps, Service Items |
| Unit of Measures | Y | Y | Y | Primary |
| Work Orders | Y | Y | - | Primary, Items, Sales Reps, Service Items, Allocations |
| Warehouse | Y | Y | - | Primary |

## Anti-Patterns

1. **Do not** build custom table or form infrastructure in a module — use the shared engines.
2. **Do not** call APIs directly from UI components — route through controllers.
3. **Do not** put module-specific code outside the module folder (except routes and shared engine extensions).
4. **Do not** create modules without a controller layer.
5. **Do not** deviate from the route naming convention without a documented reason.

## Related Docs

- [../engines/LIST_VIEW_ENGINE.md](../engines/LIST_VIEW_ENGINE.md) — list engine that modules configure
- [../engines/RECORD_VIEW_ENGINE.md](../engines/RECORD_VIEW_ENGINE.md) — record engine that modules configure
- [../layers/CONTROLLER.md](../layers/CONTROLLER.md) — controller contracts
