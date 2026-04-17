# Single-Seeded — Seed Pipeline

> How rows land in the database for single-seeded modules. Evidence: `packages/db/src/seed/{categories,unit-of-measures}.ts` + `packages/db/scripts/seed-{categories,unit-of-measures}.js`.

## Two files per module

1. **Canonical TypeScript source** — `packages/db/src/seed/{name}.ts`
   - Exports a typed const array, e.g. `SEEDED_CATEGORIES`, `SEEDED_UNIT_OF_MEASURES`.
   - `as const` tuple so the type can be derived: `type SeededCategory = (typeof SEEDED_CATEGORIES)[number]`.
   - This is the source of truth for what rows exist. Changing the data means editing this file.

2. **Idempotent CommonJS seed script** — `packages/db/scripts/seed-{name}.js`
   - Pure Node (no TypeScript, no bundler) so it can run via `node` in any environment.
   - Duplicates the canonical array literally inside the script.
   - Includes a `verifySyncWithTypeScriptSource()` step that parses the `.ts` source with a regex and asserts every entry matches the in-script copy. The script fails loudly if the two drift.
   - Upserts each row (find-by-slug, then create or update) so re-running is safe.

## Contract

- Runtime never writes to these tables. No `POST`/`PATCH`/`DELETE` routes, no use cases, no application code performs inserts. See `PATTERN.md` Rule 2.
- Only the seed script is allowed to mutate. Any drift between the script and the DB must be resolved by re-running the seed, not by application code.
- The `.ts` file is the canonical source; the `.js` mirror exists only because the seed script must run without a TS compile step. The sync-verification in the script enforces that invariant.

## Anti-patterns

1. **Do not** edit only the `.js` script. Edit the `.ts` source first, then mirror the change into the `.js` script. The verifier will catch a one-sided edit on the next run.
2. **Do not** add a seed script that is not idempotent. Re-running must produce the same final state.
3. **Do not** reference Prisma models directly in the `.ts` source. The canonical array is plain data (slugs and strings) — Prisma types belong to the script/repository side.
