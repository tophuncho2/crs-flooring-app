# Single-Seeded — KNOWN GAPS

> Gaps that apply to the single-seeded pattern as a whole. Module-specific violations live in each module's `GRADING.md`.

## Sweep status

**Swept:**
- `categories`
- `unit-of-measures`

**Not swept:**
- (none — every single-seeded module currently in the app has been swept)

## API route location

- `categories` ships `apps/web/app/api/categories/route.ts` (GET). Flat path under `api/`.
- `unit-of-measures` ships `apps/web/app/api/builder/unit-of-measures/route.ts` (GET). Nested under a `builder/` segment — an outlier; no other reference module uses this prefix.

Pick one convention (flat `api/{name}` is the majority) and migrate.

## Dashboard reaches into the application layer

Single-seeded dashboards are otherwise read-only against `@builders/db`, but every page currently imports one application-layer function:

- `getResolvedUserTablePreference` from `@builders/application` (source: `packages/application/src/account/table-preferences.ts`)

Consumers:
- `apps/web/app/dashboard/categories/page.tsx:5`
- `apps/web/app/dashboard/unit-of-measures/page.tsx:5`

Not a violation — table preferences are a cross-cutting account-level use case, not an entity-specific one, and every swept dashboard (single-seeded and single-section) calls it. Flagged so the "single-seeded touches no use cases" mental model has the caveat documented.
