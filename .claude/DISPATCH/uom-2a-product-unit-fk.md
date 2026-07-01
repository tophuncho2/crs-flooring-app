# uom-2a-product-unit-fk — Build the UoM /options picker stack, then execute Sub-plan 2A (product unit FK + dormant coverage FK + category unlock)

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-3 worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST read the authoritative epic plan `.claude/DEVELOPER-PLANS/2-PRODUCT-UOM.md` IN FULL, then run `/session-new` to do your own end-to-end research across every layer and VALIDATE this brief + the plan against live code. Trust the code if they disagree — and note the discrepancy in your response.
2. Read the Flags below — open decisions/gaps to settle with the user AS you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode → produce a plan and STOP for approval.
   - AUTO mode → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
This is the FIRST executable session of the UoM FK migration epic. Build the net-new UoM `/options` picker stack FIRST — 2A's product **Unit** field is a live picker that depends on it, and the product form import breaks at runtime without it. Then execute all of Sub-plan 2A: product gains a real `unitId` FK read and written end-to-end, category becomes editable in detail, a dormant `coverageUnitId` column is added and left untouched, and the expand migration + backfill script are WRITTEN (not run). "Done" = the above landed and `/check` is green.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **UoM picker option rows show NAME only** (per the plan rendering matrix — mirror the category picker but DROP slug from subtitles). Confirm the abbreviation is NOT shown in option rows.
- ⚑ **`coverageUnitId` stays fully dormant in 2A** — schema column + FK + relation only. Confirm it is NEVER accepted on the wire: not in forms, not in validators, not in the update patch, not in write-repository input.
- ⚑ **Category becomes MUTABLE in 2A, but the case-insensitive `lower(name)` unique index is a 2D task** — `normalizeCategoryName` doesn't land until 2D. Confirm raw category names are acceptable in the 2A window (no dupe-collision risk), OR decide whether a light guard is needed early.
- ⚑ **New backfill script name = `backfill-product-unit.js`** and the two migration file timestamps/names. Confirm the naming convention (mirror the historical `backfill-coverage-to-stock.js`).
- ⚑ **Category picker on CREATE is already editable; 2A only unlocks it in DETAIL.** Confirm create-flow behavior is unchanged.
- ⚑ **Every existing product row + seeds/fixtures must resolve to a valid `unitId`** before the NOT-NULL migration. The backfill dry-run must report ZERO unresolved rows before the NOT-NULL/FK step is deployed.
- ⚑ **Shared dev DB** (dev-1..4 share one DB): coordinate the expand migration with sibling dev sessions (dev-1/2/4) so two branches don't race the same schema change.

## Scope
In: The UoM `/options` picker stack built FIRST end-to-end (domain type → data read repo → application use case → api validator+route → client request → picker component); all of Sub-plan 2A across domain / data / application / api / module-UI; the 2A-E expand migration (+`unitId` nullable, +`coverageUnitId` dormant) + a SEPARATE NOT-NULL/FK/index migration + `backfill-product-unit.js` — all WRITTEN, migrations NOT run.

Out: 2B (inventory/adjustments/staged rows + worker rewrite), 2C (template/WO items + sync-copies), 2D (sever category↔unit, Category/UoM CRUD, name normalization, `lower()` unique indexes), the Phase C destructive column drops, and RUNNING any migration. Do NOT drop snapshot columns — they stay populated as fallback until 2B swaps the inventory-create source.

## Files you own (do not edit anything outside this list)

