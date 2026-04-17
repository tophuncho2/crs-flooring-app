# Normalizers

> **What:** Pure functions that collapse equivalent inputs into a single canonical form before comparison or persistence.

## Where

Alongside the related rules in `*-rules.ts`, named `normalize…`.

## Exports

Function signature: `(raw) => canonical`. Used to detect conflicts and to stamp stored values (trim, case-fold, strip punctuation, etc.).

## Example

`normalizeWarehouseName(name)` in `packages/domain/src/flooring/warehouses/warehouse-rules.ts`.
