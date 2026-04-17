# Accepted Exceptions

> **Scope:** Documented deviations from the standard execution engine sequence.

## Rules

1. Every deviation from the 9-step execution sequence must be documented here.
2. Each exception must state what is skipped, why, and when it will be resolved (if applicable).
3. New exceptions require explicit approval — do not silently skip execution steps.
4. Exceptions to module structure (not execution) are also documented here when they represent a permanent architectural pattern.


## Exception 1: Admin-Only Endpoints Skip Optimistic Concurrency

**What:** Admin-only endpoints (user governance, system configuration) do not enforce `assertExpectedUpdatedAt()` for optimistic concurrency control.

**Why:** These endpoints are low-contention — only OWNER/ADMIN users access them, and concurrent edits are rare. The idempotency receipt layer still prevents duplicate mutations.

**Affected routes:** `/api/admin/users/[id]` (PATCH, DELETE)

**Resolution:** No change planned. The risk/complexity tradeoff does not justify adding concurrency control to admin endpoints.

## Exception 2: Account Preference Routes Are Idempotent Upserts

**What:** Table preference and navigation preference routes skip the full mutation receipt lifecycle. They use simple upserts that are naturally idempotent.

**Why:** Preferences are fire-and-forget — the client debounces (400ms) and sends the current state. Replaying the same preference update produces the same result. Mutation receipts would add overhead without benefit.

**Affected routes:** `/api/account/table-preferences/[tableKey]`

**Resolution:** No change planned. Idempotent upserts do not need receipt-based deduplication.

## Exception 3: Reference Data Modules Skip `record/`, `transport/`, `views/`, `domain/`, `application/`

**What:** Reference data modules (seeded, read-only lookup tables) do not have `record/`, `transport/`, `views/`, or `domain/` subdirectories in the module folder, and have no entries under `packages/application/` or `packages/domain/`. They consist only of `controllers/`, `components/list/`, `data/`, a module-root `types.ts`, and `CLAUDE.md`.

**Why:** Reference data has no mutation surface. There are no use cases to orchestrate, no domain rules to enforce, no record views to render, no forms to transport. The only operation is a read, which flows directly from the Server Component to `data/queries.ts` to the `packages/db/` read repository. Requiring empty subdirectories for structural uniformity would add noise without enforcement value. The pattern is defined in [REFERENCE_DATA.md](REFERENCE_DATA.md).

**Affected modules:** Unit of Measures (`modules/unit-of-measures/`), Categories (`modules/categories/`).

**Structural enforcement:** Reference data modules are identified in their module-root `CLAUDE.md` with an explicit "Reference Data Module" designation and a link to `REFERENCE_DATA.md`. The `apps/web/modules/CLAUDE.md` carve-out clause permits the deviation only for modules following this pattern. Foreign key consumers of reference data tables use `onDelete: Restrict` at the database layer, providing structural protection independent of application code.

**Resolution:** No change planned. This is a permanent architectural exception, not a migration backlog item.


## Related Docs

- [../layers/server/EXECUTION_ENGINE.md](../layers/server/EXECUTION_ENGINE.md) — the standard sequence these deviate from
- [../layers/server/IDEMPOTENCY.md](../layers/server/IDEMPOTENCY.md) — mutation receipt system
- [../layers/server/ROUTE_POLICY.md](../layers/server/ROUTE_POLICY.md) — standard route protection