### UoM /options picker stack (build FIRST)
- `packages/domain/src/flooring/unit-of-measures/types.ts` — EDIT: add `UnitOfMeasureOption` type (currently only `UnitOfMeasureListRow`, :1-8).
- `packages/domain/src/flooring/unit-of-measures/index.ts` — EDIT: barrel-export the new option type.
- `packages/db/src/flooring/unit-of-measures/read-repository.ts` — EDIT: add `searchUnitOfMeasureOptions` (take+1 hasMore, case-insensitive name search).
- `packages/application/src/flooring/unit-of-measures/search-unit-of-measure-options.ts` — NEW: use case (mirror categories: DEFAULT_TAKE=20, MAX_TAKE=50, clamp 1–50).
- `packages/application/src/flooring/unit-of-measures/index.ts` — EDIT: barrel-export the use case.
- `apps/web/app/api/unit-of-measures/_validators.ts` — EDIT: add `unitOfMeasureOptionsQuerySchema` + `validateUnitOfMeasureOptionsQuery` (search optional, skip coerce int≥0 default 0, take coerce int 1–50 default 20).
- `apps/web/app/api/unit-of-measures/options/route.ts` — NEW: GET only, mirror categories options route (applyRoutePolicy → enforceQueryRateLimit → validate → useCase → routeJson; UNGATED, no enforceManageUsersAccess).
- `apps/web/modules/unit-of-measures/data/unit-of-measure-options-request.ts` — NEW: QUERY_KEY const, page type `{items,hasMore}`, `searchUnitOfMeasureOptionsRequest(search,signal,skip=0,take=20)` → GET `/api/unit-of-measures/options`.
- `apps/web/modules/unit-of-measures/components/picker/unit-of-measure-picker.tsx` — NEW: mirror `category-picker.tsx` (AsyncRichDropdown + useAsyncRichDropdownController; props value/onChange/onOptionSelected/selectedLabel/initialOptions; `toDropdownOption` → `{id,title:name}`, NO subtitles).

### Sub-plan 2A — product unit FK + category unlock
- `schema.prisma` — EDIT: `FlooringProduct` (~249-289) +`unitId` +`coverageUnitId`; `FlooringUnitOfMeasure` (~236-247) add back-relations.
- `packages/application/src/flooring/products/types.ts` — EDIT: `CreateProductInput` +`unitId:string` required (:9); `UpdateProductInput` stop `Omit`-ing `categoryId` (:25), add `unitId` mutable.
- `packages/domain/src/flooring/products/product-rules.ts` — EDIT: DELETE `isProductCategoryChangeBlocked` + `buildProductCategoryChangeBlockedMessage` (:64-73).
- `packages/domain/src/flooring/products/unit-snapshot.ts` — EDIT: retire `buildProductUnitSnapshotsFromCategory` (:26-35) — KEEP until 2B swaps inventory-create source.
- `packages/application/src/flooring/products/create-product.ts` — EDIT: stop deriving snapshot from category; set `unitId` from input (:69-93).
- `packages/application/src/flooring/products/update-product.ts` — EDIT: drop "category immutable" comment; patch `unitId`; when `categoryId` changes recompose stored `product.name` via `buildStoredFlooringProductName` (:38-42, :75-92).
- `packages/db/src/flooring/products/write-repository.ts` — EDIT: `CreateProductInput` +`unitId` required; REMOVE `categoryId` from `ImmutableProductFields` (:46-51); `updateProduct` patches `unitId` (+`categoryId`) (:20-52).
- `packages/db/src/flooring/products/shared.ts` — EDIT: add `unit{id,name,abbreviation}` relation to `productRowSelect` + `productOptionSelect`; expose `unitId` + resolved unit (:11-47).
- `apps/web/app/api/products/_validators.ts` — EDIT: DELETE `PRODUCT_CATEGORY_LOCKED` rejection; accept `categoryId` on update; accept `unitId` required on both create+update; `coverageUnitId` NOT accepted (:96-122).
- `apps/web/modules/products/data/mutations.ts` — EDIT: stop stripping `categoryId` from PATCH body (:15-20).
- `apps/web/modules/products/components/record/primary/product-primary-fields-section.tsx` — EDIT: Category → editable `CategoryPicker` in detail (was static via `categoryReadOnly`); Stock Unit → new editable `UnitOfMeasurePicker` (create+detail, seeded from product); confirm loader/controller seeds form `unitId` from `product.unitId`.
- Products list columns / row-cell (locate during research) — EDIT: drop the `sendUnit` column; unit resolves from FK, render ABBREVIATION per the plan rendering matrix.

### Migration & backfill (WRITE only)
- `prisma/migrations/<ts>_product_unit_expand/migration.sql` — NEW: +`unitId` nullable FK, +`coverageUnitId` nullable FK, indexes.
- `prisma/migrations/<ts>_product_unit_not_null/migration.sql` — NEW (SEPARATE): SET NOT NULL on `unitId` + finalize FK constraint — gated on zero-unresolved backfill.
- `packages/db/scripts/backfill-product-unit.js` — NEW: mirror `backfill-coverage-to-stock.js`.
- `packages/db/package.json` + root `package.json` — EDIT: add `db:backfill:product-unit` npm script.

