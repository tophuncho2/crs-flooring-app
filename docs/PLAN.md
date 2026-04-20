Products.

Basic Outline
1. Remove base color drop down options
2. Remove add base color option
3. Inventory section is open only, no cut logs as child scoped rows. No section save or edits. 


App / API / Products
1. Route for create
2. Route for delete
3. Route for delete
4. _validators for the route edge

App / dashboard/
1. page for create
2. List view page
3. Record view page

web/modules
/application/
1. Application use cases moved to packages/application/src/flooring/products
- Create
- Update
- Delete

/domain/
1. Domain rules / logic move to packages/domain/src/flooring/products
2. type.ts move to packages/domain/src/flooring/products

/record/
1. consolidate into components/ record/ and list/ - and controlls go in controllers/

/data/
1. harden the mutations file 
2. harden the queuries file (dashboard/page imports this)

identify what servives.ts are for and their final home 
validators.ts identify, and should they live in the route for the route validators
_validators in route edge and domain validation is used. 
packages/db/src/flooring/products will be cananicol read and write repositories for products. 


Inventory section of record view
- Open inventory button - record entry to inventory record. 
- No toggle to show cut logs
- Non editable inventory rows from this section.


CLAUDE CODE ADD PLAN HERE

---

# Products Module Sweep — Phased Plan

## Context

The products module currently lives entirely under `apps/web/modules/products/` with Prisma-direct access, module-local validators, a module-local application layer, and a pre-consolidation folder shape (`record/create/`, `record/detail/`, `record/panel/sections/…`). It is the next module to align with the canonical pattern established by warehouses / contacts / manufacturers / services: routes → `@builders/application` use cases → `@builders/domain` rules → `@builders/db` persistence; route-edge `_validators.ts`; module layout flattened to `components/{list,record}`, `controllers/`, `data/`.

Product-specific cleanup riding alongside the architectural sweep:
- Drop `FlooringProduct.baseColor` column + all UI / grouping / search / grouping-key dependencies.
- Drop `FlooringProduct.photoUrls` column + the `/api/product-photos` upload route + the `parsePhotoUrls` validator. The shared `uploadFileToBucket` helper stays — work orders will reuse it.
- Make the inventory section on the product record view read-only: remove the cut-logs child-row toggle and inline editing; keep only the "Open" button that navigates to the inventory record.

Each phase below leaves the app buildable and runnable with a narrow verification. Roll forward one at a time.

---

## Current state (verified)

- Routes: `apps/web/app/api/products/route.ts` (GET + POST), `apps/web/app/api/products/[id]/route.ts` (GET + PATCH + DELETE), `apps/web/app/api/products/options/route.ts` (GET), `apps/web/app/api/product-photos/route.ts` (POST, dead on the client side).
- Route handlers call `@/modules/products/application/manage-product` (`createProductUseCase`, `updateProductUseCase`, `deleteProductUseCase`), which in turn calls `@/modules/products/data/mutations` (direct Prisma) + `@/modules/products/domain/validators`. No packages/application, packages/domain, or packages/db product files exist.
- `apps/web/modules/products/domain/services.ts` houses normalizers (`normalizeCatalogProduct`, `normalizeProductOption`) and thin wrappers over `@builders/domain`'s `buildFlooringProductDisplayName`.
- `apps/web/modules/products/domain/validators.ts` defines `validateCreateProductInput` + `validateUpdateProductInput` — will migrate to the route edge.
- `apps/web/modules/products/domain/types.ts` holds `ProductForm`, `ProductRow`, `CreateProductInput`, `DEFAULT_BASE_COLOR_OPTIONS`, `buildProductBaseColorOptions`.
- `apps/web/modules/products/domain/inventory-summary.ts` — audit during Phase 6.
- `apps/web/modules/products/record/panel/sections/product-inventory-rows-section.tsx` has the cut-logs toggle + child-row rendering + open-inventory button. Read-only elsewhere.
- `FlooringProduct` prisma schema has `baseColor String?` and `photoUrls String[] @default([])`. Both are being dropped.
- `PRODUCTS_TOOL_SLUG` — verify in `@/modules/shared/access/tool-slugs.ts` / `domain-tools.ts` during Phase 5. If missing, add it.
- `/api/product-photos` used only by a test (`apps/web/tests/modules/products/product-photos-route.test.ts`). No client upload UI wired.

