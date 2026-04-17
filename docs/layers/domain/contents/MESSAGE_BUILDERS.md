# Message Builders

> **What:** Pure functions that format user-facing strings from domain state. Paired with predicates so the UI reads a consistent reason.

## Where

Alongside the related predicates in `*-rules.ts`, named `build…Message` or `get…Message`.

## Exports

Function signature: `(input) => string`. No localization, no template engine — plain string concatenation over domain data.

## Example

`buildWarehouseDeleteBlockedMessage(counts)` in `packages/domain/src/flooring/warehouses/warehouse-rules.ts`.
