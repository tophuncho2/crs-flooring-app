# UoM Schema Cleanup & Send-Unit Removal

## Context

Units of measure are modelled two ways today, and both are wrong for where the
product is going:

1. **Category owns the units.** `FlooringCategory.sendUnitId` / `stockUnitId`
   are the only real FKs to the seeded `FlooringUnitOfMeasure` table. Every one
   of the 23 seeded categories has `sendUnitSlug === stockUnitSlug` — send unit
   and stock unit have always been identical, so "send unit" is dead weight.
2. **Everything downstream is a flat string snapshot.** Products carry
   `sendUnitName/Abbrev` + `stockUnitName/Abbrev` (stamped from category at
   create); template items, work-order items, inventory, adjustments, and staged
   import rows each copy those strings forward so reads never join to UoM.

Goal: collapse to **one editable unit per product** — a real
`FlooringProduct.stockUnitId` FK — rip "send unit" out of every table, resolve
template/WO item units live from `product.stockUnit` at read time, keep
inventory/adjustments/staged on **frozen snapshots** (but sourced from the new
product FK), backfill existing rows, then make product UoM editable and category
user-managed. The `FlooringUnitOfMeasure` table stays **seeded / not user-managed**.

This runs as an **expand → contract** epic in the user-prescribed order. The user
runs every migration (`prisma migrate`) and the backfill; Claude never commits.

### Confirmed decisions
- **Scope:** full epic in one plan (incl. net-new product UoM picker + category CRUD).
- **`product.stockUnitId`:** nullable on the expand migration, flipped to **NOT NULL** in a separate contract migration *after* backfill verifies clean.
- **Backfill fallback:** match `product.stockUnitName` → `UoM.name`; if null/unmatched, copy the product's `category.stockUnitId` (the original snapshot source); report any still-unresolved IDs.
- **Category snapshot on inventory/adjustments:** drop it entirely. `categorySlug` on both `FlooringInventory` + `FlooringInventoryAdjustment` is dead plumbing (never filtered/grouped/rendered). `categoryName` on `FlooringInventory` is the inventory list's "Category" column — drop the column too. Product name carries identity; category is derivable from the product.
- **Category stays immutable post-create** — kept as a deliberate product rule, not for snapshot integrity. Its rationale (`isProductCategoryChangeBlocked`) is rewritten since both cited reasons (`inventory.categorySlug` + `*.sendUnitName`) are removed this epic.
- **Category `slug` demoted to an internal dedup guard.** Nothing joins on slug (products/staged use `categoryId` FK) and its only stable-key job — the inventory snapshot — is dropped this epic. Slug becomes a normalized key auto-derived from `name` (`slugifyCategoryName`), stays `@unique`, regenerates on create **and** rename, and is never shown or edited. `name` is the sole user-facing identity; **`name @unique` is dropped** (slug subsumes it, and normalized matching catches case/whitespace variants exact-name uniqueness misses). Remove the slug subheader from category pickers. Regenerating slugs from names also heals the legacy `vinyl-plank`/`Plank` mismatch.

### Key semantic split (intended, confirmed)
- **Template items / WO items → LIVE resolve.** Their snapshot columns are dropped; unit is read from `product.stockUnit` via join. Editing a product's stock unit therefore retroactively changes how historical template/WO line items render. Accepted.
- **Inventory / adjustments / staged → FROZEN snapshot.** They keep `stockUnitName/Abbrev`, but the value written now comes from `product.stockUnit` (the FK), not the old product string columns. Editing a product's unit later does **not** touch already-materialized inventory.

---

## End-state schema

