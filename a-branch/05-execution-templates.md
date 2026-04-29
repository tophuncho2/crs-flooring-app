# Execution — Templates Vertical

Layered execution log for the templates module. Two parallel cleanups happened together: stripping `unitPrice` (column dropped at schema in migration 02) and wiring the send-unit snapshot (columns added at schema in migration 02). Sweep 6 split into 4 sub-sweeps so each layer landed atomically.

## Sweep 6a — Domain + Data: strip `unitPrice`

### Domain — `packages/domain/src/management/templates/`

| File | Change |
|---|---|
| `material-items/types.ts` | Removed `unitPrice: string` from `TemplateMaterialItemRow`, `TemplateMaterialItemForm`, and `EMPTY_TEMPLATE_MATERIAL_ITEM_FORM` |
| `material-items/rules.ts` | Dropped `unitPrice` parse + range check from `validateTemplateMaterialItemForm`; kept `productId` + `quantity` validation |
| `material-items/normalizers.ts` | Removed `unitPrice` from the duck-typed `TemplateMaterialItemInput` and from the projection |
| `error-messages.ts` | Deleted `TEMPLATE_MATERIAL_ITEM_UNIT_PRICE_INVALID_MESSAGE` constant (no consumers — `validateTemplateMaterialItemForm` had used a hardcoded string) |

### Data — `packages/db/src/management/templates/`

| File | Change |
|---|---|
| `read-repository.ts` | Dropped `unitPrice: true` from `templateDetailSelect.items.select` |
| `write-repository.ts` | Same — `templateDetailSelect.items.select` |
| `material-items/read-repository.ts` | Dropped `unitPrice: true` from `templateMaterialItemSelect` |
| `material-items/write-repository.ts` | Dropped `unitPrice` from the select; from `createTemplateMaterialItemRecord` data; from `updateTemplateMaterialItemRecord` data; from `applyTemplateMaterialItemsDiff` createMany + update mappers (5 sites total — these were the build-cascade blockers) |

**Cascade unblock:** db typecheck went from 5 errors → 0; db build emitted fresh `dist/`; the three previously-blocked downstream packages (`@builders/application`, `@builders/web`) regained their up-to-date types.

## Sweep 6b — Domain + Data: wire send-unit snapshot

### Domain

| File | Change |
|---|---|
| `packages/domain/src/flooring/products/item-send-unit-snapshot.ts` (NEW) | `ItemSendUnitSnapshot` type + `buildItemSendUnitSnapshotFromProduct(product) → ItemSendUnitSnapshot` pure helper. Duck-typed on product input. **Reused verbatim by WO MI sweep.** |
| `packages/domain/src/flooring/products/index.ts` | Re-export the helper |
| `packages/domain/src/management/templates/material-items/types.ts` | Added `sendUnitName: string` + `sendUnitAbbrev: string` to `TemplateMaterialItemRow` (defaulted to `""` by normalizer) |
| `packages/domain/src/management/templates/material-items/normalizers.ts` | Duck-typed input gained `sendUnitName/Abbrev: string \| null`; projection surfaces them as `string` (`?? ""`) |

### Data

| File | Change |
|---|---|
| `packages/db/src/management/templates/material-items/read-repository.ts` | `templateMaterialItemSelect` adds `sendUnitName: true, sendUnitAbbrev: true` |
| `packages/db/src/management/templates/read-repository.ts` | Same — `templateDetailSelect.items.select` |
| `packages/db/src/management/templates/write-repository.ts` | Same — write paths return the snapshot when echoing the detail |
| `packages/db/src/management/templates/material-items/write-repository.ts` | Introduced `WriteTemplateMaterialItemInput = TemplateMaterialItemForm & ItemSendUnitSnapshot`; `createTemplateMaterialItemRecord`, `updateTemplateMaterialItemRecord`, and `applyTemplateMaterialItemsDiff` accept it and persist `sendUnitName/Abbrev`. Diff input field renamed `form` → `input` on added/modified entries |

## Sweep 6c — Application: adopt snapshot

### `packages/application/src/management/templates/material-items/`

