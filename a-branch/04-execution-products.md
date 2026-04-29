# Execution — Products Vertical

Chronological log of every code change made during the products sweeps. Read alongside `intent.md` and `audit.md`.

## Sweep 1 — Schema

| Change | Detail |
|---|---|
| Migration `20260428230000_add_product_unit_snapshots` | 6 nullable TEXT columns added to `flooring_product`: `sendUnitName`, `sendUnitAbbrev`, `stockUnitName`, `stockUnitAbbrev`, `itemCoverageUnitName`, `itemCoverageUnitAbbrev`. Applied to Railway. `prisma migrate diff` exit 0. |
| Backfill | N/A — user truncated `flooring_product`, `flooring_inventory`, `flooring_import_staged_inventory_row`, `flooring_template_item`, `flooring_work_order_item`. New product writes stamp natively. |

## Sweep 2 — Domain + Data + API validator

### Domain — `packages/domain/src/flooring/products/`
| File | Change |
|---|---|
| `types.ts` | Added 6 snapshot fields to `ProductRow`; trimmed `ProductRowCategory` (dropped `sendUnit/stockUnit/itemCoverageUnit` name strings); split `ProductForm` → `ProductCreateForm` + `ProductUpdateForm = Omit<ProductCreateForm, "categoryId">`; renamed `EMPTY_PRODUCT_FORM` → `EMPTY_PRODUCT_CREATE_FORM`; replaced `toProductForm` with `toProductUpdateForm` |
| `unit-snapshot.ts` (NEW) | `ProductUnitSnapshot` type + `buildProductUnitSnapshotsFromCategory(category) → ProductUnitSnapshot` pure helper |
| `product-rules.ts` | Tightened `isProductCategoryChangeBlocked` to always block any change (drops the inventory-state condition); reduced signature from 3 args to 2; `buildProductCategoryChangeBlockedMessage` now 0-arg with a generic message |
| `index.ts` | Added `export * from "./unit-snapshot.js"` |

### Data — `packages/db/src/flooring/products/`
| File | Change |
|---|---|
| `shared.ts` | Dropped nested `sendUnit/stockUnit/itemCoverageUnit` includes from category select; added 6 snapshot fields to `productRowSelect` |
| `read-repository.ts` | `ProductRecord` carries 6 snapshot fields + new `ProductRecordCategory` (id/slug/name + 3 unit IDs only); normalizer reads flat snapshot from product (no category-join traversal); `coverageUnit` aliased to `itemCoverageUnitName` for backward compat |
| `write-repository.ts` | `CreateProductInput` adds 6 snapshot fields (caller — application — supplies); `UpdateProductInput = Partial<Omit<CreateProductInput, "categoryId" \| 6 snapshot fields>>`; `updateProduct` drops the conditional categoryId set |

### API validator + routes — `apps/web/app/api/products/`
| File | Change |
|---|---|
| `_validators.ts` | Split `validateProductInput` → `validateCreateProductInput` (POST, requires `categoryId`) + `validateUpdateProductInput` (PATCH, rejects `categoryId` with 400 + `PRODUCT_CATEGORY_LOCKED`) |
| `route.ts` | POST imports `validateCreateProductInput` |
| `[id]/primary/section/route.ts` | PATCH imports `validateUpdateProductInput` |

## Sweep 3 — Application (create)

| File | Change |
|---|---|
| `packages/db/src/flooring/categories/read-repository.ts` | `categoryUnitInclude` adds `abbreviation: true` for each of `sendUnit/stockUnit/itemCoverageUnit`; `UnitRef` shape gains `abbreviation`; `CategoryRecord` exposes `sendUnitAbbrev`, `stockUnitAbbrev`, `itemCoverageUnitAbbrev`; `normalizeCategoryUnitValues` surfaces them |
| `packages/application/src/flooring/products/create-product.ts` | Imports `buildProductUnitSnapshotsFromCategory` from `@builders/domain`; after the existence check, projects the duck-typed snapshot input from `CategoryRecord` (`{ sendUnit: { name, abbreviation } \| null, ... }`); spreads the 6 fields into the `createProduct(...)` call |

## Sweep 4 — Application (update + delete)

