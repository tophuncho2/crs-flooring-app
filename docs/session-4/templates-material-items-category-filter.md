# Templates material items — row-scoped category filter

Adds a **Category** column to the templates record view's material items grid, immediately to the left of Product. The column lives at the section level: each material item row has its own `DropdownCell` that filters which products appear in that row's product picker. Mirrors the row-scoped category filter in the imports staged-rows section.

## Scope

| Area | Status |
|---|---|
| `Category` column inserted left of Product in templates material items | ✅ |
| Product dropdown filters by selected category (always preserves current selection) | ✅ |
| `ProductOption` in `@builders/db` augmented with `categoryId` | ✅ |
| `categoryOptions` loaded via `listCategories()` and threaded page → detail-client → record-panel → section | ✅ |
| `categoryFilterId` on `TemplateMaterialItemLocal` (client-only UI state, excluded from diff) | ✅ |
| `changeCategoryFilter` controller handler | ✅ |
| Mutation / API route changes | ⛔ none (filter is client-only) |
| DB schema changes | ⛔ none (no new column) |
| Other modules (imports / inventory / work-orders) | 🔒 untouched |
| `apps/web/modules/shared/engines/*` | 🔒 untouched |

## Files touched

- [packages/db/src/flooring/products/shared.ts](../packages/db/src/flooring/products/shared.ts) — `productOptionSelect` extended with `categoryId: true`
- [packages/db/src/flooring/products/read-repository.ts](../packages/db/src/flooring/products/read-repository.ts) — `ProductOptionRecord` + `normalizeProductOption` extended with `categoryId`
- [apps/web/modules/templates/data/queries.ts](../apps/web/modules/templates/data/queries.ts) — `listCategories()` added to `loadTemplateDetailOptions()`; `categoryOptions` exposed in the page-data type
- [apps/web/app/dashboard/templates/[id]/page.tsx](../apps/web/app/dashboard/templates/[id]/page.tsx) — passes `categoryOptions` to `TemplateDetailClient`
- [apps/web/modules/templates/components/record/template-detail-client.tsx](../apps/web/modules/templates/components/record/template-detail-client.tsx) — accepts + forwards `categoryOptions`
- [apps/web/modules/templates/components/record/template-record-panel.tsx](../apps/web/modules/templates/components/record/template-record-panel.tsx) — accepts `categoryOptions`; passes it + `onChangeCategoryFilter` to the section
- [apps/web/modules/templates/controllers/use-template-material-items-section.ts](../apps/web/modules/templates/controllers/use-template-material-items-section.ts) — `categoryFilterId` field added to `TemplateMaterialItemLocal`; initialized as `null` in both `toLocalItem` (server-loaded rows) and `addItem` (new rows); `changeCategoryFilter` handler exported. **Crucially:** `toDiffForm` and `itemsDiffer` continue to enumerate only the four persisted fields (`productId`, `quantity`, `unitPrice`, `notes`) so `categoryFilterId` is automatically excluded from the diff.
- [apps/web/modules/templates/components/record/template-material-items-section.tsx](../apps/web/modules/templates/components/record/template-material-items-section.tsx) — new `Category` column, new `TemplateMaterialItemCategoryOption` exported type, `MaterialItemProductOption` upgraded to include `categoryId: string`, product dropdown filters by `categoryFilterId` while always preserving the currently-selected product

## Data layer change — backwards-compatible

The `ProductOption` shape is now `{ id, name, categoryId }` instead of `{ id, name }`. This is a purely additive change; existing consumers (imports / inventory / work-orders / templates' primary section) all continue to read only `id` and `name` and ignore the new field.

After editing the source, `packages/db` had to be rebuilt (its `dist/` is what other packages resolve via the package's `exports.types`):

```
$ pnpm exec tsc -p packages/db/tsconfig.json
```

Without the rebuild the typecheck of `apps/web` reports a phantom mismatch between the live source's `MaterialItemProductOption` (with `categoryId`) and the stale compiled `ProductOptionRecord` (without `categoryId`). Subsequent `apps/web` typecheck runs are clean once the dist refreshes.

## Behavior

### Default (no filter)
- All existing material item rows load with `categoryFilterId: null`. The Category dropdown shows the placeholder "All categories"; the Product dropdown shows the full product list.

### Filter applied
- Selecting a category narrows the Product dropdown's options to that category's products **plus** the row's currently-selected product (so a previously-chosen product stays visible even if it falls outside the new filter).
- Clearing the category (× in the Category dropdown) restores the unfiltered Product list.
- Changing the category does **not** mark the section dirty — `categoryFilterId` is excluded from the diff. Only changes to `productId` / `quantity` / `unitPrice` / `notes` toggle the Save button.

### New rows
- "Add Material Item" appends a row with `categoryFilterId: null` (same as existing server-loaded rows). Picking a category narrows the Product list immediately.

## Verification

### Typecheck

| Stage | Total `apps/web` errors | `modules/templates/` errors |
|---|---|---|
| Baseline (pre-sweep) | 57 | 0 |
| After Phase 1 (packages/db ProductOption augment + dist rebuild) | 57 | 0 |
| After Phase 2-4 (data layer + props + controller) | 57 | 0 |
| After Phase 5 (section UI) | 57 | 0 |

Zero new errors at every stage. `packages/db` typecheck also clean.

### Tests

| Stage | Test files | Tests |
|---|---|---|
| Baseline | 9 failed / 37 passed (46) | 20 failed / 163 passed (183) |
| After this sweep | 9 failed / 37 passed (46) | 20 failed / 163 passed (183) |

Zero regressions.

### Grep gate

```
$ grep -rn "categoryFilterId" apps/web/modules/templates/
apps/web/modules/templates/components/record/template-material-items-section.tsx:105:                  value={item.categoryFilterId}
apps/web/modules/templates/components/record/template-material-items-section.tsx:117:              const visibleProducts = item.categoryFilterId
apps/web/modules/templates/components/record/template-material-items-section.tsx:119:                    (p) => p.categoryId === item.categoryFilterId || p.id === item.productId,
apps/web/modules/templates/controllers/use-template-material-items-section.ts:26:  categoryFilterId: string | null
apps/web/modules/templates/controllers/use-template-material-items-section.ts:40:    categoryFilterId: null,
apps/web/modules/templates/controllers/use-template-material-items-section.ts:165:        categoryFilterId: null,
apps/web/modules/templates/controllers/use-template-material-items-section.ts:200:        row.id === itemId ? { ...row, categoryFilterId: categoryId } : row,
```

`categoryFilterId` appears only in the templates section UI + its controller. The diff-builder, validator, and mutation payload types do not reference it.

## Out of scope — picked up later

- **Persisting `categoryFilterId`.** Today's design is client-only (mirrors imports staged-rows). If a row's category filter ever needs to survive navigation / refresh, that would be a separate design touching the DB schema, the diff payload, and the form types.
- **Category-aware validation.** Save validation today does not enforce that a chosen product belongs to the row's selected category. The filter is purely a picker ergonomic.
- **Adoption elsewhere.** The `ProductOption.categoryId` augmentation is now available everywhere; modules can opt in to category-filtering when they need it without further data-layer work.
