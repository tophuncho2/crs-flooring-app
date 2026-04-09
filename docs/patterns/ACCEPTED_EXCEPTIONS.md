# Accepted Exceptions

> **Scope:** Documented deviations from the standard execution engine sequence.

## Rules

1. Every deviation from the 9-step execution sequence must be documented here.
2. Each exception must state what is skipped, why, and when it will be resolved (if applicable).
3. New exceptions require explicit approval — do not silently skip execution steps.

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

## Exception 3: Auth Register Flow (Resolved)

**Resolved.** Self-registration removed per FLO-52. The register route (`POST /api/auth/register`) and Create Account UI have been deleted. Users are now created exclusively by OWNER/ADMIN via the admin panel.

## Related Docs

- [../execution/EXECUTION_ENGINE.md](../execution/EXECUTION_ENGINE.md) — the standard sequence these deviate from
- [../execution/IDEMPOTENCY.md](../execution/IDEMPOTENCY.md) — mutation receipt system
- [../execution/ROUTE_POLICY.md](../execution/ROUTE_POLICY.md) — standard route protection