| File | Change |
|---|---|
| `packages/application/src/flooring/products/types.ts` | `UpdateProductInput = Partial<Omit<CreateProductInput, "categoryId">>` — categoryId structurally removed at the type level |
| `packages/application/src/flooring/products/update-product.ts` | Dropped the entire 40-line `if (categoryChanged) { ... }` branch (lock check, second `getCategoryById` fetch, categoryName/Slug rebinding); dropped `if ("categoryId" in input)` from the patch builder; pruned dead imports (`getCategoryById`, `isProductCategoryChangeBlocked`, `buildProductCategoryChangeBlockedMessage`); `nameAffected` simplifies to `"style" in input \|\| "color" in input`; `categoryName` and `categorySlug` read straight from `current.category` |
| `packages/application/src/flooring/products/delete-product.ts` | No change (intentionally noted) |

## Sweep 5 — UI (record-view category readonly)

| File | Change |
|---|---|
| `apps/web/modules/products/components/record/product-primary-fields-section.tsx` | Added `categoryReadOnly?: boolean` prop (default false); when true the category cell renders as static text from `product.category.name` instead of `<select>`; `selectedCategory` lookup reads from `product.category.id` in readonly mode; renamed `ProductForm` import → `ProductCreateForm` |
| `apps/web/modules/products/components/record/product-record-panel.tsx` | Passes `categoryReadOnly` to the section |
| `apps/web/modules/products/components/record/product-create-client.tsx` | Renamed imports (`EMPTY_PRODUCT_FORM` → `EMPTY_PRODUCT_CREATE_FORM`, `ProductForm` → `ProductCreateForm`); `EMPTY_PRODUCT` now matches the new `ProductRecord` shape (added 6 snapshot + `coverageUnit` fields, dropped name strings from nested `category`) |
| `apps/web/modules/products/controllers/use-product-primary-section.ts` | Renamed imports; added `toProductRecordViewForm` local helper (synthesizes a `ProductCreateForm` from a `ProductRecord` so the section's draft type is consistent across create + edit flows); controller's local value type is now `ProductCreateForm` |
| `apps/web/modules/products/data/mutations.ts` | Added `toUpdateRequestBody` that strips `categoryId` before sending; `updateProductRequest` uses it (the API rejects `categoryId` with 400; we strip at the wire boundary so a no-op save doesn't trip it) |

## Defense-in-depth ladder for category immutability (final)

| Layer | Mechanism |
|---|---|
| UI (record view) | Category cell renders as static text — no `<select>`, no `onFieldChange` |
| Mutation helper | `toUpdateRequestBody` strips `categoryId` from the PATCH body |
| API wire | `validateUpdateProductInput` rejects `categoryId` with 400 + `PRODUCT_CATEGORY_LOCKED` |
| Application input type | `UpdateProductInput = Partial<Omit<CreateProductInput, "categoryId">>` |
| Domain form type | `ProductUpdateForm = Omit<ProductCreateForm, "categoryId">` |
| Data input type | `UpdateProductInput = Partial<Omit<…, "categoryId" \| 6 snapshots>>` |
| Domain runtime predicate | `isProductCategoryChangeBlocked(curr, next)` — always blocks any change (kept available, no longer called) |

## Outstanding (build-cascade caveats)

After sweep 5 landed, two typecheck errors persist in the web app:

| File | Error | Reason |
|---|---|---|
| `product-create-client.tsx:44` | `EMPTY_PRODUCT.category` missing `sendUnit/stockUnit/itemCoverageUnit` | IDE reads stale `db/dist/`; `ProductRecord.category` is still typed as the old `CategoryRecord` shape (with name strings) |
| `use-product-primary-section.ts:24` | `ProductRecord` not assignable to `ProductRow` | IDE reads stale `db/dist/`; `ProductRecord` lacks the 6 snapshot fields |

Both heal automatically once `@builders/db` rebuilds. The db build is currently blocked by 5 pre-existing `unitPrice` errors in `packages/db/src/management/templates/material-items/write-repository.ts` (carryover from migration `20260428220000`). Resolved by the templates domain + data sweep (next).

## Sweep position at end of products vertical

```
✅ 1. Schema
✅ 2. Products domain + data + validator
✅ 3. Products application — create
✅ 4. Products application — update + delete
✅ 5. Products UI — category field readonly
👉 6. Templates module — full sweep (heals db build cascade)
   7. Work orders module
   8. (Deferred) WOMI cut-log expandable row
```
