# Product + Category Picker Package — WO Material Items (Sweep 1 of 3)

## Context

Build the product-search infrastructure end-to-end (Domain → Data → Application → API → Module → Picker), then apply it to **work orders material items only** this sweep. Categories' search infra already exists end-to-end and `CategoryPicker` already exists — reused as-is.

**Templates + staged-inventory follow-up sweeps** will reuse the same picker package once the WO migration validates the shape.

Per-row Category filter narrows the Product picker via server-side filter (`?categoryId=`). Filter-only cascade — changing the category never clears `productId`. WO's current "auto-default category to saved product's category" + "clear product on category change" behaviors are dropped to align with the established async-picker pattern.

**Out of scope this sweep:**
- Templates row section / controller / queries
- Staged inventory row section / controller / queries
- Category list view (per user — no search there)
- Products list view

## Resolved decisions

| Decision | Choice |
|---|---|
| `/api/products/options` collision | Rename existing form-options endpoint → `/api/products/form-options`. Use canonical `/api/products/options` for new search. **No client callers** of the old URL exist (verified) — only server-side `getProductFormOptions()` direct imports, untouched. |
| WO row's auto-default category to saved product's category | Drop. Saved row loads with `categoryFilterId=null`, picker shows all products until user picks a category. |
| SSR pre-fetch of `productOptions` + `categoryOptions` in WO `queries.ts` | Drop. Picker fetches on demand. Read-only product label comes from row's existing joined `productName` field. |
| Cascade reset behavior on WO | PRESERVE — changing category narrows results, never clears `productId`. (WO loses its current clear-on-change.) |
| Sweep boundary | WO only. Picker package ships ready; templates + imports adopt in follow-up sweeps. |

---

## Layer-boundary contract

| Layer | New code |
| --- | --- |
| Schema | None |
| Domain | New `ProductOption` type at `packages/domain/src/flooring/products/types.ts` (or confirm existing). |
| Data | New `searchProductOptions` in `packages/db/src/flooring/products/read-repository.ts`. |
| Application | New `packages/application/src/flooring/products/search-product-options.ts`. |
| API | New `apps/web/app/api/products/options/route.ts` (search). Existing same-path route relocates to `apps/web/app/api/products/form-options/route.ts`. New `validateProductOptionsQuery` in `apps/web/app/api/products/_validators.ts`. |
| Web primitives / controllers / hooks / transport | None — `AsyncRichDropdown`, `useAsyncRichDropdownController`, `StaticFieldValue`, `requestJson` reused. |
| Module — products | New `apps/web/modules/products/components/picker/product-picker.tsx` + `apps/web/modules/products/data/product-options-request.ts`. |
| Module — categories | None — `CategoryPicker` reused via public export. |
| Module — work-orders | Section + controller + queries + panel/create-client edits. |
| Module — templates / imports | Untouched this sweep. |

No new code in `apps/web/components/`, `apps/web/controllers/`, `apps/web/hooks/`, `modules/shared/`. Pickers imported via sibling-module public exports — same pattern.

---

## Reference patterns

| Concern | Reference |
|---|---|
| Picker component (with `onOptionSelected`) | [property-picker.tsx](apps/web/modules/properties/components/picker/property-picker.tsx) |
| Picker request fn | [property-options-request.ts](apps/web/modules/properties/data/property-options-request.ts) |
| Search use case | [search-property-options.ts](packages/application/src/management/properties/search-property-options.ts) |
| DB search fn | `searchPropertyOptions` in [read-repository.ts](packages/db/src/management/properties/read-repository.ts) |
| Existing options API route | [api/properties/options/route.ts](apps/web/app/api/properties/options/route.ts) |
| Existing CategoryPicker (reused) | [category-picker.tsx](apps/web/modules/categories/components/picker/category-picker.tsx) |
| Existing product list-view query (carve from) | `listProductsForListView` in `packages/db/src/flooring/products/read-repository.ts` |

---

## Execution plan

### 1. Domain — `packages/domain/src/flooring/products/`

- Add `ProductOption` type: `{ id, name, categoryId, sendUnitName, sendUnitAbbrev }` mirroring `ProductOptionRecord` shape used by DB. Re-export from products domain index.

### 2. Data — `packages/db/src/flooring/products/read-repository.ts`

- Add `searchProductOptions({ search?, categoryId?, take }, client?) → Promise<ProductOption[]>`:
  - Where: `style` contains search (case-insensitive); `categoryId = categoryId` if set
  - Order: existing `[{ name: "asc" }, { style: "asc" }, { color: "asc" }]`
  - Select: `{ id, name, categoryId, sendUnitName, sendUnitAbbrev }`

### 3. Application — `packages/application/src/flooring/products/`

- New `search-product-options.ts`: trim search, trim categoryId, clamp take 1–50 (default 20), delegate to `searchProductOptions`. Re-export from products application barrel.

### 4. API — `apps/web/app/api/products/`