| Model | Change |
|---|---|
| `FlooringUnitOfMeasure` | **Seeded, unchanged data.** Drop `sendUnitCategories` + `stockUnitCategories` relations; add `products FlooringProduct[]` relation. |
| `FlooringProduct` | **+`stockUnitId String`** (NOT NULL, FK→UoM, `onDelete: Restrict`, indexed) + `stockUnit` relation. **Drop** `sendUnitName`, `sendUnitAbbrev`, `stockUnitName`, `stockUnitAbbrev`. |
| `FlooringTemplateItem` | **Drop** `sendUnitName`, `sendUnitAbbrev`. Unit resolved via `product.stockUnit` at read. |
| `FlooringWorkOrderItem` | **Drop** `sendUnitName`, `sendUnitAbbrev`. Unit resolved via `product.stockUnit` at read. |
| `FlooringInventory` | **Drop** `sendUnitName`, `sendUnitAbbrev`, **`categorySlug`, `categoryName`**. **Keep** `stockUnitName`/`stockUnitAbbrev` (frozen snapshot, now sourced from `product.stockUnit`). |
| `FlooringInventoryAdjustment` | **Drop** `categorySlug`. **Keep** `stockUnitName`/`stockUnitAbbrev` (no send unit here). |
| `FlooringImportStagedInventoryRow` | **Keep** `stockUnitName`/`stockUnitAbbrev` (now sourced from `product.stockUnit`). |
| `FlooringImportStagedInventoryFilterRow` | **Keep** `stockUnitName`/`stockUnitAbbrev` (now sourced from `product.stockUnit`). |
| `FlooringCategory` | **Drop** `sendUnitId`, `stockUnitId` (+ both indexes + relations). **Drop `name @unique`** (slug is the sole dedup guard). `slug` stays `@unique`, becomes an auto-derived normalized key. Becomes user-managed. |

Schema file: `packages/db/prisma/schema.prisma`.

---

## Phase 1 — Expand: add `stockUnitId`, backfill, install through backend layers

**Migration mechanics (verified against history):** the user runs `npm run db:deploy` (`prisma migrate deploy`, non-interactive) — migrations are checked in, no interactive `migrate dev` in the flow. **Direct precedent: `20260519120000_cut_log_unpad_and_add_product_warehouse`** does exactly our shape — `ADD COLUMN nullable` → in-migration `UPDATE … FROM` backfill → `SET NOT NULL` + `ADD CONSTRAINT … FOREIGN KEY … ON DELETE RESTRICT ON UPDATE CASCADE` + `CREATE INDEX "{table}_{col}_idx"`. Convention is **NOT NULL + FK + index grouped in ONE migration** (see also `20260526120000_property_name_unique` for the nullable→backfill→NOT-NULL+unique-index pattern). FK default `ON UPDATE CASCADE` (plan said Restrict on delete only — keep `ON DELETE RESTRICT ON UPDATE CASCADE` to match house style).

**Migration 1 (additive, user runs):** add `stockUnitId String?` + `stockUnit` relation on `FlooringProduct`; add `products` back-relation on `FlooringUnitOfMeasure`. Nullable, no NOT NULL yet.

**Backfill script (one-time, user runs — mirror the retired coverage-backfill scripts; delete after):**
- Location: `packages/db/scripts/backfill-product-stock-unit.js`. **Convention (verified against the deleted `backfill-coverage-to-stock.js` @ commit `7da59e8^`):** plain **CommonJS `.js`, run via `node -r dotenv/config`** (NOT `tsx`). Skeleton: `createPrismaClient()` from `@builders/db` inside `main()` + `try/finally { $disconnect() }`; **dry-run by default, `--apply` to mutate**; single `prisma.$transaction(fn, { timeout: 120_000, maxWait: 10_000 })`; padded per-table + TOTAL report; `if (require.main === module) main().catch(...)` + `module.exports` so it's unit-testable. npm wiring mirrors the deleted one: `"db:backfill:stock-unit": "DOTENV_CONFIG_PATH=../../.env node -r dotenv/config scripts/backfill-product-stock-unit.js"` in `packages/db/package.json` + a root delegate. Delete the script + npm lines in a `chore(db): delete spent one-off …` commit after it runs (same lifecycle as coverage scripts).
- Logic per product: load all `FlooringUnitOfMeasure` into a `name → id` map (and `slug → id`). For each product:
  1. If `stockUnitName` matches a `UoM.name` → set `stockUnitId`.
  2. Else copy `category.stockUnitId` (the original snapshot source).
  3. Else collect the product id as unresolved.
