# Diff Rules

> **What:** Types and validators that describe a sectional diff — the `added` / `updated` / `deleted` shape the application layer hands to the data layer.

## Where

`packages/domain/src/flooring/{entity}/diff-rules.ts`.

## Exports

Draft/update/delete types per child entity, plus pure validators that assert a diff is internally consistent before it reaches persistence.

## Example

`SectionDraft`, `LocationUpdate` types in `packages/domain/src/flooring/warehouses/diff-rules.ts`.