---

## Phase 1 — UI cleanup: base color, product photos, inventory read-only

**Intent:** Strip all references to `baseColor`, `photoUrls`, the photo-upload route, and the inventory-section edit affordances — leaving the app runnable with the remaining fields. No schema changes yet.

### Files touched

- `apps/web/modules/products/record/panel/sections/product-primary-fields-section.tsx` — remove base-color dropdown (lines 135–150) + "Add Base Color" input (lines 152–165).
- `apps/web/modules/products/record/panel/product-record-panel.tsx` — drop base-color state + handlers.
- `apps/web/modules/products/record/create/product-create-client.tsx` — drop `baseColor` from form defaults (lines 36, 105).
- `apps/web/modules/products/record/panel/sections/product-inventory-rows-section.tsx` — remove toggle control, `isExpanded` state, cut-log child rendering. Keep Item#, Location, Import, Stock, Cost, Freight, Cut Total, Running Balance columns and the "Open" button only.
- `apps/web/modules/products/components/list/products-client.tsx` — drop `baseColor` column (line 82) and grouping option.
- `apps/web/modules/products/components/list/products-table.tsx` — drop `baseColor` cell (line 63).
- `apps/web/app/dashboard/products/page.tsx` — drop `"baseColor"` from `allowedGroupKeys` (line 20).
- `apps/web/modules/products/data/queries.ts` — drop `baseColor` from search (line 18) and order-by (line 34).
- `apps/web/modules/products/data/mutations.ts` — drop `baseColor` write (lines 57, 119).
- `apps/web/modules/products/domain/types.ts` — drop `baseColor` from `ProductForm` / `ProductRow` / `CreateProductInput`; delete `DEFAULT_BASE_COLOR_OPTIONS`, `buildProductBaseColorOptions`.
- `apps/web/modules/products/domain/validators.ts` — drop `baseColor` parse lines (56, 74); drop `parsePhotoUrls` helper; drop `photoUrls` from input types; delete unused `isBucketFileUrl` import.
- `apps/web/modules/products/domain/services.ts` — drop `baseColor` from `normalizeCatalogProduct` input + output (lines 34, 68).
- `apps/web/app/api/product-photos/route.ts` — delete file.
- `apps/web/app/api/product-photos/` — `rmdir`.
- `apps/web/tests/modules/products/product-photos-route.test.ts` — delete file.

### Verification gate
1. `npm run typecheck --workspace @builders/web` — error count must not increase beyond the current baseline for the products module (Phase 1 still leaves `photoUrls` column in the Prisma client types, so `mutations.ts` may temporarily keep writing `[]` until Phase 2).
2. Dev smoke: open `/dashboard/products`, create a product, edit it, view detail page. No base-color field visible. Inventory section shows rows with "Open" button; no toggle, no cut logs.
3. `grep -rn "baseColor\|DEFAULT_BASE_COLOR_OPTIONS\|buildProductBaseColorOptions\|parsePhotoUrls\|product-photos" apps/web --exclude-dir=.next` → zero matches.

---

## Phase 2 — Prisma schema: drop `baseColor` and `photoUrls` columns

**Intent:** Remove the dead columns from the database and regenerate the Prisma client so type errors surface if any Phase 1 stragglers were missed.

### Files touched

- `packages/db/prisma/schema.prisma` — in the `FlooringProduct` model, delete `baseColor String?` and `photoUrls String[] @default([])` lines.
- Run `npm run db:migrate:dev --workspace @builders/db -- --name drop_product_base_color_and_photo_urls`. Prisma generates `ALTER TABLE "flooring_product" DROP COLUMN "baseColor"; ALTER TABLE "flooring_product" DROP COLUMN "photoUrls";`.
- `npm run build --workspace @builders/db` — regenerates Prisma client types.

### Verification gate
1. Migration applies cleanly to dev database.
2. `npm run typecheck --workspace @builders/web` passes for products files (field references now gone from generated Prisma client too).
3. Dev smoke: create a product, read it back via detail page. Prisma no longer surfaces `baseColor` or `photoUrls` in queries.

