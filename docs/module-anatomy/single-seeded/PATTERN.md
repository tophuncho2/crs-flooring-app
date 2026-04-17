# Single-Seeded — PATTERN

> **Scope:** Contract every single-seeded (read-only reference data) module must follow.
> **Reference implementations:** `categories`, `unit-of-measures`.

## Rules

1. Read-only. The module exposes a list view only — no create, edit, or delete UI.
2. Seed data is the source of truth. Rows come from a seed script; the application never writes.
3. Uses the shared list view engine. The module does not build its own table infrastructure.
4. Server Components in `page.tsx` call server-side queries under `data/queries.ts`. UI components never call APIs directly.
5. Module folder is self-contained. All module-specific code lives within `apps/web/modules/{name}/`.

## Anti-Patterns

1. **Do not** add mutation routes (`POST`, `PATCH`, `DELETE`) — single-seeded data is immutable at runtime.
2. **Do not** add a create page, detail page, or record panel. Reference data has no record view.
3. **Do not** add a primary or record controller — only a list controller is allowed.
4. **Do not** build a custom table or filter component — configure the shared list view engine.
5. **Do not** write to the table from application code — all rows come from the seed script.
6. **Do not** promote a single-seeded module to single-section in place. Migrate the table under a new pattern and retire the old module.

## Known Gaps / Grading

Module-type-wide gaps are tracked in [KNOWN_GAPS.md](KNOWN_GAPS.md). Individual module violations live in each module's own grading file under [`modules/{name}/GRADING.md`](modules/).

## Subfolder References

Each subfolder under `single-seeded/` documents one slice of the pattern, grounded in the swept references (`categories`, `unit-of-measures`):

- [`app/API.md`](app/API.md) — the `apps/web/app/api/{name}/route.ts` shape for single-seeded.
- [`app/DASHBOARD.md`](app/DASHBOARD.md) — the `apps/web/app/dashboard/{name}/page.tsx` shape for single-seeded.
- [`controllers/CONTROLLERS.md`](controllers/CONTROLLERS.md) — the `apps/web/modules/{name}/controllers/` list-controller contract.
- [`components/list/COMPONENTS.md`](components/list/COMPONENTS.md) — the `apps/web/modules/{name}/components/list/` client + table conventions.
- [`data/SEED.md`](data/SEED.md) — the seed pipeline under `packages/db/src/seed/` and `packages/db/scripts/`.
- [`data/READS.md`](data/READS.md) — the read repository under `packages/db/src/flooring/{name}/`.
- [`modules/TYPES.md`](modules/TYPES.md) — where `types.ts` lives for single-seeded and who imports it.
- [`modules/`](modules/) — per-module folders with `GRADING.md`, `PLANS.md`, and legacy module references.
- [`../QUERIES.md`](../QUERIES.md) — cross-type role of `data/queries.ts` (used by the dashboard page).
