# Predicates

> **What:** Pure boolean-returning functions that answer a single business question. No side effects, no throws.

## Where

Per-concern `*-rules.ts` files under `packages/domain/src/`.

## Exports

Function signature: `(input) => boolean`. Name as a yes/no question: `can…`, `is…`, `has…`. Inputs are plain data; callers decide how to react.

## Example

`canChangeUserRole(actor, target)` in `packages/domain/src/admin/governance-rules.ts`.
