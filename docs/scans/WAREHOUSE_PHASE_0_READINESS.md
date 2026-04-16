# Warehouse Phase 0 — Readiness Scan

**Date:** 2026-04-16
**Scope:** Read-only audit to verify safety of the Phase 0 schema migration that adds `slug` to `FlooringWarehouse` and `FlooringSection`, and changes `FlooringSection.warehouse` + `FlooringLocation.warehouse` `onDelete` from `Cascade` to `Restrict`.

---

## Section 1 — Current Data State Verification

### 1.1 Reference-test-data and seed

**Only inserter of warehouse/section/location rows:**
- `packages/db/scripts/reference-test-data.js:750` — `prisma.flooringWarehouse.upsert(...)`
- `packages/db/scripts/reference-test-data.js:770` — `createOrUpdateByWhere({ model: prisma.flooringSection, ... })`
- `packages/db/scripts/reference-test-data.js:790` — `createOrUpdateByWhere({ model: prisma.flooringLocation, ... })`

**`packages/db/scripts/seed.js:1-33`** does NOT insert warehouse/section/location rows. It only calls `seedSystemUsers`, `seedUnitOfMeasures`, and `seedCategories` (lines 13, 19, 23).

**Every other script under `packages/db/scripts/` and whether it touches warehouse/section/location tables:**
| File | Touches warehouse/section/location? |
|---|---|
| `packages/db/scripts/admin-recovery.js` | No — user promotion only (file head confirms) |
| `packages/db/scripts/backfill-product-names.js` | No — reads `flooringProduct` only (line 26) |
| `packages/db/scripts/guard-prisma.js` | No — static FS validation only (line 1-10) |
| `packages/db/scripts/owner-recovery.js` | No — user upsert only |
| `packages/db/scripts/reference-test-data.js` | YES (lines 750, 770, 790) |
| `packages/db/scripts/seed-categories.js` | No — `flooringCategory` + `flooringUnitOfMeasure` only |
| `packages/db/scripts/seed-unit-of-measures.js` | No — `flooringUnitOfMeasure` only |
| `packages/db/scripts/seed.js` | No — calls the three seeders above only |
| `packages/db/scripts/system-user-seed.js` | No — users only |

**Files under `packages/db/prisma/seed*`:** None exist. `packages/db/prisma/` contains only `migrations/`, `migrations_archive_20260413_223938/`, `recovery/`, and `schema.prisma`. The Prisma `seed` hook is wired in `packages/db/package.json:40` → `scripts/seed.js`.

### 1.2 Migration history state

Migration directories under `packages/db/prisma/migrations/`, in order:
1. `20260414031000_baseline`
2. `20260416050440_add_category_slug_drop_category_code`

**Most recent migration:** `20260416050440_add_category_slug_drop_category_code` (2026-04-16 05:04:40).
**Provider:** `packages/db/prisma/migrations/migration_lock.toml:3` → `provider = "postgresql"`.

**Migrations that reference `flooring_warehouse`, `flooring_section`, or `flooring_location`:**
- `packages/db/prisma/migrations/20260414031000_baseline/migration.sql:324` — `CREATE TABLE "flooring_warehouse"`
- `.../migration.sql:336` — `CREATE TABLE "flooring_section"`
- `.../migration.sql:347` — `CREATE TABLE "flooring_location"`
- `.../migration.sql:675` — `flooring_warehouse_name_key` unique
- `.../migration.sql:678` — `flooring_section_warehouseId_name_key` unique
- `.../migration.sql:684` — `flooring_location_warehouseId_locationCode_key` unique
- `.../migration.sql:897` — `flooring_section … FOREIGN KEY ("warehouseId") … ON DELETE CASCADE`
- `.../migration.sql:900` — `flooring_location … FOREIGN KEY ("warehouseId") … ON DELETE CASCADE`
- `.../migration.sql:903` — `flooring_location … FOREIGN KEY ("sectionId") … ON DELETE RESTRICT`

`20260416050440_add_category_slug_drop_category_code/migration.sql` does NOT reference warehouse/section/location tables.

### 1.3 Environment files

