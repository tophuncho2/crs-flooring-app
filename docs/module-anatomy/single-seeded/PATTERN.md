# Single-Seeded — PATTERN

> **Scope:** Contract every single-seeded (read-only reference data) module must follow.
> **Reference implementations:** `categories`, `unit-of-measures`.

## Rules

1. Read-only. The module exposes a list view only — no create, edit, or delete UI.
2. Seed data is the source of truth. Rows come from a seed script; the application never writes.
3. Uses the shared list view engine. The module does not build its own table infrastructure.
4. Server Components in `page.tsx` call server-side queries under `data/queries.ts`. UI components never call APIs directly.
5. Module folder is self-contained. All module-specific code lives within `apps/web/modules/{name}/`.

## Module Structure — `apps/web/modules/{name}/`

```
modules/{name}/
├── CLAUDE.md                                ← Module-level rules (optional but present in references)
├── components/
│   └── list/
│       ├── {name}-client.tsx                ← Client wrapper; composes the list controller
│       └── {name}-table.tsx                 ← Column config for the shared table
├── controllers/                             ← plural folder name for single-seeded
│   └── use-{name}-list-controller.ts        ← Only a list controller; no record/primary controller
├── data/
│   └── queries.ts                           ← Server-side reads; no mutation helpers
└── types.ts                                 ← Row/filter types used by the list
```

## Dashboard Routes — `apps/web/app/dashboard/{name}/`

```
dashboard/{name}/
└── page.tsx                                 ← List page only. No [id]/page.tsx, no new/page.tsx.
```

## API Routes — `apps/web/app/api/{name}/`

```
api/{name}/
└── route.ts                                 ← GET only. No POST, PATCH, DELETE.
```

No mutation routes. No `[id]/route.ts`. No `_validators.ts`. Some single-seeded modules may skip the API route entirely and rely on server-side queries from `page.tsx` only — this is acceptable when nothing client-side needs to refetch.

## Anti-Patterns

1. **Do not** add mutation routes (`POST`, `PATCH`, `DELETE`) — single-seeded data is immutable at runtime.
2. **Do not** add a create page, detail page, or record panel. Reference data has no record view.
3. **Do not** add a primary or record controller — only a list controller is allowed.
4. **Do not** build a custom table or filter component — configure the shared list view engine.
5. **Do not** write to the table from application code — all rows come from the seed script.
6. **Do not** promote a single-seeded module to single-section in place. Migrate the table under a new pattern and retire the old module.

## Known gaps

Tracked in [KNOWN_GAPS.md](KNOWN_GAPS.md).

## Related Docs

- [../MODULE_ANATOMY.md](../MODULE_ANATOMY.md)
- [../shared/LIST_VIEW_ENGINE.md](../shared/LIST_VIEW_ENGINE.md)
- [../../layers/controller/CONTROLLER.md](../../layers/controller/CONTROLLER.md)