- **Relocate** `apps/web/app/api/products/options/route.ts` → `apps/web/app/api/products/form-options/route.ts`. Update rate-limit scope path string. Content otherwise unchanged.
- **Create new** `apps/web/app/api/products/options/route.ts`: GET only, mirrors `apps/web/app/api/properties/options/route.ts`. Calls `searchProductOptionsUseCase(input)` → returns `{ options }`.
- **Add validator** `validateProductOptionsQuery` to `apps/web/app/api/products/_validators.ts`: zod `{ search?, categoryId?, take: int 1-50 default 20 }`.

### 5. Module — products

- New `apps/web/modules/products/data/product-options-request.ts` mirroring `property-options-request.ts`. Bucket key `["products", "options"] as const`. Args include optional `categoryId`.
- New `apps/web/modules/products/components/picker/product-picker.tsx` mirroring `PropertyPicker` exactly:
  - Props: `value`, `onChange`, `categoryId?`, `selectedLabel?`, `onOptionSelected?(option)`, `placeholder`, etc.
  - Bucket key folds in `categoryId` so React Query buckets results per filter.
  - `onOptionSelected` exposes the picked `ProductOption` so callers can mirror selection in adjacent UI (categoryId, sendUnitAbbrev, etc.).

### 6. Module — work-orders (the actual swap)

#### 6a. `apps/web/modules/work-orders/data/queries.ts`

- Drop `listProductOptions` + `listCategories` from imports + from `getWorkOrderFormOptions`. Drop both fields from `WorkOrderFormOptionSet`.

#### 6b. `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx`

- Drop `productOptions` + `categoryOptions` props.
- Replace the `categoryFilter` cell branch with `<CategoryPicker value={item.categoryFilterId} onChange={(id) => section.changeCategoryFilter(item.id, id)} selectedLabel={null} placeholder="All categories" ariaLabel="Material item category filter" />`.
- Replace the `product` cell branch with `<ProductPicker value={item.productId || null} onChange={(id) => section.changeField(item.id, "productId", id ?? "")} categoryId={item.categoryFilterId} selectedLabel={item.productName ?? null} placeholder="Select product" ariaLabel="Material item product" />`.
- Drop the `productById` / `productCategoryId` / `effectiveCategoryId` derivations (auto-default behavior gone).
- Drop the `editable && hasCategory` gate on the product cell — picker is always enabled.
- Read-only branch: render `<StaticFieldValue>{item.productName ?? "—"}</StaticFieldValue>` for product; category gets `"—"` when not editable (categoryFilterId is client-only with no persisted name).

#### 6c. `apps/web/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section.ts`

- `changeCategoryFilter(itemId, categoryId)` — set `item.categoryFilterId = categoryId`, **do not** touch `item.productId`.
- Drop the `productById` lookup map and any auto-default-to-saved-product's-category logic.
- Verify `WorkOrderMaterialItemDraft.productName` is being maintained from the saved row's joined field — needed for picker `selectedLabel`.

#### 6d. `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx`

- Drop `productOptions` + `categoryOptions` props from forwarding to `WorkOrderMaterialItemsSection`.

#### 6e. `apps/web/modules/work-orders/components/record/work-order-create-client.tsx`

- Same drops if it forwards these props (it does for the WO create flow).

### 7. Verification

1. `npm run build --workspace @builders/domain && ... @builders/lib && ... @builders/db && ... @builders/application` — each layer clean.
2. `npm run typecheck --workspace @builders/web` — clean.
3. `npm run build --workspace @builders/web` — succeeds (Railway's build step).
4. UI smoke (manual): open WO record, edit material items, confirm product picker shows existing selection's label, change category, confirm results narrow + product remains, type to search, save, round-trip.

---

## Files touched (~13)

**New (6):**
- `packages/domain/src/flooring/products/types.ts` (add `ProductOption` + index re-export)
- `packages/application/src/flooring/products/search-product-options.ts` (+ index re-export)
- `apps/web/app/api/products/form-options/route.ts` (relocated)
- `apps/web/app/api/products/options/route.ts` (new search; replaces relocated route at this path)
- `apps/web/modules/products/components/picker/product-picker.tsx`
- `apps/web/modules/products/data/product-options-request.ts`

**Modified (~7):**
- `packages/db/src/flooring/products/read-repository.ts`
- `apps/web/app/api/products/_validators.ts`
- `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx`
- `apps/web/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section.ts`
- `apps/web/modules/work-orders/data/queries.ts`
- `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx`
- `apps/web/modules/work-orders/components/record/work-order-create-client.tsx`

**Deleted (0):** existing `apps/web/app/api/products/options/route.ts` is relocated, not deleted.

---

## Open questions

None remaining.

---

## Follow-ups (out of scope)

- **Sweep 2 — Templates material items:** apply same row swap to `template-material-items-section.tsx` + controller + queries.ts.
- **Sweep 3 — Staged inventory rows:** apply same row swap to `import-staged-inventory-rows-section.tsx` + controller + queries.ts.

Both follow-ups are pure UI swaps — picker package + APIs already shipped after this sweep.
