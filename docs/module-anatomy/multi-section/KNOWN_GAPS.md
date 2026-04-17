# Multi-Section — KNOWN GAPS

> Gaps that apply to the multi-section pattern as a whole. Module-specific violations live in each module's `GRADING.md`.

## Pattern maturity

- Only one multi-section module is in flight: `warehouse` (mid-sweep). The pattern cannot be fully canonized from a sample size of one. Revisit once `templates` or `work-orders` is swept.
- `PATTERN.md` is currently stubbed. Rules, module structure, dashboard and API route conventions, and anti-patterns are all `TBD` until the second multi-section module exists.

## Warehouse (the only in-flight reference)

- Warehouse is not yet a clean reference. Open violations are tracked in [warehouse/GRADING.md](warehouse/GRADING.md) and remediation in [warehouse/PLANS.md](warehouse/PLANS.md). Do not use warehouse's current structure as the authoritative pattern — some of it will change during the sweep.

## Diff infrastructure

- `DiffValidationIssue` union currently lives in `packages/domain/src/flooring/warehouses/diff-rules.ts` with warehouse-specific codes (`DUPLICATE_LOCATION_COORD_IN_ADDED`, `DUPLICATE_LOCATION_COORD`, `UNRESOLVED_TEMPID`, `DELETED_SECTION_HAS_REMAINING_LOCATIONS`). Cross-module code-naming conventions (prefixing, shared codes vs per-module codes) have not been established.
- `assignDiffIds` is a generic helper at `packages/domain/src/flooring/warehouses/diff-identity.ts` but sits under the warehouse folder. Decide whether generic diff helpers should move to `packages/domain/src/shared/` when a second consumer appears.

## Route conventions

- The `[id]/{section}/section/route.ts` shape from single-section does not obviously scale to multi-section. The warehouse sweep should surface whether multi-section uses per-child-collection routes, a single sectional-diff route, or both. Document the outcome here when known.
