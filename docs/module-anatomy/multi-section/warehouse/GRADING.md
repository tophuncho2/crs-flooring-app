# Warehouse — Grading

> Per-layer grade and open violations for the warehouse module. First multi-section module; mid-sweep.

## Domain

**Grade:** TBD

- [ ] `apps/web/modules/warehouse/domain/` exists. Web modules must not host a `domain/` folder — move contents to `packages/domain/src/flooring/warehouses/`.
- [ ] `apps/web/modules/warehouse/types.ts` duplicates shapes from `packages/domain/src/flooring/warehouses/types.ts`. Delete and re-export from `@builders/domain`.
- Watch: `DiffValidationIssue` union in `packages/domain/src/flooring/warehouses/diff-rules.ts:50-54` currently covers 3 rules with 4 codes. Expand as new multi-section invariants are added.
- Watch: No throws in warehouse domain today. Keep it clean during sweep.

## Data

**Grade:** TBD

- (no open violations)

## Application

**Grade:** TBD

- (no open violations)

## Server

**Grade:** TBD

- (no open violations)

## API

**Grade:** TBD

- (no open violations)

## Controller

**Grade:** TBD

- [ ] `apps/web/modules/warehouse/use-warehouse-client-controller.ts` and `use-warehouse-record-controller.ts` sit at module root. Move under `controllers/` to match swept module pattern.

## UI

**Grade:** TBD

- [ ] `apps/web/modules/warehouse/record/create/warehouse-create-client.tsx:16` uses local `EMPTY_WAREHOUSE_DETAIL`. Replace with `EMPTY_WAREHOUSE_FORM` from `@builders/domain`.
- [ ] `apps/web/modules/warehouse/record/create/warehouse-create-client.tsx:41` uses local `toWarehouseDraft`. Replace with `toWarehouseForm` from `@builders/domain`, or document why a separate draft shape is needed.

## Exit criteria

When every box above is checked and grades are assigned:
1. Flip the Section 1 "INACCURATE (mid-sweep gap)" rows in `docs/scans/DOMAIN_DOCS_AUDIT.md` to ACCURATE.
2. Tag `PLANS.md` header with `**Status:** Swept`.
3. Retire this file (or keep as a sealed record of the sweep).