- **Anomaly guard:** if any product has a non-null `stockUnitName` with no UoM-name match, **throw to refuse `--apply`** (surfaces prod junk on a main run instead of silently mislabeling). Print: total, matched-by-name, matched-by-category, unresolved IDs. Idempotent (only sets where null).
- **Data reality (dev DB, verified live):** 223 products, **100% exact `stockUnitName`→`UoM.name` match, 0 fallbacks, 0 NULLs** (distinct values: Linear Feet ×121, Square Feet ×72, Square Yard ×20, Pieces ×6, Buckets ×2, Bags ×1, Units ×1 — all seeded UoM `name`s). The category fallback is dead code on dev; keep it only as a guard for main/staging where backup junk may surface (memory `main-backups-roll-into-staging-dev`). **`UoM.name` is `@unique`**, which is what makes name the safe match key. `product.stockUnitName` is a verbatim copy of `category.stockUnit.name` (`unit-snapshot.ts:29-34` ← `create-product.ts:73-79`), so the match is name-against-itself.

**Migration 2 (NOT NULL + FK, user runs after backfill verified clean):** `ALTER COLUMN stockUnitId SET NOT NULL`, add FK constraint `onDelete: Restrict`, add `@@index([stockUnitId])`.

**Backend install (snapshot strings still present & still rendering — no UI change yet):**
- `packages/db/src/flooring/products/read-repository.ts` + `shared.ts` — add `stockUnit { id, name, abbreviation }` to the product select; expose `stockUnitId` + resolved `stockUnit` on `ProductRecord`/`ProductDetailRecord`/`ProductDisplayRecord`.
- `packages/domain/src/flooring/products/types.ts` — add `stockUnitId` + resolved `stockUnit` shape to `ProductRow`/`ProductOption`.

**Exit check:** `/check` green; products read back with both the new FK-resolved unit and the legacy snapshot strings.

---

## Phase 2 — Swap rendering to `product.stockUnit`; stop rendering snapshots

Switch every read + render path off the snapshot strings and onto the resolved FK. Snapshot columns still exist (dropped in Phase 3) but are no longer read.

**Resolve unit at read (templates / WO items) — verified ZERO N+1, free nested select:** all three read paths *already* `select` the related `product` (templates item read-repo:10, WO item read-repo:15, WO file-gen read-repo:469), so adding `stockUnit { name, abbreviation }` as a nested select rides the existing join — no new query, no per-item loop anywhere (templates/WO list detail + file-gen are each one `findUniqueOrThrow`; WO item counts use a single `groupBy … in`). Edit points:
- `packages/db/src/management/templates/material-items/read-repository.ts` and `packages/db/src/flooring/work-orders/material-items/read-repository.ts` + `work-orders/read-repository.ts` (file-gen path, ~L462-508) — drop the item's own `sendUnit*` select; nest `product.stockUnit` and surface `stockUnitName`/`stockUnitAbbrev` (resolved). **Also the parent repos** `management/templates/read-repository.ts:74-75` + `templates/write-repository.ts:51-52` (and `work-orders/write-repository.ts:71-72,105-106`) select/carry the item `sendUnit*` in their nested item shape — sweep these too.
- Domain item types **and normalizers**: `management/templates/material-items/{types.ts,normalizers.ts}`, `flooring/work-orders/material-items/{types.ts,normalizers.ts}`, `work-orders/file-generation/types.ts` — replace `sendUnitName/Abbrev` with `stockUnitName/Abbrev`; normalizers map from `product.stockUnit` instead of the item row. **WO file-gen adjustments keep their own frozen `stockUnitAbbrev` snapshot** (adjustment row, read-repo:521) — that's the frozen side, leave it.
- Retire snapshot builder `packages/domain/src/flooring/products/item-send-unit-snapshot.ts` and all `buildItemSendUnitSnapshotFromProduct` call sites (create/update/save template + WO material items, `sync-template-to-work-order.ts`). Item writes no longer stamp a unit at all.