Repo root (`/Users/j.otto/Code Projects/CRS/builderswebapp/`):
- `.env`, `.env.example`, `.env.production`, `.env.staging`

`packages/db/`: **no `.env*` files present** (only `run-with-root-env.mjs`, a loader script — all db scripts reach up to the repo root `.env` via `DOTENV_CONFIG_PATH=../../.env`, see `packages/db/package.json:23-37`).

**`packages/db/package.json` db-related scripts (`:22-38`):**
- `db:generate` — `prisma generate`
- `db:migrate:dev` — `prisma migrate dev --skip-seed`
- `db:deploy` — `prisma migrate deploy`
- `db:reset` — `prisma migrate reset --force --skip-seed`
- `db:seed` — `prisma db seed` (runs `scripts/seed.js` per `prisma.seed` field, line 40)
- `db:studio` — `prisma studio`
- `db:seed:reference-test-data` — `node … scripts/reference-test-data.js`
- `db:seed:uoms`, `db:seed:categories` — hardened reference data seeders
- `db:backfill:product-names`, `db:promote-admin`, `db:upsert-owner`, `guard:prisma`

---

## Section 2 — Slug Helper Location

### 2.1 Existing slug utilities

Grep across the entire codebase for `slugify`, `toSlug`, `generateSlug`, `makeSlug`:
- **No matches.** (Verified via Grep with pattern `slugify|toSlug|generateSlug|makeSlug` — zero files returned.)

Glob for files with "slug" in the filename under `packages/domain/src/shared/` or `packages/lib/src/`:
- **No matches.** `packages/domain/src/shared/` contains only: `address-helpers.ts`, `date-format.ts`, `inventory-allocation-totals.ts`, `line-totals.ts`, `product-display-name.ts`, `record-calculation-rows.ts`, `record-expense-summary.ts`, `record-sales-reps.ts`, `record-summary.ts`, `table-preferences.ts`. `packages/lib/src/` contains only: `index.ts`, `redis.ts`, `request-json.ts`, `storage.ts`, `structured-logging.ts`.

**Conclusion:** No slug helper exists anywhere in the codebase. Nothing to import or reuse; Phase 0 must decide whether to author one.

### 2.2 Slug usage in hardened modules

**Categories** (`packages/db/src/seed/categories.ts:1-14`): slugs are **HARDCODED** in the `SEEDED_CATEGORIES` canonical list. Only one entry today: `{ slug: "vinyl-plank", name: "Vinyl Plank", ... }`.

**Unit of Measures** (`packages/db/src/seed/unit-of-measures.ts:1-15`): slugs are **HARDCODED** in `SEEDED_UNIT_OF_MEASURES` (11 entries, e.g. `{ slug: "linear-feet", name: "Linear Feet", abbreviation: "lf" }`).

Neither module generates slugs at runtime — both are reference data with a fixed canonical list, validated by a sync-verification regex in the corresponding `.js` seeder (`packages/db/scripts/seed-categories.js:24-60` and `packages/db/scripts/seed-unit-of-measures.js:22-53`).

**Pattern implication for Phase 0:** If Phase 0 treats warehouses as reference data with a fixed canonical list, the same hardcode-in-blueprints approach applies and no slug helper is needed. If user-created warehouses (via `createWarehouseRow` at `apps/web/modules/warehouse/api.ts:58-69`) must also produce slugs, a runtime helper (with collision suffixing) becomes required. The existing modules provide no precedent either way because they don't allow user-created rows.

---

## Section 3 — FK Cascade → Restrict Impact

### 3.1 Current cascade reliance

All call sites of `*.delete` / `*.deleteMany` on warehouse/section/location models:

