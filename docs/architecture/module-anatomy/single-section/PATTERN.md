# Single-Section — PATTERN

> **Scope:** Contract every single-section module must follow. A single-section module has a list view and a record view with exactly one primary section — no multi-entity child diffs.
> **Reference implementations:** `manufacturers`, `contacts`, `services`, `admin`.

## Rules

1. Full CRUD. List + create + read + update + delete, all via the shared engines.
2. One primary section. The record view has exactly one editable section; no additional sections with independent dirty state.
3. Controllers mediate every API call. UI components never fetch directly.
4. Server Components in `page.tsx` call server-side queries under `data/queries.ts`. Client-side mutations go through `data/mutations.ts`.
5. Module folder is self-contained. All module-specific code lives within `apps/web/modules/{name}/`.

## Module Structure — `apps/web/modules/{name}/`

```
modules/{name}/
├── components/
│   ├── list/
│   │   ├── {name}-client.tsx                     ← Client wrapper; composes the list controller
│   │   └── {name}-table.tsx                      ← Column config for the shared list engine
│   └── record/
│       ├── {name}-detail-client.tsx              ← Client wrapper for the record view
│       ├── {name}-create-client.tsx              ← Client wrapper for the create view
│       ├── {name}-primary-fields-section.tsx     ← Field body for the primary section
│       └── {name}-record-panel.tsx               ← Record layout shell (composes the section)
├── controller/                                   ← singular folder name for single-section
│   ├── use-{name-plural}-list-controller.ts      ← List controller
│   └── use-{name}-primary-section.ts             ← Primary section controller
│                                                    (admin uses `use-{name}-primary-controller.ts`;
│                                                     see Known gaps)
└── data/
    ├── queries.ts                                ← Server-side reads
    └── mutations.ts                              ← Client-side mutation helpers
```

Module-specific files (e.g. `services/data/load-unit-options.ts`, `admin/controller/types.ts`) are permitted when scoped strictly to the module's own needs.

## Dashboard Routes — `apps/web/app/dashboard/{name}/`

```
dashboard/{name}/
├── page.tsx                    ← List page
├── [id]/
│   └── page.tsx                ← Record page
└── new/
    └── page.tsx                ← Create page
```

Admin nests one level deeper (`dashboard/admin/users/{page.tsx, [id]/page.tsx, new/page.tsx}`) because `admin` is a tool scope, not a feature name. The same three-page shape applies within the sub-path.

## API Routes — `apps/web/app/api/{name}/`

```
api/{name}/
├── route.ts                            ← GET (list), POST (create)
├── [id]/
│   ├── route.ts                        ← GET (read), PATCH (update), DELETE
│   └── primary/
│       └── section/
│           └── route.ts                ← PATCH: primary-section batch update
└── _validators.ts                      ← Input validators shared across the routes
```

Admin uses a narrower shape (`api/admin/users/route.ts`, `api/admin/users/[id]/route.ts`) with no `primary/section` route and no `_validators.ts`, consistent with Accepted Exception 1 (admin endpoints skip optimistic concurrency).

## Anti-Patterns

1. **Do not** introduce a diff payload. If child rows need an atomic save, upgrade to multi-section — do not bolt it onto single-section.
2. **Do not** add a second editable section with independent dirty state. Single-section means one primary section.
3. **Do not** call APIs from UI components. All fetches flow through the controller.
4. **Do not** build a custom table or form — use the shared list and record engines.
5. **Do not** put business rules in controllers. Predicates, message builders, and normalizers live in `packages/domain/`.
6. **Do not** skip `_validators.ts` unless the module follows the admin exception. Input parsing belongs at the route boundary.
7. **Do not** mix plural and singular folder names. Single-section uses `controller/` (singular).

## Known gaps

Tracked in [KNOWN_GAPS.md](KNOWN_GAPS.md).

## Related Docs

- [../MODULE_ANATOMY.md](../MODULE_ANATOMY.md)
- [../shared/list-view/LIST_VIEW_ENGINE.md](../shared/list-view/LIST_VIEW_ENGINE.md)
- [../shared/record-view/RECORD_VIEW_ENGINE.md](../shared/record-view/RECORD_VIEW_ENGINE.md)
- [../shared/list-view/controllers/CONTROLLERS.md](../shared/list-view/controllers/CONTROLLERS.md)