**Write paths source from `product.stockUnit` (inventory/staged stay snapshot):**
- Rework `packages/domain/src/flooring/products/unit-snapshot.ts` → build the inventory/staged stock-unit snapshot from `product.stockUnit.{name,abbreviation}` (drop all send-unit fields). Rename to reflect "from product stock unit."
- `materialize-imported-rows.ts:57-60` — source `stockUnitName/Abbrev` from `row.product.stockUnit`; delete the two `sendUnit*` lines. Ensure `listStagedInventoryForMaterialization` selects `product.stockUnit`.
- `create-inventory.ts` / `merge-inventory.ts` / `save-import-staged-inventory-section.ts` — same: stock snapshot from `product.stockUnit`, drop send-unit. Also stop writing `categorySlug`/`categoryName` to inventory (`materialize-imported-rows.ts:55-56`, `merge-inventory.ts:135-136`, `create-inventory.ts:53-54`) and stop stamping `categorySlug` onto adjustments (`create-pending-adjustment.ts:150`, adjustment snapshot builder `pending-adjustment-inventory-snapshot.ts`).
- `inventory/create-rules.ts`, `inventory/editability.ts`, `inventory/write-repository.ts` (`MaterializeInventoryRowFields`), `inventory/types.ts`, `inventory/read-repository.ts` + `shared.ts`, adjustments `read/write-repository.ts` + `shared.ts` + `types.ts` — drop `sendUnitName/Abbrev` **and** `categorySlug`/`categoryName` from the insert/immutable/select contracts; keep `stockUnit*`.