| File:line | Call | Relies on cascade? |
|---|---|---|
| `apps/web/modules/warehouse/api.ts:118` | `db.flooringWarehouse.delete({ where: { id } })` | **No.** Lines 106-116 pre-check `_count.workOrders`, `_count.locations`, `_count.sections` and throw 409 if any > 0. |
| `apps/web/modules/warehouse/api.ts:225` | `db.flooringSection.delete({ where: { id } })` | **No.** Line 221 pre-checks `_count.locations` and throws 409 if > 0. |
| `apps/web/modules/warehouse/api.ts:337` | `db.flooringLocation.delete({ where: { id } })` | N/A — leaf, no children to cascade. |
| `apps/web/tests/modules/warehouse/warehouse-sections.test.ts:224,241,257` | `prismaMock.flooringSection.delete` assertions | Tests the 409 pre-check + happy path against a mock; does not exercise cascade semantics. |
| `apps/web/tests/modules/warehouse/warehouse-locations.test.ts:353` | `prismaMock.flooringLocation.delete` assertion | Happy-path mock assertion; not cascade-dependent. |

**No `deleteMany` call anywhere** on `flooringWarehouse`, `flooringSection`, or `flooringLocation` (Grep confirmed: 0 matches for `*.deleteMany` on these models).

### 3.2 Cascade behavior in tests

Grep for `onDelete: Cascade` across the codebase — all 15 matches are in `packages/db/prisma/schema.prisma`. **No test file references `onDelete: Cascade`.**

### 3.3 Post-change behavior

**App delete paths:** `deleteWarehouseRow` at `apps/web/modules/warehouse/api.ts:87-126` already pre-checks `sections > 0`, `locations > 0`, `workOrders > 0`. Because it blocks the delete before reaching the DB when children exist, the DB-level cascade has never fired for this path. Changing Cascade→Restrict is a no-op for user-initiated deletes from the app.

**`reference-test-data.js` cleanup:** The script has **no `deleteMany`** and **no `delete`** calls on warehouse/section/location (full-file grep confirmed). It uses `prisma.flooringWarehouse.upsert` (line 750) and `createOrUpdateByWhere` for section/location (lines 769-808). Cleanup between runs is done externally by `db:reset` (`packages/db/package.json:26` → `prisma migrate reset --force --skip-seed`), which drops and recreates the schema entirely — Restrict is irrelevant there.

**Net impact:** The FK change is safe. No call site in app code, scripts, or tests relies on the old cascade semantics.

---

## Section 4 — Test Fixture Inventory

### 4.1 Hardcoded slug references in tests

Grep for candidate slug strings (`north-warehouse|central-warehouse|south-warehouse|main-stock|north_warehouse|central_warehouse|south_warehouse`) under `apps/web/tests/` and `packages/*/tests/`: **zero matches**.

### 4.2 WAREHOUSE_BLUEPRINTS consumers

All files that import or reference `WAREHOUSE_BLUEPRINTS`:
- `packages/db/scripts/reference-test-data.js:238` — declaration
- `packages/db/scripts/reference-test-data.js:284, 382, 1047` — internal uses + re-export
- `docs/scans/WAREHOUSE_SCAN.md:538, 542` — documentation references only

`apps/web/tests/shared/reference-test-data.test.ts` imports the *module* and asserts on `data.warehouses.length === DEFAULT_WAREHOUSE_COUNT` (line 37) and on `data.warehouses[0]?.name === "QA North Warehouse"` (line 52), but does not import the `WAREHOUSE_BLUEPRINTS` constant directly.

**No production code imports `WAREHOUSE_BLUEPRINTS`.**

### 4.3 Tests that assert on warehouse.slug or section.slug today

Grep for `.slug` under `apps/web/tests/modules/warehouse/` — **zero matches**. As expected: the column doesn't exist yet.

---

## Section 5 — Prisma Client Regeneration Impact

### 5.1 Files that reference warehouse/section/location Prisma accessors

No `.ts`/`.tsx` file **imports** `FlooringWarehouse`, `FlooringSection`, or `FlooringLocation` as a **type** from `@prisma/client` (the single match for `FlooringWarehouse` in `apps/web/app/dashboard/warehouse/page.tsx:8` is a React component function name: `FlooringWarehousePage`, not a type import).

Files that reference the runtime model accessors (`flooringWarehouse`, `flooringSection`, `flooringLocation`) — all will automatically pick up the new `slug` field after `prisma generate`:

