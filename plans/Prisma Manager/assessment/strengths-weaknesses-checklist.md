# Prisma Manager Strengths / Weaknesses Checklist

## Strengths

- [x] Prisma schema models a real operational workflow rather than placeholder CRUD.
- [x] Most relations use intentional `Cascade`, `Restrict`, or `SetNull` behavior.
- [x] Work-order and related operational tables have meaningful hot-path indexes.
- [x] Critical multi-step mutations already use Prisma transactions.
- [x] The project has supporting schema/data-model/Postgres planning documents.
- [x] Validation helpers exist for required strings, decimals, state abbreviations, and known Prisma errors.

## Weaknesses

- [ ] Warehouse section/location routes are fully aligned to the Prisma schema.
- [ ] Raw SQL exceptions are documented and governed by a Prisma-manager policy.
- [ ] Schema-level check constraints exist for the most important numeric and lifecycle invariants.
- [ ] Enum cleanup is complete across schema, code, and workflow terminology.
- [ ] Validation ownership is standardized across field parsing, domain rules, and DB constraints.
- [ ] Migration review has a consistent rubric before schema changes are merged.
- [ ] Query-shape audits exist for the heaviest detail pages and option loaders.

## Immediate Prisma Manager Actions

- [ ] Reconcile `FlooringSection` / `FlooringLocation.sectionId` with the live warehouse routes.
- [ ] Create a raw-SQL inventory and classify each use as canonical, temporary, or debt.
- [ ] Define the first set of DB-level check constraints for quantities, costs, and lifecycle consistency.
- [ ] Write a Prisma migration review checklist for future schema changes.
- [ ] Add validation/invariant tests for schema-critical workflows.