**UI render swap:**
- Products: `product-primary-fields-section.tsx` — Stock Unit reads `product.stockUnit` (resolved); **delete the Send Unit `FormField`** (lines 168-172) and the `sendUnitDisplay` logic. `products-list-columns.ts` + `products-row-cell.tsx` — drop the `sendUnit` column; keep `stockUnit` (resolved).
- Categories list: `categories-table.tsx` — drop `sendUnit` column (stock stays until Phase 4).
- Templates / WO item sections + drafts: swap `item.sendUnitAbbrev` → `item.stockUnitAbbrev` (`work-order-material-items-section.tsx`, `template-material-items-section.tsx`, their `drafts.ts` / `use-*` controllers, and the WO/template material-item pickers' subtitle).
- Inventory / adjustments / imports: already render `stockUnitAbbrev` — no unit UI change; they just receive a snapshot sourced from the new FK. **Remove the inventory list "Category" column** (`inventory-list-columns.ts:21` + the `categoryName` case in `inventory-row-cell.tsx:53-54`).
- **`categorySlug`/`categoryName` confirmed fully dead outside snapshots** (grep: zero `where`/`orderBy`/`groupBy` on either, zero web-UI refs). Adjustment category filtering keys off `product.categoryId`, not `categorySlug` (adjustments read-repo:462,480) — unaffected by the drop. **One real consumer to rewire:** `packages/domain/src/flooring/shared/product-display-name.ts` (`buildFlooringProductDisplayName`) currently reads inventory's `categoryName` snapshot; after the drop, callers pass `category.name` from the FK join. Staged-import row/filter-row read-repos that *compute* `categoryName`/`categorySlug` from `product.category` (staged rows read-repo:33-40, filter-rows read-repo:53-57) lose that computation — they're LIVE joins, not stored columns, so this is a normalize-step removal, not a migration.

**Exit check:** `/check` green; no code reads `sendUnit*` anywhere; grep confirms.

---

## Phase 3 — Contract: drop snapshot string columns

**Migration 3 (user runs)** — drop columns:
- `FlooringProduct`: `sendUnitName`, `sendUnitAbbrev`, `stockUnitName`, `stockUnitAbbrev`.
- `FlooringTemplateItem`: `sendUnitName`, `sendUnitAbbrev`.
- `FlooringWorkOrderItem`: `sendUnitName`, `sendUnitAbbrev`.
- `FlooringInventory`: `sendUnitName`, `sendUnitAbbrev`, `categorySlug`, `categoryName`.
- `FlooringInventoryAdjustment`: `categorySlug`.

Remove the corresponding fields from the Prisma models and any lingering type/select references. `CreateProductInput`/product write-repo lose the four snapshot fields. Rewrite the `isProductCategoryChangeBlocked` doc comment (`product-rules.ts:67-73`) since both cited reasons are gone; keep the rule itself.

**Exit check:** `prisma generate` + `/check` green; full grep for `sendUnit` returns zero hits outside migration history.

---

## Phase 4 — Strip category units

**Migration 4 (user runs)** — drop `FlooringCategory.sendUnitId`, `stockUnitId`, both `@@index`, both relations; drop `sendUnitCategories`/`stockUnitCategories` from `FlooringUnitOfMeasure`; **drop the `name @unique` constraint** (slug remains `@unique` as the dedup guard).

- `packages/db/src/seed/categories.ts` — drop `sendUnitSlug`/`stockUnitSlug` from every seeded row (name/slug only); derive each `slug` from `name` via `slugifyCategoryName` so the legacy `vinyl-plank`/`Plank` mismatch heals; update the obsolete "retained for snapshot stability" comment. Confirm the product seed (if any) now sets `stockUnitId`.
- `packages/domain/src/flooring/categories/types.ts` (`CategoryMeta`) and `apps/web/modules/categories/types.ts` — drop `sendUnit*`/`stockUnit*`.
- Category read repo + `categories-table.tsx` — drop the remaining `stockUnit` column/select.

**Exit check:** `/check` green; category no longer references UoM.

---

## Phase 5 — Editability: product UoM picker + user-managed category

### 5a. Editable product stock unit (net-new picker)
No UoM picker exists today (unit was static). **Pattern transfer verified clean — no engine drift:** `AsyncRichDropdown` + `useAsyncRichDropdownController` from `@/engines/picker` are current, `AnchoredPanel` confirmed at `@/engines/common` (used *inside* `AsyncRichDropdown`, no direct import). Mirror the manufacturer picker head-to-toe. **Note what UoM already has:** `listUnitOfMeasures` (read-repo:38), a basic unpaginated `GET /api/unit-of-measures/route.ts`, and a list-view module — the `/options` search stack is net-new alongside these. Files:
- `packages/domain/src/flooring/unit-of-measures/types.ts` — **new `UnitOfMeasureOption` type** `{ id, name }` (mirror `ManufacturerOption`; the plan omitted this).
- `packages/db/src/flooring/unit-of-measures/read-repository.ts` — add `searchUnitOfMeasureOptions(search, skip, take)` (`take+1` paging, case-insensitive on name/abbreviation) alongside existing `listUnitOfMeasures`.
- `packages/application/src/flooring/unit-of-measures/search-unit-of-measure-options.ts` — new use case (clamp take 1–50, default 20, per manufacturer precedent).
- **`apps/web/app/api/unit-of-measures/_validators.ts`** — new `validateUnitOfMeasureOptionsQuery` (the plan omitted this file; mirrors `manufacturers/_validators.ts`).
- `apps/web/app/api/unit-of-measures/options/route.ts` — GET, full gauntlet (`applyRoutePolicy` → `enforceQueryRateLimit` → validator → use case → `routeJson`), returns `{ items, hasMore }`.
- `apps/web/modules/unit-of-measures/data/unit-of-measure-options-request.ts` — query key + search fn (mirror `manufacturer-options-request.ts`).
- `apps/web/modules/unit-of-measures/components/picker/unit-of-measure-picker.tsx` — `AsyncRichDropdown` on `@/engines/picker`.
- Wire `stockUnitId` into the write path: `ProductCreateForm` + `CreateProductInput`/`UpdateProductInput`, product `_validators.ts` (accept `stockUnitId`; **not** locked like `categoryId`), `create-product.ts` + `update-product.ts` (set/patch `stockUnitId`), `data/mutations.ts`. Replace the static Stock Unit `FormField` in `product-primary-fields-section.tsx` with the new picker (editable on both create + record edit).
- `create-product.ts` no longer derives unit from category — it takes the chosen `stockUnitId` directly.

### 5b. User-managed category (net-new CRUD)
Categories are seed-only today — **confirmed zero write path** (GET-only `/api/categories`, no use cases, no `data/mutations.ts`, no `controllers/`). Mirror the product CRUD + gauntlet:
- **Slug derivation — reuse, don't reinvent:** a pure `slugify()` already exists at `packages/application/src/shared/slug.ts` (NFKD + diacritic strip + non-alnum→hyphen + trim, throws on empty). `slugifyCategoryName` is a thin wrapper over it. **⚠ Layering decision (open):** the plan puts the wrapper in `packages/domain/.../categories/normalizers.ts`, but domain importing `@builders/application` is a layer inversion. Pick one: **(a)** relocate the pure `slugify` to `packages/domain/src/shared/` and have application re-export it (cleanest), or **(b)** keep `slugifyCategoryName` in the application layer next to `slug.ts`. Recommend (a).
- `packages/db/src/flooring/categories/write-repository.ts` — `createCategory` / `updateCategory` / `deleteCategory`. Create + update both set `slug = slugifyCategoryName(name)` (regenerate on rename); map the unique-violation via the existing `isP2002(error, "slug")` helper (`packages/db/src/shared/prisma-errors.ts`) → typed `CategoryExecutionError({ code, status: 409, field: "name" })`, mirroring `create-product.ts:82-107`.
- `packages/application/src/flooring/categories/{create,update,delete}-category.ts` — use cases. **Delete guard must count TWO referrers, not just products:** `FlooringProduct.categoryId` **and** `FlooringImportStagedInventoryFilterRow.categoryFilter` (`categoryFilterId` FK — kept per handoff). Add `getCategoryDeleteState(id)` → `{ products, filterRows }`; domain `isCategoryDeleteBlocked` blocks if either > 0; throw 409 with a pluralized message (mirror `delete-product.ts:13-41` + `product-rules.ts:8-39`).
- `packages/domain/src/flooring/categories/*-rules.ts` + zod payloads — validate `name` only (slug is derived, never user-supplied); duplicate guard keys off the derived slug.
- API: `POST /api/categories`, `PATCH /api/categories/[id]/primary/section`, `DELETE /api/categories/[id]`.
- UI: category `controllers/` + `components/record/` (create + primary section) + `data/mutations.ts` + list create/delete wiring, mirroring products. **Category form exposes `name` only** — slug is internal, units are gone.
- **Picker:** `apps/web/modules/categories/components/picker/category-picker.tsx:39` — drop the slug subheader (`subtitles: []`; title = name only).
- **Ordering polish:** `packages/db/src/flooring/products/read-repository.ts:279` — change `orderBy: category.slug` → `category.name` so slug is fully internal.

**Exit check:** `/check` green; manual run — create a product picking a UoM, edit its unit, confirm template/WO line items re-render live while existing inventory stays frozen; create/rename/delete a category.

---

## Files touched (representative, not exhaustive)

- **Schema/seed:** `packages/db/prisma/schema.prisma`, `packages/db/scripts/backfill-product-stock-unit.ts`, `packages/db/src/seed/categories.ts`.
- **Domain:** `products/types.ts`, `products/unit-snapshot.ts`, `products/item-send-unit-snapshot.ts` (delete), `inventory/{create-rules,editability,types}.ts`, `categories/types.ts`, templates/WO material-item `types.ts`.
- **Data:** products `read/write/shared`, templates + WO material-items `read/write`, `inventory/write-repository.ts`, staged-inventory repos, `unit-of-measures/read-repository.ts`, new `categories/write-repository.ts`.
- **Application:** `products/{create,update}-product.ts`, templates + WO material-item create/update/save, `sync-template-to-work-order.ts`, inventory `create`/`merge`, `materialize-imported-rows.ts`, `save-import-staged-inventory-section.ts`, new UoM-options + category CRUD use cases.
- **API:** product `_validators.ts` + section route, new `/api/unit-of-measures/options`, new category CRUD routes.
- **Web modules:** products (primary fields, list cols/cell, create), categories (list + new record/CRUD), templates + WO material-item sections/controllers/pickers, unit-of-measures (new picker + options request).

---

## Risks & watch-items
- **Shared dev DB:** dev-1/2/3 share dev's `.env` (one database). Each migration affects all three branches the moment it's applied — sequence the expand/contract carefully and coordinate. Per the main-backups memory, the same data shapes likely exist in main.
- **Backfill correctness gates NOT NULL.** Migration 2 must not run until the script reports zero unresolved products.
- **Category immutability rule (`isProductCategoryChangeBlocked`) stays** — kept as a deliberate product rule (stable categorization). After this epic it no longer protects any snapshot (`inventory.categorySlug` + `*.sendUnitName` are both dropped), so its doc comment must be rewritten to the new rationale; the rule logic is unchanged.
- **No more inventory↔category join needed.** Dropping the inventory `categoryName` column removes the list's "Category" column outright (not re-sourced live), preserving the frozen-snapshot, join-free read.
- **Live-resolve visibility change** for template/WO items is intentional but worth a sanity check with the user on first run (historical work orders will show the product's *current* unit).

## Open questions (surfaced by the hardening pass — resolve before execution)
1. **Backfill mechanism: standalone `.js` script vs in-migration `UPDATE`?** Given the verified 100% name-match, an in-migration `UPDATE flooring_product p SET "stockUnitId" = u.id FROM flooring_unit_of_measure u WHERE p."stockUnitName" = u.name;` (+ a category-fallback `UPDATE`) is viable and matches the `cut_log` precedent (which did add→backfill→NOT-NULL all in one migration). The plan keeps the standalone script for the dry-run/anomaly-report on main/staging junk. **Recommend: keep the script** (cross-env safety + inspectable report) — but the user may prefer the simpler one-migration path on dev. Decide.
2. **Migration split: 2 vs 3 steps?** Plan = Mig1 (nullable add) + script + Mig2 (NOT NULL+FK+index). `cut_log` precedent collapses all into one. Recommend keeping the split so backfill is verified clean before NOT NULL flips (the whole point of the cross-env guard).
3. **`slugifyCategoryName` home** — layer-inversion decision (a) relocate pure `slugify` to `packages/domain/src/shared/` vs (b) keep wrapper in application. Recommend (a).
4. **Backfill scope** — dev-only first, or include a main/staging run? On dev fallback never fires; the anomaly-guard makes a main run safe (refuses on surprise). Confirm whether the user wants to backfill main as part of this epic.

## Verification (end-to-end)
1. `/check` after each phase (clean + build + typecheck + lint + test).
2. Backfill: dry-run report shows full coverage before Migration 2.
3. Grep gates: no `sendUnit*` references after Phase 2; none in schema after Phase 4.
4. Manual (`/run` or app): create product → pick UoM; edit product UoM → template/WO items re-render, inventory unchanged; materialize an import → inventory snapshot carries the product's stock unit; create/rename/delete a category.

### Tests that WILL break (update during the relevant phase) — 13 files
| Test | Why it breaks |
|---|---|
| `packages/domain/tests/flooring/inventory/create-rules.test.ts` | `product()` helper + assertions stamp dropped send/stock/category fields |
| `packages/application/tests/flooring/inventory/create-inventory.test.ts` | product mock + `buildCreatedInventoryInsert` call signature |
| `packages/application/tests/flooring/inventory/merge-inventory.test.ts` | product mock + builder assertions on dropped fields |
| `packages/application/tests/flooring/inventory/adjustments/create-pending-adjustment.test.ts` | asserts `categorySlug` + stock snapshot |
| `packages/application/tests/flooring/inventory/adjustments/{update,delete}-pending-adjustment.test.ts` | `stockUnitAbbrev` message assertions (how it's passed/fetched) |
| `packages/application/tests/flooring/imports/materialize-imported-rows.test.ts` | asserts `categorySlug`/`categoryName`/stock snapshot |
| `packages/application/tests/flooring/imports/save-import-staged-inventory-section.test.ts` | snapshot-mutation assertions (drop category) |
| `packages/application/tests/flooring/imports/mark-staged-rows-for-import.test.ts` | verify snapshot-field refs |
| `packages/domain/tests/flooring/work-orders/file-generation/adjustments-{picking-ticket,shared}.test.ts` | `stockUnitAbbrev` in rendered output |
| `apps/web/tests/modules/inventory/adjustment-inventory-identity.test.ts` | `categorySlug` + `stockUnitAbbrev` identity display |
| `apps/web/tests/modules/products/product-display-name.test.ts` | `categoryName` now passed explicitly, not from product snapshot |

### Tests to ADD (net-new, no coverage today)
- Backfill correctness (unit-test the `.js` script's `module.exports`, mirroring the deleted `backfill-product-names.test.ts`): name-match hit, category fallback, anomaly-guard throws on unmatched non-null name.
- UoM `searchUnitOfMeasureOptions` paging (`take+1`/`hasMore`) + the options use case bounds.
- Category CRUD: `slugifyCategoryName` derivation + regenerate-on-rename, P2002→friendly duplicate error, delete-blocked when products OR filter-rows reference it.
