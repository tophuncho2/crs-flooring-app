# Normalizers

> **What:** Pure functions that collapse equivalent inputs into a single canonical form before comparison or persistence.

## Where

Per-concern `*-rules.ts` files, named `normalize…`. Cross-cutting normalizers live in `packages/domain/src/shared/` (e.g. `address-helpers.ts`).

## Exports

Function signature: `(raw) => canonical`. Used to detect conflicts and to stamp stored values (trim, case-fold, strip punctuation, etc.).

## Example

`normalizeWarehouseName(name)` in `packages/domain/src/flooring/warehouses/warehouse-rules.ts`.
