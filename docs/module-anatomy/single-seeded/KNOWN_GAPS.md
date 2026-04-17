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