- `apps/web/modules/warehouse/api.ts` (primary warehouse module)
- `apps/web/modules/warehouse/queries.ts`
- `apps/web/modules/templates/queries.ts`
- `apps/web/modules/properties/queries.ts`
- `apps/web/modules/inventory/data/queries.ts`
- `apps/web/modules/inventory/data/api.ts`
- `apps/web/modules/imports/data/queries.ts`
- `apps/web/modules/imports/data/api.ts`
- `apps/web/modules/work-orders/queries.ts`
- `apps/web/modules/shared/engines/common/transport/record-detail-options-loader.ts`
- `apps/web/app/api/warehouses/route.ts`
- `apps/web/app/api/warehouses/[id]/route.ts`
- `apps/web/app/api/sections/route.ts`
- `apps/web/app/api/sections/[id]/route.ts`
- `apps/web/app/api/locations/route.ts`
- `apps/web/app/api/locations/[id]/route.ts`
- `apps/web/server/inventory/location-integrity.ts`
- `apps/web/tests/modules/warehouse/warehouse-sections.test.ts`
- `apps/web/tests/modules/warehouse/warehouse-locations.test.ts`
- `apps/web/tests/modules/inventory/inventory-queries.test.ts`
- `apps/web/tests/modules/inventory/location-integrity.test.ts`
- `apps/web/tests/shared/reference-test-data.test.ts`
- `packages/db/scripts/reference-test-data.js`

**No file destructures a Prisma-generated warehouse/section/location type and enumerates its fields** (verified by absence of `FlooringWarehouse` type imports). Adding `slug` is additive and cannot break type consumers.

### 5.2 Prisma `select:` shapes touching warehouse/section

In `apps/web/modules/warehouse/api.ts`:

| Line | Context | Selects `name`? | After Phase 0 add `slug`? |
|---|---|---|---|
| `api.ts:7-21` (`warehouseSelect` constant) | list / create / update / get-detail warehouse | Yes | **Yes — required for list rows and record header.** |
| `api.ts:90-99` | `deleteWarehouseRow` pre-check | No (counts only) | No. |
| `api.ts:162-167` | `listSectionRows` output | Yes | **Yes — for section list display.** |
| `api.ts:179-184` | `createSectionRow` response | Yes | **Yes — new section needs slug echoed.** |
| `api.ts:196-201` | `updateSectionRow` response | Yes | **Yes — updated section needs slug echoed.** |
| `api.ts:210-214` | `deleteSectionRow` pre-check | No | No. |
| `api.ts:238-244` | `listLocationRows` (reads section.name via relation) | section.name only | Optional — location rows likely don't need section slug. |
| `api.ts:274-280`, `api.ts:311-317` | `createLocationRow` / `updateLocationRow` response (reads section.name via relation) | section.name only | Optional. |
| `api.ts:350` | `getSectionRowById` | Yes | **Yes if detail page renders slug.** |
| `api.ts:358` | `getLocationRowById` | No warehouse/section fields | No. |
| `api.ts:372-402` (`getWarehouseDetailRow` include) | Detail page — includes `sections` + `locations` | Yes (nested `name` in both) | **Yes for warehouse slug + each section slug.** |

In `apps/web/modules/warehouse/queries.ts:7-18`: `loadWarehouseRows` uses `include: { _count: ... }` (no explicit select on scalars), so Prisma returns all scalar fields by default — `slug` flows through automatically. The mapping at lines 20-32 would need to add `slug: warehouse.slug` to produce it on the row contract.

---

## Section 6 — Migration Strategy Recommendation

### 6.1 `migrate dev --create-only` vs `db push`
**Use `prisma migrate dev --create-only`.** Evidence: `packages/db/package.json:24` already defines `db:migrate:dev`, and the prior two migrations (`20260414031000_baseline`, `20260416050440_add_category_slug_drop_category_code`) are authored files under `packages/db/prisma/migrations/`. No `db push` usage in scripts. Authoring manually preserves the deterministic migration trail.

### 6.2 Backfill vs drop-and-recreate

The user has confirmed no production rows exist. **Evidence supporting that claim from code alone:**
- The only writer of warehouse rows is `reference-test-data.js` (Section 1.1), which is gated behind a dev-only script (`db:seed:reference-test-data`).
- The `prisma.seed` hook (`packages/db/package.json:40` → `seed.js`) does **not** call it.