### Rollback note

Dropping columns is destructive. For production deploys, run this migration only after confirming no client or external consumer reads either column. Rollback requires restoring from a dump; not a free re-add.

---

## Phase 3 — Build `packages/db/src/flooring/products/`

**Intent:** Canonical read/write repository layer, following the warehouse/contacts pattern.

### Files created

- `packages/db/src/flooring/products/shared.ts` — `productRowSelect`, `productDetailSelect`, `productOptionSelect`, `ProductsDbClient` type.
- `packages/db/src/flooring/products/read-repository.ts` — `ProductRecord`, `ProductDetailRecord`, `ProductOptionRecord` types; `normalizeProductRow`, `normalizeProductDetail`, `normalizeProductOption` (logic migrated from `modules/products/domain/services.ts`); `listProducts(client?)`, `getProductById(id, client?)`, `getProductDetailById(id, client?)`, `listProductOptions(client?)`, `productNameExists`, `getProductFormOptions()`.
- `packages/db/src/flooring/products/write-repository.ts` — `CreateProductInput`, `UpdateProductInput` types (field-complete, no `baseColor`, no `photoUrls`); `createProduct`, `updateProduct`, `deleteProductById`.
- `packages/db/src/flooring/products/index.ts` — re-export everything.
- `packages/db/src/index.ts` — add `export * from "./flooring/products/index.js"`.

### Verification gate
1. `npm run build --workspace @builders/db` — clean build.
2. Nothing in apps/web imports from the new product package yet; warehouse / contacts still work.

---

## Phase 4 — Build `packages/domain/` + `packages/application/` for products

**Intent:** Canonical domain + use-case layers.

### Domain (`packages/domain/src/flooring/products/`)

- `types.ts` — `ProductForm`, `ProductRow`, `EMPTY_PRODUCT_FORM`, `toProductForm(row)` (canonical shape, no base color).
- `product-rules.ts` — invariants (e.g., unique name within category+manufacturer), delete blockers, name composition rules that aren't already in `@builders/domain`'s shared helpers.
- `errors.ts` — `ProductExecutionError` + `ProductErrorCode` union (`PRODUCT_NOT_FOUND`, `PRODUCT_IN_USE`, `PRODUCT_NAME_CONFLICT`, `PRODUCT_VALIDATION_FAILED`).
- `index.ts` — re-export.

### Application (`packages/application/src/flooring/products/`)

- `types.ts` — `CreateProductInput`, `UpdateProductInput`, `ProductResult` (= `ProductRecord`).
- `errors.ts` — re-export domain's `ProductExecutionError`.
- `create-product.ts` — `createProductUseCase(input, client?)`: validates via domain rules (name conflicts, category/manufacturer existence), calls `createProduct` from `@builders/db` inside a transaction.
- `update-product.ts` — `updateProductUseCase(id, input, client?)`: uses `getProductById` + `updateProduct`.
- `delete-product.ts` — `deleteProductUseCase(id, client?)`: checks for linked inventory / work-order items / template items; throws `PRODUCT_IN_USE` if present; otherwise calls `deleteProductById`.
- `mappers.ts` (optional) — if response shaping differs from raw record.
- `index.ts` — re-export.

### Verification gate
1. `npm run build --workspace @builders/domain` + `--workspace @builders/application` — both clean.
2. Apps/web still builds against the old module-local application layer (next phase swaps).

---

## Phase 5 — Wire routes to packages + add `_validators.ts`

**Intent:** Route-edge validator, split routes into canonical create / update / delete files, and drop the module-local application layer.

### Files created

- `apps/web/app/api/products/_validators.ts` — `validateProductInput(body)` returning `CreateProductInput` from `@builders/application`. Lifts parsing from `modules/products/domain/validators.ts` minus the `photoUrls` / `baseColor` cuts already done in Phase 1. Throws `ProductExecutionError` with `PRODUCT_VALIDATION_FAILED` on missing `categoryId` / other required fields.
- `apps/web/app/api/products/[id]/primary/section/route.ts` — PATCH → `updateProductUseCase`. Pattern mirrored from `apps/web/app/api/contacts/[id]/primary/section/route.ts`. Rate limit scope `products.primary.section.replace`, 40 / 10 min.

