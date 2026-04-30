# 4 — Application: Create Product Use Case

Status: **PENDING.** Scope: only `createProductUseCase`. `updateProductUseCase` and `deleteProductUseCase` are later sweeps.

## Context

Schema (1) + domain (2) + data (3) + API-validator carve-out are applied. The data layer's `createProduct` now requires six snapshot fields (`sendUnitName/Abbrev`, `stockUnitName/Abbrev`, `itemCoverageUnitName/Abbrev`). The application use case currently passes only the original 12 fields — it must read the chosen category and stamp the snapshot before writing.

## Per-file checklist

### `packages/db/src/flooring/categories/read-repository.ts`

- [ ] Extend `categoryUnitInclude` — add `abbreviation: true` to each of `sendUnit`, `stockUnit`, `itemCoverageUnit` selects.
- [ ] Extend `CategoryUnitRefs` (the duck-typed input shape) — each `UnitRef` becomes `{ id: string; name: string; abbreviation: string } | null`.
- [ ] Extend `CategoryRecord` — add `sendUnitAbbrev`, `stockUnitAbbrev`, `itemCoverageUnitAbbrev` (each `string`, defaulted to `""`).
- [ ] Update `normalizeCategoryUnitValues` to surface the three abbrev strings.

### `packages/application/src/flooring/products/create-product.ts`

- [ ] Import `buildProductUnitSnapshotsFromCategory` from `@builders/domain`.
- [ ] After the category-existence check, project the duck-typed snapshot input from `CategoryRecord`:
  ```ts
  const snapshot = buildProductUnitSnapshotsFromCategory({
    sendUnit: category.sendUnitId
      ? { name: category.sendUnit, abbreviation: category.sendUnitAbbrev }
      : null,
    stockUnit: category.stockUnitId
      ? { name: category.stockUnit, abbreviation: category.stockUnitAbbrev }
      : null,
    itemCoverageUnit: category.itemCoverageUnitId
      ? { name: category.itemCoverageUnit, abbreviation: category.itemCoverageUnitAbbrev }
      : null,
  })
  ```
- [ ] Spread the snapshot into the `createProduct(...)` call (lines 78–94 today). Six new fields get passed through.
- [ ] No new validation logic — domain helper handles all projection. No new error codes.

### `packages/application/src/flooring/products/types.ts`

- [ ] **No change.** The application's `CreateProductInput` does NOT carry snapshot fields — they're orchestrated internally by the use case from the chosen category. Wire-level input stays minimal.

## Reuses

| Reuse | Source |
|---|---|
| `buildProductUnitSnapshotsFromCategory` | `packages/domain/src/flooring/products/unit-snapshot.ts` (landed in sweep 2) |
| Snapshot-stamping pattern | `packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts:64–76` (inventory side; reads category relations + stamps onto `FlooringInventory`) |
| Existing `getCategoryById` fetch | `packages/db/src/flooring/categories/read-repository.ts:78–87` — same fetch, just gains abbrev fields |

## Pre-condition — build-cascade blocker

The five pre-existing `unitPrice` errors in `packages/db/src/management/templates/material-items/write-repository.ts` (carryover from migration 02) currently block `npm run build --workspace @builders/db` from emitting fresh `dist/`. Until `dist/` rebuilds, `@builders/application` and `@builders/web` continue to typecheck against the stale OLD data-layer shapes — the create-product changes won't surface as broken anywhere until the chain unblocks.

Two ways forward:

| Option | Approach | Cost | Pro | Con |
|---|---|---|---|---|
| **A** | Bundle a templates-MI `unitPrice` strip into this sweep | ~10 line touches across data + domain + error messages | Build cascade unblocks immediately; can verify end-to-end | Scope creep into the templates module which has its own upcoming sweep |
| **B** (recommended) | Ship the create-product changes and accept that verification is deferred until the templates sweep cleans up the column references | 0 extra lines | Tight scope respect | Cannot smoke-test or surface downstream type errors until templates lands |

Recommendation: **B**. The templates sweep is next-up after products is done; the verification gap is short-lived.

## Verification (when build-cascade unblocks)

- [ ] `npm run typecheck --workspace @builders/db` — categories changes pass; 5 pre-existing templates errors persist (will heal in templates sweep).
- [ ] `npm run typecheck --workspace @builders/application` — passes against stale dist for now; will surface true contract once db rebuilds.
- [ ] `npm run build --workspace @builders/db` — still blocked by templates errors (option B).
- [ ] **Manual smoke (post-templates-sweep):** `POST /api/products` with `categoryId` → verify all 6 snapshot columns populated on the new row. SQL spot-check:
  ```sql
  SELECT id, "sendUnitName", "sendUnitAbbrev", "stockUnitName", "stockUnitAbbrev",
         "itemCoverageUnitName", "itemCoverageUnitAbbrev"
  FROM flooring_product
  ORDER BY "createdAt" DESC LIMIT 1;
  ```

## Out of scope

- `updateProductUseCase` — separate sweep. Category + snapshot fields are already type-locked out of the update path; no behavior change needed in this sweep.
- `deleteProductUseCase` — unchanged.
- API route handlers — already wired in sweep 2 (validator split + import swaps).
- UI — record view category-field non-editability lands in the products UI sweep (later).
- Templates material-items unblock — see "Option A" above; out of scope per recommendation.

## Critical files

- `packages/db/src/flooring/categories/read-repository.ts` (extend include + CategoryRecord)
- `packages/application/src/flooring/products/create-product.ts` (snapshot stamping)

## Sweep position

```
✅ 1. Schema (applied)
✅ 2. Products domain + data + API-validator carve-out
👉 3. Products application — create use case  ← this plan
   4. Products application — update + delete use cases
   5. Products UI — record view: category field non-editable
   6. Templates module — full sweep (heals the build cascade)
   7. Work orders module
   8. (Deferred) WOMI cut-log expandable row
```