## Layer-by-layer map

### Reference stack to mirror (the category picker — read these first)
- Component: `apps/web/modules/categories/components/picker/category-picker.tsx:1-110` — AsyncRichDropdown + useAsyncRichDropdownController from `@/engines/picker`; `toDropdownOption` maps `CategoryOption`→`{id,title:name,subtitles:[slug]}`. For UoM: DROP slug, name-only.
- Client request: `apps/web/modules/categories/data/category-options-request.ts:1-31` — QUERY_KEY const; `CategoryOptionsPage {items,hasMore}`; `searchCategoryOptionsRequest(search,signal,skip=0,take=20)` → GET `/api/categories/options?search&skip&take`.
- Use case: `packages/application/src/flooring/categories/search-category-options.ts:1-26` — DEFAULT_TAKE=20, MAX_TAKE=50, clamp 1–50.
- Validator: `apps/web/app/api/categories/_validators.ts:1-63` — `categoryOptionsQuerySchema` (search optional, skip coerce int≥0 default 0, take coerce int 1–50 default 20); `validateCategoryOptionsQuery`.
- Route: `apps/web/app/api/categories/options/route.ts:1-28` — GET only; applyRoutePolicy → enforceQueryRateLimit → validate → useCase → routeJson; NO `enforceManageUsersAccess` (ungated).

### Schema (WRITE migration, do NOT run)
- `FlooringProduct` (~249-289): +`unitId` (NOT NULL FK→UoM RESTRICT, indexed — but arrives NULLABLE in the expand migration, SET NOT NULL in the second migration); +`coverageUnitId` (nullable FK→UoM RESTRICT, DORMANT). Snapshot cols stay populated — drop is 2B/Phase C, NOT here.
- `FlooringUnitOfMeasure` (~236-247): add the `products` back-relation now. When declaring the UoM side, anticipate the FULL inverse relation set the epic adds (products, coverage, inventory, adjustments, staged rows, filter rows, template items, WO items) so later sub-plans don't churn the model — 2A only NEEDS `products` + coverage.
- FK convention: `flooring_<table>_<col>_fkey`, ON DELETE RESTRICT ON UPDATE CASCADE. Category unlock is CODE only — no schema change to `categoryId`.

### Domain
- `types.ts` add `UnitOfMeasureOption`. `product-rules.ts:64-73` delete the two category-change-blocked helpers. `unit-snapshot.ts:26-35` retire (keep) `buildProductUnitSnapshotsFromCategory`. Name recompose helper: `packages/domain/src/shared/product-display-name.ts:18-25` (`buildStoredFlooringProductName`) — name embeds the category name, so a category change must recompose `product.name` (update-product already recomposes on style/color/addon).

### Data
- `unit-of-measures/read-repository.ts` add `searchUnitOfMeasureOptions` (take+1 → hasMore, case-insensitive). `products/write-repository.ts:20-52` +`unitId` required on create, remove `categoryId` from `ImmutableProductFields` (:46-51), patch `unitId`(+`categoryId`) on update; `coverageUnitId` accepted NOWHERE (dormant). `products/shared.ts:11-47` add `unit{id,name,abbreviation}` relation to both selects; expose `unitId` + resolved unit.

### Application
- NEW `unit-of-measures/search-unit-of-measure-options.ts` (clamp 1–50). `products/types.ts` `CreateProductInput` +`unitId` required (:9), `UpdateProductInput` stop Omit-ing `categoryId` + add `unitId` (:25). `create-product.ts:69-93` set `unitId` from input, stop deriving snapshot from category. `update-product.ts:38-42,75-92` patch `unitId`, recompose name on category change.

### API
- NEW `unit-of-measures/options/route.ts` (GET, ungated). `unit-of-measures/_validators.ts` add options query schema+validator. `products/_validators.ts:96-122` delete `PRODUCT_CATEGORY_LOCKED`, accept `categoryId` on update, accept `unitId` required both; `coverageUnitId` NOT accepted.

