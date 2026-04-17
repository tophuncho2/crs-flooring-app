# Module Anatomy

> **Scope:** What a feature module looks like — folder structure, required components, route conventions.


## Rules

1. Every feature module uses the shared engines (list view, record view) — no module builds its own table or form infrastructure.
2. Every module has a controller layer — UI components do not call APIs directly.
3. Route structure follows the convention: `/dashboard/{name}` (list), `/dashboard/{name}/[id]` (record), `/dashboard/{name}/new` (create). -   - categories and unit-of-measures have only page.tsx — no [id] or new.
4. Server-side data functions live in `data/` — these are called from Server Components in `page.tsx` files.
5. Module folders are self-contained — all module-specific code lives within the module directory.

## Contract

Module structure, dashboard routes, and API routes are specified per module type. Pick the type that matches the feature and follow its `PATTERN.md`:

- [single-seeded/PATTERN.md](single-seeded/PATTERN.md) — read-only reference data (e.g. `categories`, `unit-of-measures`)
- [single-section/PATTERN.md](single-section/PATTERN.md) — full CRUD with one editable primary section (e.g. `manufacturers`, `contacts`, `services`, `admin`)
- [multi-section/PATTERN.md](multi-section/PATTERN.md) — full CRUD with multiple child entities saved atomically via a diff payload (e.g. `warehouse`)

Each type's `PATTERN.md` defines the exact `modules/{name}/`, `app/dashboard/{name}/`, and `app/api/{name}/` shapes required for that type, plus the anti-patterns specific to it. The rules in this file apply to every type.

## Anti-Patterns

1. **Do not** build custom table or form infrastructure in a module — use the shared engines.
2. **Do not** call APIs directly from UI components — route through controllers.
3. **Do not** put module-specific code outside the module folder (except routes and shared engine extensions).
4. **Do not** create modules without a controller layer.
5. **Do not** deviate from the route naming convention without a documented reason.

## Related Docs

- [shared/LIST_VIEW_ENGINE.md](shared/LIST_VIEW_ENGINE.md) — list engine that modules configure
- [shared/RECORD_VIEW_ENGINE.md](shared/RECORD_VIEW_ENGINE.md) — record engine that modules configure
- [../layers/controller/CONTROLLER.md](../layers/controller/CONTROLLER.md) — controller contracts