| File | Change |
|---|---|
| `create-template-material-item.ts` | Imports `getProductById` + `buildItemSendUnitSnapshotFromProduct`; fetches the chosen product (404 → `TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED` with `field: "productId"`); merges `{ ...input.form, ...snapshot }` and passes to `createTemplateMaterialItemRecord` |
| `update-template-material-item.ts` | Same orchestration as create — load product, build snapshot, merge, write. Existing `P2025` → `TEMPLATE_MATERIAL_ITEM_NOT_FOUND` mapping preserved |
| `save-template-material-items-section.ts` | Computes distinct `productId`s across `added` + `modified`; batch-fetches via parallel `getProductById` calls; builds `Map<productId, ItemSendUnitSnapshot>`; rejects `VALIDATION_FAILED` if any product missing; passes per-entry merged `input: { ...form, ...snapshot }` to `applyTemplateMaterialItemsDiff` (renamed from `form` → `input`) |

## Sweep 6d — API + UI: drop `unitPrice`

### API validator

| File | Change |
|---|---|
| `apps/web/app/api/templates/_validators.ts` | `validateMaterialItemForm` no longer reads `obj.unitPrice` |

### API routes (verified, no edits)

| Route | Status |
|---|---|
| `apps/web/app/api/templates/route.ts` | Untouched — no material-items reference |
| `apps/web/app/api/templates/[id]/route.ts` | Untouched — DELETE only |
| `apps/web/app/api/templates/[id]/primary/section/route.ts` | Untouched — primary section, never had `unitPrice` |
| `apps/web/app/api/templates/[id]/material-items/section/route.ts` | Inherits cleanup via `validateTemplateMaterialItemsDiffInput` |

### Module dir — `apps/web/modules/templates/`

| File | Change |
|---|---|
| `controllers/use-template-material-items-section.ts` | 6 site removals: `unitPrice: string` from `TemplateMaterialItemLocal`; `unitPrice: row.unitPrice` from `toLocalItem`; `:${row.unitPrice}` from `createItemsRevisionKey`; `local.unitPrice !== server.unitPrice ||` from `itemsDiffer`; `unitPrice: local.unitPrice` from `toDiffForm`; `unitPrice: ""` from `addItem` literal |
| `components/record/template-material-items-section.tsx` | Removed `unitPrice` column def from `TEMPLATE_MATERIAL_ITEMS_LAYOUT.dataColumns`; removed `case "unitPrice"` switch arm; removed unused `CurrencyCell` import |

## Send-unit stamping pattern (locked across modules)

```ts
// per-item write (create + update use cases)
const product = await getProductById(input.form.productId, c)
const snapshot = buildItemSendUnitSnapshotFromProduct(product)
await createTemplateMaterialItemRecord(templateId, { ...input.form, ...snapshot }, c)

// diff-save (multi-product batch)
const distinctProductIds = Array.from(new Set([...added, ...modified].map(e => e.form.productId)))
const products = await Promise.all(distinctProductIds.map(id => getProductById(id, c)))
const snapshotByProductId = new Map(products.map(p => [p.id, buildItemSendUnitSnapshotFromProduct(p)]))
// merge per entry into WriteTemplateMaterialItemInput shape
```

## Final state

| Layer | unitPrice | Send-unit snapshot |
|---|---|---|
| Schema | column DROPPED (migration 02) | columns ADDED (migration 02) |
| Domain types | gone from `TemplateMaterialItemRow` + `TemplateMaterialItemForm` | added to `TemplateMaterialItemRow` (read shape only — not user-input) |
| Domain helper | — | `buildItemSendUnitSnapshotFromProduct` lives in products domain |
| Data selects | gone | included in all 3 templates selects |
| Data write inputs | gone | required via `WriteTemplateMaterialItemInput` |
| Application | gone (no validation, no plumbing) | stamped on every create/update/diff write |
| API validator | gone | n/a (worker-stamped, not user-input) |
| Module controller | gone (local type, mapping, dirty check, diff payload) | reads from server response, not editable |
| Module component | column gone, cell case gone, dead import gone | n/a (no UI display this sweep — future polish) |

## Outstanding (templates-side)

None. Templates vertical fully green at typecheck.

## Sweep position at end of templates vertical

```
✅ 1. Schema
✅ 2–5. Products vertical
✅ 6a. Templates domain + data — strip unitPrice
✅ 6b. Templates domain + data — wire send-unit snapshot
✅ 6c. Templates application — adopt snapshot
✅ 6d. Templates API + UI — drop unitPrice
👉 7. Work orders module (clones the helper + write-input + use-case pattern)
   8. (Deferred) WOMI cut-log expandable row
```