### Module dir
- NEW `unit-of-measures/data/unit-of-measure-options-request.ts` + `unit-of-measures/components/picker/unit-of-measure-picker.tsx`. `products/data/mutations.ts:15-20` stop stripping `categoryId`. `products/components/record/primary/product-primary-fields-section.tsx` Category→editable CategoryPicker in detail, Stock Unit (StaticFieldValue :158-162)→UnitOfMeasurePicker; `stockUnitDisplay` computed :100-105, Category block :140-157, Coverage·Unit PerUnitCell :209-218, Entity picker :220-235 (reference for editable-picker wiring). Props: product, draft, categoryOptions, categoryReadOnly?, onFieldChange — NO "Send Unit" field exists (already absent). Products list column/row-cell: drop `sendUnit`, render unit ABBREVIATION from the FK.

### Pages
- Confirm the product record loader/controller seeds the form `unitId` from `product.unitId` (and passes UoM initial options if the picker needs a seed label).

## Migration & backfill (schema changes — WRITE, do NOT run)
Two-step expand→backfill→NOT-NULL sequence, in SEPARATE migration files, gated on the backfill:
1. **Expand migration** — add `unitId` NULLABLE FK + `coverageUnitId` nullable FK + indexes. Non-destructive; safe for all dev branches at once.
2. **Backfill** — run `backfill-product-unit.js` dry-run first; `--apply` only after dry-run reports ZERO unresolved rows.
3. **NOT-NULL/FK migration** (separate file) — `SET NOT NULL` on `unitId` + finalize the FK/index. Deploy ONLY after step 2 is clean.

`backfill-product-unit.js` (net-new, mirror `backfill-coverage-to-stock.js`): CommonJS; `node -r dotenv/config`; `createPrismaClient()` from `@builders/db`; dry-run DEFAULT, `--apply` to mutate; single `$transaction({timeout:120_000})`; idempotent `WHERE unitId IS NULL`; maps `product.stockUnitName` → `UoM.name` (fallback `category.stockUnitId`); anomaly-guard (REFUSE `--apply` if any unresolved); padded per-table + TOTAL report; `module.exports` for tests.

npm wiring (both `packages/db/package.json` and root): pattern
`"db:backfill:product-unit": "DOTENV_CONFIG_PATH=../../.env node -r dotenv/config scripts/backfill-product-unit.js"`.
Dry-run: `npm run db:backfill:product-unit` — apply: `npm run db:backfill:product-unit -- --apply`.

The USER runs all migrations and the backfill apply. NOT-NULL is gated on a zero-unresolved dry-run. Shared dev DB (dev-1..4): coordinate the expand migration with sibling sessions so two branches don't race the same schema change.

## Build order (do the picker stack FIRST)
1. **UoM `/options` picker stack end-to-end** (mirror the category picker head-to-toe): domain type → read repo `searchUnitOfMeasureOptions` → application use case → api validator+route → client request → picker component. **WHY first:** 2A's product form imports `UnitOfMeasurePicker`; if it doesn't exist, the product form breaks at runtime (not just typecheck). Build and sanity-check the picker before touching the product form.
2. **Schema expand + backfill script** — write the expand migration (nullable `unitId` + dormant `coverageUnitId`) and `backfill-product-unit.js` + npm wiring. Do NOT run.
3. **Product domain/data/application/api edits** — types, rules deletion, snapshot retire-in-place, create/update use cases (incl. name recompose on category change), write-repository, shared selects, validators, mutations.
4. **Product form UI swap** — `product-primary-fields-section.tsx`: Category → editable CategoryPicker in detail; Stock Unit → UnitOfMeasurePicker (create+detail, seeded from `product.unitId`).
5. **List column + mutations + tests** — drop `sendUnit` column, render unit abbreviation from FK; finalize mutations; write/adjust tests.
6. **`/check`** green.

## Tests
- `product-display-name` — recompose-on-category-change test (category name embedded in stored `product.name`).
- `create-product` / `update-product` — `unitId` set from input; category now mutable (no blocked-change assertion).
- `backfill-product-unit` — NEW test on `module.exports`: name-match, category fallback, anomaly-guard (refuse apply on unresolved).
- UoM `searchUnitOfMeasureOptions` — paging (take+1 hasMore, case-insensitive).

## Done means
- `/check` green (build + typecheck + lint + test)
- 2A-E expand migration + NOT-NULL/FK migration + `backfill-product-unit.js` written (NOT run — the user runs migrations)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
