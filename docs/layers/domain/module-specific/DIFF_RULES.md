# Diff Rules

> **What:** Types, per-rule checkers, the `DiffValidationIssue` union, and the `validateDiff` orchestrator for sectional diffs. Application layer consumes issues and decides the response.

## Where

`packages/domain/src/flooring/{entity}/diff-rules.ts`.

## Exports

- **Draft / update / delete types** per child entity (e.g. `SectionDraft`, `LocationDraft`, `LocationUpdate`, `LocationDelete`).
- **`DiffValidationIssue`** — a discriminated union keyed by `code`. Each module defines its own codes. Warehouses currently ships: `DUPLICATE_LOCATION_COORD_IN_ADDED`, `DUPLICATE_LOCATION_COORD`, `UNRESOLVED_TEMPID`, `DELETED_SECTION_HAS_REMAINING_LOCATIONS`.
- **Per-rule finders** — pure functions that each return `DiffValidationIssue[]` for one rule (e.g. `findDuplicateLocationCoordsInDiff`, `findUnresolvedTempIds`, `findStrandedLocations`).
- **`validateDiff(diff, existing)`** — the orchestrator. Runs every rule and returns the concatenated `DiffValidationIssue[]`. Returns `[]` when the diff is valid. Never throws.

## Contract

Validators accept the proposed diff plus the relevant existing state, return issues as data. The application layer maps issues to HTTP responses or domain errors.

## Example

`validateDiff` in `packages/domain/src/flooring/warehouses/diff-rules.ts`; consumed by `save-sections-with-locations` in the application layer.
