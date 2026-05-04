# Templates Material Items — Picker Swap (Sweep 2 of 3)

## Context

Apply the product + category picker package (shipped in sweep 1) to **templates material items**. Same mechanical swap as the WO sweep, but smaller — templates already implements the standardized behavior we picked for the package (filter-only cascade, always-enabled product picker, no auto-default-category). So **no user-visible behavior changes**: just the dropdown trigger UI swaps from native `<select>` (via `DropdownCell`) to the rich-search picker, and the page payload shrinks because the SSR pre-fetch of all products + all categories goes away.

Picker package is already shipped (`ProductPicker` + `CategoryPicker` + their backends + `/api/products/options` + `/api/categories/options`). This sweep is a pure UI / data-loading consumer migration.

**Out of scope:** staged inventory rows (sweep 3 of 3).

---

## Layer-boundary contract

| Layer | New code |
| --- | --- |
| Schema / Domain / Data / Application / API | None |
| Web primitives / controllers / hooks / transport | None — all reused |
| Module — products | None — `ProductPicker` reused via public export |
| Module — categories | None — `CategoryPicker` reused via public export |
| Module — templates | 5 file edits |
| `app/dashboard/templates/[id]/page.tsx` | 1 file edit |

No new imports from `modules/shared`. Pickers come in via sibling-module public exports.

---

## Reference patterns (from sweep 1 — WO migration)

| Concern | Reference file |
|---|---|
| Section swap (DropdownCell → pickers) | `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx` |
| Controller (carry `productName` + `sendUnitAbbrev`, `setProductSnapshot` helper) | `apps/web/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section.ts` |
| Queries trim | `apps/web/modules/work-orders/data/queries.ts` |
| Panel prop drop | `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx` |

---

## Execution plan

### 1. `apps/web/modules/templates/data/queries.ts`

- Drop `listProductOptions` + `listCategories` from imports.
- Drop both fields from `loadTemplateDetailOptions()` and from the `getTemplateDetailPageData` return type.

### 2. `apps/web/modules/templates/controllers/use-template-material-items-section.ts`

- Extend `TemplateMaterialItemLocal`: add `productName: string` and `sendUnitAbbrev: string` (display-only snapshots, never sent in the diff).
- Update `toLocalItem` to seed both from `row.productName` and `row.sendUnitAbbrev`.
- Update `addItem` defaults to `""` for both new fields.
- Update `duplicateItem` to copy both from the source row (alongside the existing `productId` + `categoryFilterId` copy).
- Add `setProductSnapshot(itemId, option: ProductOption | null)` helper that updates `productName` + `sendUnitAbbrev` atomically when picker emits `onOptionSelected`. Mirror sweep 1 exactly.
- `changeCategoryFilter` already preserves `productId` — **no change**.
- Add `ProductOption` to the domain type import line.

### 3. `apps/web/modules/templates/components/record/template-material-items-section.tsx`

- Drop `productOptions` + `categoryOptions` props.
- Drop the `MaterialItemProductOption` + `TemplateMaterialItemCategoryOption` type re-exports (only the panel + detail-client consume them today — both are being updated in this sweep).
- Drop `categoryCellOptions` derivation and `productById` map. Drop the `useMemo` import if no longer used.
- Drop `DropdownCell` from cell imports. Add `CategoryPicker` + `ProductPicker` imports.
- Replace the `categoryFilter` cell branch with `<CategoryPicker value={item.categoryFilterId} onChange={(next) => onChangeCategoryFilter(item.id, next)} selectedLabel={null} disabled={!editable} placeholder="All categories" ariaLabel="Material item category filter" />`.
- Replace the `product` cell branch with `<ProductPicker value={item.productId || null} onChange={(next) => onChangeField(item.id, "productId", next ?? "")} onOptionSelected={(option) => onSetProductSnapshot(item.id, option)} categoryId={item.categoryFilterId} selectedLabel={item.productName || null} disabled={!editable} placeholder="Select product" ariaLabel="Material item product" />`.
- Quantity cell unit suffix: read from `item.sendUnitAbbrev` instead of `productById.get(item.productId)?.sendUnitAbbrev`.
- Add new prop `onSetProductSnapshot: (itemId: string, option: ProductOption | null) => void` (`ProductOption` from `@builders/domain`).

### 4. `apps/web/modules/templates/components/record/template-record-panel.tsx`

- Drop `productOptions` + `categoryOptions` props (signature + section forwarding).
- Drop `MaterialItemProductOption` + `TemplateMaterialItemCategoryOption` type imports.
- Forward new `onSetProductSnapshot={materialItems.setProductSnapshot}` from the controller to the section.

### 5. `apps/web/modules/templates/components/record/template-detail-client.tsx`

- Drop `productOptions` + `categoryOptions` props (signature + panel forwarding).
- Drop `MaterialItemProductOption` + `TemplateMaterialItemCategoryOption` type imports.

### 6. `apps/web/app/dashboard/templates/[id]/page.tsx`

- Stop forwarding `result.data.productOptions` + `result.data.categoryOptions` to `TemplateDetailClient`.

---

## Verification

1. `npm run typecheck --workspace @builders/web` — clean.
2. `npm run build --workspace @builders/web` (Railway's step) — succeeds.
3. UI smoke (manual): open a template with material items. Confirm each row's product picker shows the saved product name in the trigger. Type to search — server results stream in. Pick a category → product picker results narrow without clearing the existing product. Change product → quantity cell's unit suffix updates immediately. Save → round-trips.

---

## Behavior notes (no surprises)

- **No user-visible behavior changes.** Templates already does filter-only cascade, always-enabled product picker, and no auto-default-category. The picker swap preserves all of these.
- **Page payload smaller.** Every templates record load no longer SSR-fetches all products + all categories (`listProductOptions` + `listCategories` calls dropped from `loadTemplateDetailOptions`).
- **Picker label seeds**: `selectedLabel={item.productName}` shows the saved product name in the picker trigger before the dropdown opens.
- **Quantity unit suffix**: still shows the saved product's `sendUnitAbbrev`. Now read from local draft (carried from saved row + refreshed by `onOptionSelected` when user picks a new product).

---

## Files touched (6, all modified, 0 new)

- `apps/web/modules/templates/data/queries.ts`
- `apps/web/modules/templates/controllers/use-template-material-items-section.ts`
- `apps/web/modules/templates/components/record/template-material-items-section.tsx`
- `apps/web/modules/templates/components/record/template-record-panel.tsx`
- `apps/web/modules/templates/components/record/template-detail-client.tsx`
- `apps/web/app/dashboard/templates/[id]/page.tsx`

---

## Open questions

None.

---

## Follow-up (out of scope)

**Sweep 3 of 3 — Staged inventory rows:** apply the same row-section swap to `apps/web/modules/imports/.../import-staged-inventory-rows-section.tsx` + its controller + queries.ts. Same mechanical pattern; different module shape.
