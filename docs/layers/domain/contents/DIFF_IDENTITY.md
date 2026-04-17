# Diff Identity

> **What:** Pure helpers that stamp generated ids onto the `added` entries of a diff so downstream layers never invent IDs themselves.

## Where

`packages/domain/src/flooring/{entity}/diff-identity.ts`.

## Exports

Functions that take the diff and a caller-supplied `generateId` callback and return the same shape with an `id` stamped on every added entry. ID generation stays injected so domain remains pure.

## Example

`assignDiffIds(entries, generateId)` in `packages/domain/src/flooring/warehouses/diff-identity.ts`.