### Files rewritten

- `apps/web/app/api/products/route.ts` — GET switches to `listProducts` (and keeps `listProductOptions` when `catalog=1`) from `@builders/db`; POST switches to `createProductUseCase` from `@builders/application` with full mutation lifecycle. Uses `validateProductInput`.
- `apps/web/app/api/products/[id]/route.ts` — **remove GET and PATCH**; keep DELETE only, calling `deleteProductUseCase`. Mirrors `apps/web/app/api/contacts/[id]/route.ts`.
- `apps/web/app/api/products/options/route.ts` — switch to `getProductFormOptions` from `@builders/db`.
- `PRODUCTS_TOOL_SLUG` — verify existence in `@/modules/shared/access/tool-slugs.ts`; add if missing.

### Files deleted

- `apps/web/modules/products/application/manage-product.ts`
- `apps/web/modules/products/application/` (directory — empty after above)

### Verification gate
1. Typecheck passes for all four route files and `_validators.ts`.
2. Dev smoke: create a product via `/dashboard/products/new` → 201, redirect to detail. Edit via detail → 200, form shows updated values. Delete via detail footer → 200, redirect to list.
3. Network tab: POST → `/api/products` (create), PATCH → `/api/products/:id/primary/section` (update), DELETE → `/api/products/:id`. All envelopes include `mutation.idempotencyKey`.

---

## Phase 6 — Module slim + client mutations + data hardening

**Intent:** Flatten `apps/web/modules/products/` into the canonical four-folder shape; retire module-local domain/application/data code; add client-side mutation helpers.

### Files created

- `apps/web/modules/products/data/mutations.ts` — `createProductRequest`, `updateProductRequest(id, input, revisionKey)`, `deleteProductRequest(id, updatedAt)`. Each wraps `withMutationMeta`. Mirror `apps/web/modules/manufacturers/data/mutations.ts`.

### Files rewritten

- `apps/web/modules/products/data/queries.ts` — swap direct Prisma calls for `listProducts`, `getProductById`, `getProductDetailById`, `listProductOptions`, `getProductFormOptions` from `@builders/db`. Follow `apps/web/modules/contacts/data/queries.ts` shape (simple try/catch + `withPrismaConnectivityHandling`).
- `apps/web/modules/products/controllers/use-product-primary-section.ts` — use canonical types from `@builders/domain` / `@builders/db`; `updateProductRequest` in `saveSection`; wire `deleteRecord`/`deleteErrorMessage`.

### Files moved (via `git mv`)

- `apps/web/modules/products/record/create/product-create-client.tsx` → `apps/web/modules/products/components/record/product-create-client.tsx`
- `apps/web/modules/products/record/detail/product-detail-client.tsx` → `apps/web/modules/products/components/record/product-detail-client.tsx`
- `apps/web/modules/products/record/panel/product-record-panel.tsx` → `apps/web/modules/products/components/record/product-record-panel.tsx`
- `apps/web/modules/products/record/panel/sections/product-primary-fields-section.tsx` → `apps/web/modules/products/components/record/product-primary-fields-section.tsx`
- `apps/web/modules/products/record/panel/sections/product-inventory-rows-section.tsx` → `apps/web/modules/products/components/record/product-inventory-rows-section.tsx`
- `apps/web/modules/products/record/panel/controllers/use-product-primary-section.ts` → `apps/web/modules/products/controllers/use-product-primary-section.ts` (verify exact path; if already under `controllers/`, no move needed)
- `apps/web/modules/products/components/products-client.tsx` (if it exists as a re-export shim) → delete; the real one is at `components/list/products-client.tsx`

### Files deleted

- `apps/web/modules/products/domain/validators.ts` — contents migrated to Phase 5 `_validators.ts`.
- `apps/web/modules/products/domain/services.ts` — normalizers moved to `packages/db/src/flooring/products/read-repository.ts` in Phase 3; `buildProductName`/`buildStoredProductName` wrappers are redundant (callers switch to `buildFlooringProductDisplayName` / `buildStoredFlooringProductName` direct from `@builders/domain`).
- `apps/web/modules/products/domain/types.ts` — canonical types live in domain / db packages.
- `apps/web/modules/products/domain/inventory-summary.ts` — audit: if pure, move to `packages/domain/src/flooring/products/inventory-summary.ts` and import from there; if it depends on Prisma row shapes, fold into `read-repository.ts` as a normalizer.
- `apps/web/modules/products/domain/` (directory — empty after above).
- `apps/web/modules/products/record/` (directory — empty after moves).