However, **dev databases almost certainly contain seeded warehouse rows** (from manual runs of `db:seed:reference-test-data`). An `ADD COLUMN slug TEXT NOT NULL UNIQUE` against a non-empty table will fail.

**Recommended migration shape (safest, no data loss):**
1. `ALTER TABLE flooring_warehouse ADD COLUMN slug TEXT;`
2. `ALTER TABLE flooring_section ADD COLUMN slug TEXT;`
3. Backfill SQL (e.g. `UPDATE flooring_warehouse SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;` — with tail-uniquification) **or** `TRUNCATE flooring_warehouse, flooring_section, flooring_location, flooring_inventory, flooring_import_entry RESTART IDENTITY CASCADE;` (nuclear, only valid given confirmed zero production data).
4. `ALTER TABLE flooring_warehouse ALTER COLUMN slug SET NOT NULL;` + `CREATE UNIQUE INDEX flooring_warehouse_slug_key ...;`
5. `ALTER TABLE flooring_section ALTER COLUMN slug SET NOT NULL;` + `CREATE UNIQUE INDEX flooring_section_warehouseId_slug_key ...;`
6. Drop and re-add the two FK constraints with `ON DELETE RESTRICT` (lines 897 and 900 of baseline migration today).

Since dev data is regenerable from `reference-test-data.js`, and no production rows exist, **option B (defensive TRUNCATE of only the three tables + dependents) is acceptable**. Option A (backfill) is still preferred because it's idempotent across any developer's local DB regardless of whether they've seeded.

**Phase 0 should not trust "no production rows" as a license to skip backfill in the migration file itself** — the migration will also run against any developer's existing local DB, CI DB, and the staging/production DBs that currently lack these rows. A backfill SQL step adds ~5 lines and costs nothing on empty tables.

### 6.3 Can `reference-test-data.js` be updated in the same commit as the schema change?

**Yes — and it MUST be.** Evidence:
- `reference-test-data.js:750` calls `prisma.flooringWarehouse.upsert(...)` with `create: { name, address, phone }` — no `slug`. After the migration makes `slug` NOT NULL, this insert fails.
- The baseline Prisma client is regenerated at build time (`packages/db/package.json:30` → `npm run db:generate && tsc`), so any CI run after the migration lands with an un-updated `reference-test-data.js` will produce either a type error (if new types mark `slug` as required on `FlooringWarehouseCreateInput`) or a runtime NOT NULL violation.

### 6.4 Order vs `seed.js` in CI/dev

`seed.js` (`packages/db/scripts/seed.js:1-33`) only seeds system users + UoM + categories. It does **not** insert warehouses. Therefore `seed.js` is **order-independent** of the warehouse migration.

`reference-test-data.js` is invoked manually (`db:seed:reference-test-data`) and is not part of `prisma db seed` (which runs `seed.js`). Developers run it on demand.

