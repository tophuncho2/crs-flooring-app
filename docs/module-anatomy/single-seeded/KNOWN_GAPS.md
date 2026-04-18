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

## `data/queries.ts` structure is inconsistent

`QUERIES.md` states that `data/queries.ts` is "a thin wrapper around `@builders/db` read functions that adds `withPrismaConnectivityHandling`." The example shows the wrapper defined inside the module.

Current reality diverges between the two references:

- `apps/web/modules/categories/data/queries.ts` — defines `getCategoriesPageData` locally, calls `withPrismaConnectivityHandling(() => listCategories())` inline. Matches the doc.
- `apps/web/modules/unit-of-measures/data/queries.ts` — is a pure re-export of `{ listUnitOfMeasures, getUnitOfMeasuresPageData }` from `@builders/db`. The wrapper function actually lives at `packages/db/src/flooring/unit-of-measures/read-repository.ts:46-50`.

This inverts the boundary: the db layer owns the page-data wrapper for UoM, and the module's `data/queries.ts` is empty of logic. Decide the canonical home (module vs db layer) and align both modules.

## Tool slug import is inconsistent

`app/API.md` canonical import set includes `{NAME}_TOOL_SLUG` from `@/modules/shared/access/lookup-domains`.

- `apps/web/app/api/categories/route.ts:2` imports `CATEGORIES_TOOL_SLUG`. Matches.
- `apps/web/app/api/builder/unit-of-measures/route.ts` imports no tool slug constant. Line 11 hard-codes `toolSlug: "products"` as a string literal. Besides the stringly-typed constant, the slug is `"products"` — UoM is evidently nested under the products tool rather than having its own.

Two gaps: (a) named constant missing; (b) cross-tool namespacing — is UoM deliberately under `products`, or should it have its own slug?

## Response envelope key

`app/API.md` specifies a resource-keyed plural envelope (`{ categories: […] }`). Both routes use plural keys:

- categories → `{ categories: [...] }` ✓
- unit-of-measures → `{ unitOfMeasures: [...] }` (camelCase-plural)

Not a violation; noting the casing choice for cross-module consistency. If future single-seeded modules ship a multi-word name, decide whether the envelope key uses camelCase (as UoM does) or some other convention.

## Controller shape divergence

`controllers/CONTROLLERS.md` flags this but it remains unresolved:

- `apps/web/modules/categories/controllers/use-categories-list-controller.ts` returns `{ rows }`.
- `apps/web/modules/unit-of-measures/controllers/use-unit-of-measures-list-controller.ts` returns `{ rows, notices }` (imports `useRecordNotices`).

Adopt `notices` across both or drop it from UoM.

## Scaffold slot divergence

`components/list/COMPONENTS.md` flags this but it remains unresolved:

- UoM's list client includes a `notices` slot on `DashboardListPageScaffold` fed by the controller's notices.
- Categories' list client omits it.

Follows the controller shape decision above.

## Module `CLAUDE.md` link rot

- Add more context to claude.mds in web/modules

## module/anatomy/shared/loader-options

- UOM and CATEGORIES will need dropdowns through the system
- Cananicol set up for each drop down will be in the shared engines data folder
- Docs/ for the shared dropdown loaders will be in module/anatomy/shared/loader-options
- Dashboard renders load time should not be the sum of both the page and loaders render time, render time should = whichever load last.
- 2 loaders set up effiiciently and reported in docs/
- Ask questions before starting this