### Import rewrites (external to module)

- `apps/web/app/dashboard/products/page.tsx` — update import paths from `record/detail/...` to `components/record/...`; consume canonical `ProductRecord[]`.
- `apps/web/app/dashboard/products/[id]/page.tsx` — same; consume canonical `ProductDetailRecord`.
- `apps/web/app/dashboard/products/new/page.tsx` — same; consume canonical types.

### Verification gate
1. Typecheck passes for all product files.
2. `find apps/web/modules/products -type f | sort` shows only `components/list/`, `components/record/`, `controllers/`, `data/`, and optionally a root `CLAUDE.md` — no `domain/`, `application/`, or `record/`.
3. Dev smoke: full product CRUD via UI works end-to-end.

---

## Phase 7 — Final verification + cleanup

**Intent:** Smoke + regression greps; confirm the module is in canonical shape.

### Checks

1. **Typecheck**: `npm run typecheck --workspace @builders/web 2>&1 | grep -c "error TS"` — expect count to drop vs. the sweep's start. Residual errors should be only in inventory / cut-logs / work-orders / imports (their own future sweeps).
2. **Regression greps** (source only, exclude `.next`):
   - `grep -rn "baseColor\|photoUrls\|product-photos" apps packages --exclude-dir=.next --exclude-dir=dist` → zero.
   - `grep -rn "@/modules/products/domain\|@/modules/products/application\|@/modules/products/record" apps --exclude-dir=.next` → zero.
   - `grep -rn "@/modules/products/" apps --exclude-dir=.next` → matches only under `components/`, `controllers/`, `data/`.
3. **Module shape**: `find apps/web/modules/products -type f | sort` matches the four-folder canonical layout.
4. **Smoke flow**:
   - List `/dashboard/products` — renders, search + grouping work (no base-color option).
   - New `/dashboard/products/new` — form has no base-color field; create returns 201, redirects to detail.
   - Detail `/dashboard/products/[id]` — edit primary fields, save, see updated record. Inventory section: read-only rows, "Open" button navigates to `/dashboard/inventory/{id}`, no toggle, no cut logs visible.
   - Delete — returns 200, redirects to list.
5. **Packages build**: `npm run build --workspace @builders/db && npm run build --workspace @builders/application` — both clean.

---

## Risk notes

1. **Schema drops are destructive**. Phase 2 deletes data in `baseColor` and `photoUrls`. Safe in dev; requires a recovery plan for production — either export values to a flat file first, or accept loss.
2. **`photoUrls` is an array column**. Prisma handles the drop cleanly, but any downstream backup tooling that expects the column will need updating.
3. **`/api/product-photos` consumers outside the app**. Confirmed none on the client. If external integrations POST to this endpoint, flag before Phase 1 deletion.
4. **`isBucketFileUrl` cleanup**. If `parsePhotoUrls` is its only caller in Phase 1, the helper in `@/server/storage/s3` stays (work orders may use it). Grep to confirm before removing.
5. **`inventory-summary.ts` unknown scope**. Phase 6 audit determines its final home. Worst case: leave it in module `controllers/` as a pure helper until a later sweep absorbs it.
6. **`manufacturer` name in catalog normalization** has a fallback chain (`companyName → agentName → stored manufacturerName`). Preserve this logic when migrating `normalizeCatalogProduct` into `packages/db`'s `read-repository.ts`.
7. **Search / grouping keys**. Phase 1 drops `baseColor` from the allowed group keys in the dashboard page — confirm the UI gracefully handles an absent grouping option (no broken state when a previously-saved user preference references `baseColor`).
8. **Route policy helpers**. Phase 5's new `_validators.ts` must align with the existing `apps/web/app/api/contacts/_validators.ts` / `manufacturers/_validators.ts` signature conventions — single `validateProductInput(body) → CreateProductInput`.

