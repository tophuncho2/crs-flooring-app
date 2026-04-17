# Warehouse — Known Violations

> **Source:** Domain docs audit, Section 11 (`docs/scans/DOMAIN_DOCS_AUDIT.md`).
> **Status:** Open until warehouse sweep completes.

## Domain layer

- [ ] `apps/web/modules/warehouse/record/create/warehouse-create-client.tsx:16` uses local `EMPTY_WAREHOUSE_DETAIL`. Replace with `EMPTY_WAREHOUSE_FORM` from `@builders/domain`.
- [ ] `apps/web/modules/warehouse/record/create/warehouse-create-client.tsx:41` uses local `toWarehouseDraft`. Replace with `toWarehouseForm` from `@builders/domain`, or document why a separate draft shape is needed.
- [ ] `apps/web/modules/warehouse/domain/` exists. Boundary violation — web modules must not host a `domain/` folder. Move contents to `packages/domain/src/flooring/warehouses/`.
- [ ] `apps/web/modules/warehouse/types.ts` duplicates shapes from `packages/domain/src/flooring/warehouses/types.ts`. Delete and re-export from `@builders/domain`.

## Module structure

- [ ] `use-warehouse-client-controller.ts` and `use-warehouse-record-controller.ts` sit at module root. Move under `controllers/` to match swept module pattern.

## Watch items (not violations)

- `DiffValidationIssue` union in `packages/domain/src/flooring/warehouses/diff-rules.ts:50-54` currently has 4 codes covering 3 implemented rules. Expand as new multi-section invariants are added.
- No throws in warehouse domain. Keep it clean during sweep.

## Exit criteria

When every box above is checked:
1. Delete this file.
2. Delete `sweep-plan/` folder.
3. Tag `WAREHOUSE.md` header with `**Status:** Swept`.
4. Flip the Section 1 "INACCURATE (mid-sweep gap)" rows in the domain audit to ACCURATE.