**Order required:**
1. Merge schema change + migration file + `reference-test-data.js` update in the same commit.
2. CI runs `prisma migrate deploy` (or `db:migrate:dev` in dev) — this applies the migration.
3. `prisma generate` regenerates the client with the new `slug` fields (Phase 0's schema change makes this happen automatically as part of `db:generate` / `build`).
4. Subsequent `db:seed:reference-test-data` (if run) succeeds because the updated blueprints now supply `slug`.

---

## Section 7 — Open Questions Before Phase 0 Begins

These are questions the scan could not resolve from code alone; each needs a human decision:

1. **Slug helper: create one, or skip?**
   - Evidence (Section 2.1): nothing named `slugify`/`toSlug`/`generateSlug`/`makeSlug` exists anywhere.
   - If the sole consumer is `WAREHOUSE_BLUEPRINTS`, slugs can be hardcoded (matching Categories/UoM pattern from Section 2.2) — no helper needed.
   - If user-created warehouses (`createWarehouseRow` at `apps/web/modules/warehouse/api.ts:58-69`) must also produce slugs, a runtime helper with collision suffixing is required. Phase 0's stated scope only describes blueprint updates; user-created warehouse slug generation would be Phase 1+.

2. **If a helper is authored, where does it live?**
   - Candidates (no precedent): `packages/domain/src/shared/slug.ts` (treats slug as a domain concept) vs `packages/lib/src/slug.ts` (treats it as a pure utility). The data package rules (`packages/db/CLAUDE.md`) forbid importing domain from db, so a helper in `packages/domain/` cannot be called from `packages/db/scripts/reference-test-data.js` (a .js script that does not depend on `@builders/domain`). Practical consequence: if the helper will be used by the seed script, it belongs in `packages/lib/src/` or in a `.js` sibling inside `packages/db/scripts/`.

3. **Section slug uniqueness scope: `@@unique([warehouseId, slug])` vs global unique?**
   - Existing baseline: `@@unique([warehouseId, name])` on `FlooringSection` (schema.prisma:480) — scoped per-warehouse. `slug` should almost certainly mirror this (same scope as `name`), but the Phase 0 description specifies "unique per warehouseId" — confirm before authoring.

4. **Blueprint slug values for WAREHOUSE_BLUEPRINTS (reference-test-data.js:238-260):**
   - Three warehouses: "North Warehouse", "Central Warehouse", "South Warehouse". Three sections: "Receiving", "Main Stock", "Dispatch". Since `buildReferenceTestData` prefixes the name with `${normalizedPrefix}` (lines 383, 386), the label `"North Warehouse"` becomes `"TEST North Warehouse"` at runtime. Decision: does the slug include the prefix (`test-north-warehouse`) or not (`north-warehouse`)? Schema uniqueness (`warehouse.slug` globally unique) implies the prefix must be included if multiple prefixes are ever seeded into the same DB.

5. **Reference-test-data cleanup ordering:** Not an issue. The script has no `delete`/`deleteMany` on warehouse tables (Section 3.3). No reorder required. The Restrict change is inert here.

6. **Tests relying on cascade:** None found (Section 3.2). No rewrites needed.

---

## Section 8 — Summary Decision Matrix

| Concern | Safe to proceed? | Evidence | Blocker? |
|---------|:---------------:|----------|:--------:|
| No production rows | Yes (with user confirmation) | `seed.js:1-33` does not insert; only `reference-test-data.js:750,770,790` inserts, and it's a manual dev script (`packages/db/package.json:32`). User confirmed no prod rows. | No |
| Slug helper availability | Must author (or hardcode) | Grep for `slugify/toSlug/generateSlug/makeSlug` → zero matches. `packages/domain/src/shared/` and `packages/lib/src/` file lists contain no "slug" file. Categories/UoM pattern hardcodes slugs in canonical list. | No — needs decision, not blocker |
| FK Cascade reliance | Yes | App pre-checks at `api.ts:106-116, 221`. Zero `deleteMany` on these models. No test references `onDelete: Cascade`. `reference-test-data.js` has no deletes. | No |
| Test fixture impact | Yes | No hardcoded warehouse slugs in tests. No `.slug` assertions in `apps/web/tests/modules/warehouse/`. `reference-test-data.test.ts` asserts cardinality and name, not slugs. | No |
| Prisma type consumers | Yes | No `.ts` file imports `FlooringWarehouse/Section/Location` as a type. 23 files use the runtime accessors — all pick up `slug` automatically via `prisma generate`. | No |
| Reference-test-data update strategy | Same commit required | `reference-test-data.js:750` upserts warehouse without slug; NOT NULL slug column makes this fail. Must ship together. | No (scheduling, not blocker) |
| Migration backfill shape | Recommend nullable → backfill → NOT NULL | Dev DBs likely contain seeded rows from manual runs of `db:seed:reference-test-data`. Schema-only `ADD COLUMN ... NOT NULL UNIQUE` fails on non-empty tables. | No — shape the migration defensively |

---

## Output Notes

- All claims in this scan cite file paths and line numbers.
- No files were modified.
- Items that could not be determined from code alone (e.g. whether a production database actually has zero warehouse rows — only the user can confirm this against the live DB; likewise whether slug is needed for user-created warehouses in Phase 1+) are called out in Section 7.
