# Imports Staged Inventory Rows — Picker Swap (Sweep 3 of 3)

## Context

Final consumer of the product + category picker package: the **pending/staged inventory rows** section in the imports record view. The committed/imported rows section is read-only and stays untouched.

Imports already implements the standardized behavior (filter-only cascade, no auto-default, always-enabled product picker), so behavior changes are **zero**. The swap is mechanical:
- Replace per-row category + product `DropdownCell`s with `CategoryPicker` + `ProductPicker`
- Carry `productName` + `stockUnit` in the local row draft (snapshot from saved row, refreshed via picker `onOptionSelected`)
- Drop the SSR pre-fetch of all products + all categories

**One additive cross-layer change**: extend the domain `ProductOption` with `stockUnitName` + `stockUnitAbbrev`. Required because imports' starting-stock cell displays the stock unit (e.g. "sf") and the picker must surface it via the option for live snapshot capture. Purely additive — sweep 1 and 2 consumers (WO + templates) ignore the new fields.

**Out of scope:**
- Imported (committed) rows section (read-only, doesn't consume options — verified via grep)
- Imports list view, imports primary section
- Imports create flow (the staged rows section isn't rendered there)

---

## Layer-boundary contract

| Layer | New code |
| --- | --- |
| Schema | None |
| Domain | Additive: 2 new fields on `ProductOption` |
| Data | `productOptionSelect` + `normalizeProductOption` extended with 2 fields |
| Application | None — search use case passes through |
| API | None |
| Web primitives / controllers / hooks / transport | None — all reused |
| Module — products | None — `ProductPicker` reused via public export |
| Module — categories | None — `CategoryPicker` reused via public export |
| Module — imports | 5 file edits |
| `app/dashboard/imports/[id]/page.tsx` | 1 file edit |

No new imports from `modules/shared`. Pickers come in via sibling-module public exports.

---

## Reference patterns (from sweep 1 + 2)

| Concern | Reference |
|---|---|
| Section swap (DropdownCell → pickers) | `apps/web/modules/templates/components/record/template-material-items-section.tsx` |
| Controller (carry `productName` + unit, `setProductSnapshot` helper) | `apps/web/modules/templates/controllers/use-template-material-items-section.ts` |
| Domain `ProductOption` (sweep 1) | `packages/domain/src/flooring/products/types.ts` |
| DB `productOptionSelect` (sweep 1) | `packages/db/src/flooring/products/shared.ts` |

---

## Execution plan

### 1. Domain — extend `ProductOption`

[packages/domain/src/flooring/products/types.ts](packages/domain/src/flooring/products/types.ts)

Add `stockUnitName: string` and `stockUnitAbbrev: string` to `ProductOption`.

### 2. Data — extend select + normalizer

[packages/db/src/flooring/products/shared.ts](packages/db/src/flooring/products/shared.ts)

Add `stockUnitName: true, stockUnitAbbrev: true` to `productOptionSelect`.

[packages/db/src/flooring/products/read-repository.ts](packages/db/src/flooring/products/read-repository.ts)

Extend `normalizeProductOption` to populate the 2 new fields from the payload (with `?? ""` for null safety, mirroring the sendUnit treatment).

### 3. Imports module

#### 3a. `apps/web/modules/imports/data/queries.ts`

- Drop `productOptions` + `categoryOptions` from `ImportFormOptionSet`, from `getImportFormOptions` mapping, and from `ImportDetailPageData` + the `getImportDetailPageData` return.
- Keep warehouses, locations, manufacturers as-is (consumed elsewhere).

#### 3b. `apps/web/modules/imports/controllers/drafts.ts`

- Extend `ImportStagedRowDraft` with `productName: string` and `stockUnit: string` (display-only snapshots — never sent in the diff).
- Update `createImportStagedRowDraft` to seed both from the saved row (`item?.productName ?? ""`, `item?.stockUnit ?? ""`).
- Drop local `ProductOption` + `CategoryOption` type exports — no consumers after the section swap.

#### 3c. `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts`

- Update `setRowField`'s field-name parameter type to also exclude `productName` + `stockUnit` (snapshots managed by the new helper, not by free-text edits).
- Update `duplicateRow` to copy `productName` + `stockUnit` from the source (alongside existing `productId` + `categoryFilterId`).
- Add `setRowProductSnapshot(index, option: ProductOption | null)` helper that updates `productName` + `stockUnit` atomically. Mirror sweep 1/2 pattern.
- Add `ProductOption` to the domain type import line.

#### 3d. `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx`

- Drop `productOptions` + `categoryOptions` props.
- Drop `categoryCellOptions` derivation, `selectedProduct` + `visibleProducts` per-row derivations.
- Drop `DropdownCell` from cell imports. Add `CategoryPicker` + `ProductPicker` imports.
- Replace the `categoryFilter` cell with `<CategoryPicker value={row.categoryFilterId} onChange={(next) => onRowCategoryFilterChange(index, next)} selectedLabel={null} disabled={!editable} placeholder="All categories" ariaLabel={...} />`.
- Replace the `product` cell with `<ProductPicker value={row.productId || null} onChange={(next) => onRowFieldChange(index, "productId", next ?? "")} onOptionSelected={(option) => onSetRowProductSnapshot(index, option)} categoryId={row.categoryFilterId} selectedLabel={row.productName || null} disabled={!editable} placeholder="Select product" ariaLabel={...} />`.
- Starting-stock cell `unit={row.stockUnit ?? "unit"}`.
- Add new prop `onSetRowProductSnapshot: (index: number, option: ProductOption | null) => void`.
- Drop the local `ProductOption` + `CategoryOption` type imports (now from drafts.ts).

#### 3e. `apps/web/modules/imports/components/record/import-record-panel.tsx`

- Drop `productOptions` + `categoryOptions` props from signature + section forwarding.
- Drop the local `ProductOption` + `CategoryOption` type imports.
- Forward new `onSetRowProductSnapshot={stagedRowsSection.setRowProductSnapshot}`.

#### 3f. `apps/web/modules/imports/components/record/import-detail-client.tsx`

- Drop `productOptions` + `categoryOptions` props from signature + panel forwarding.
- Drop the local `ProductOption` + `CategoryOption` type imports.

#### 3g. `apps/web/app/dashboard/imports/[id]/page.tsx`

- Stop forwarding `result.data.productOptions` + `result.data.categoryOptions` to `ImportDetailClient`.

---

## Verification

1. `npm run build --workspace @builders/{domain,db,application}` — clean.
2. `npm run typecheck --workspace @builders/web` — clean.
3. `npm run build --workspace @builders/web` (Railway's step) — succeeds.
4. UI smoke (manual): open an import with staged rows. Confirm each row's product picker shows the saved product name. Type to search. Pick a category → narrows results, productId preserved. Change product → starting-stock unit suffix updates immediately. Save → round-trips. Confirm "Run Import" still queues correctly.

---

## Behavior notes (no surprises)

- **Zero user-visible behavior changes.** Imports already does filter-only cascade, no auto-default, always-enabled product picker. The picker swap preserves all of these.
- **Stock-unit live preview**: changing the product via picker immediately updates the starting-stock cell's unit suffix (carried via `onOptionSelected → setRowProductSnapshot`).
- **Page payload smaller.** Every imports detail page load no longer SSR-fetches all products + all categories.
- **Picker label seed**: `selectedLabel={row.productName}` shows the saved product name in the picker trigger.
- **Domain `ProductOption` is now richer.** Sweep 1 (WO) + sweep 2 (templates) consumers ignore the new fields — purely additive.

---

## Files touched (10)

**Modified (10), New (0):**
- `packages/domain/src/flooring/products/types.ts`
- `packages/db/src/flooring/products/shared.ts`
- `packages/db/src/flooring/products/read-repository.ts`
- `apps/web/modules/imports/data/queries.ts`
- `apps/web/modules/imports/controllers/drafts.ts`
- `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts`
- `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx`
- `apps/web/modules/imports/components/record/import-record-panel.tsx`
- `apps/web/modules/imports/components/record/import-detail-client.tsx`
- `apps/web/app/dashboard/imports/[id]/page.tsx`
