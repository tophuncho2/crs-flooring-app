# Single-Seeded — KNOWN GAPS

> Deviations observed in the reference implementations (`categories`, `unit-of-measures`). Paired with `PATTERN.md`.

- API route location is inconsistent between the two reference modules:
  - `categories` ships `apps/web/app/api/categories/route.ts` (GET). Flat path under `api/`.
  - `unit-of-measures` ships `apps/web/app/api/builder/unit-of-measures/route.ts` (GET). Nested under a `builder/` segment — an outlier; no other reference module uses this prefix.
  Pick one convention (flat `api/{name}` is the majority) and migrate.
