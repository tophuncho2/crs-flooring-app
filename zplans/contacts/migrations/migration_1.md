# Contacts Migration — Explicit Planner Instructions

These instructions tighten and extend the base contacts extraction plan. The planner must incorporate each item into the corresponding step before generating implementation tasks.

---

## Step 3 (Application Layer) — Error Rule

`ContactExecutionError` carries: `code` (string enum), `status` (HTTP 400–499), `field` (optional string), `payload` (optional record). No import from `@/server/http/api-helpers` or anything under `apps/web/`. Route handlers do not translate it; `normalizePrismaError` / `routeError` handle it via the FLO-50 path.

## Step 3 — Use Case Inventory

List every use case to extract:
- `createContact`
- `updateContact`
- `deleteContact`
- Plus any read-side orchestration currently in `manage-contact.ts` or `data/queries.ts` that involves more than a single repository call.

Single-repo reads stay as direct `@builders/db` calls from `data/queries.ts` (bridge pattern, matching categories).

## New Step 4.5 — Route Policy Audit

Before touching imports, open `app/api/contacts/route.ts` and `app/api/contacts/[id]/route.ts` and verify each handler uses:

- `applyRoutePolicy` (not `requireRouteAccess`)
- `parseMutationEnvelope` for mutations
- `enforceMutationReceipt` + `finalizeMutationReceipt` for POST/PATCH/DELETE
- `enforceQueryRateLimit` for GET
- `withMutationTelemetry` wrapping use case calls
- `routeJson` / `routeError` for responses
- `assertExpectedUpdatedAt` on PATCH/DELETE

Any handler still on `route-helpers` gets migrated in this sweep. Document the before/after state.

## Step 5 — Split Import Rules: Routes vs Components

**Routes** (`app/api/contacts/`):
- Import use cases from `@builders/application`
- May import types/schemas from `@builders/domain` for envelope parsing only
- Must not import domain predicates or normalizers

**Components and controllers** (`modules/contacts/components/`, `modules/contacts/controller/`):
- Import types from `@builders/domain`
- Must not import from `@builders/application` or `@builders/db`

## Step 5 — Shared Engine Loader

The current plan mentions `record-detail-options-loader.ts` but doesn't specify which query it pulls. Confirm it imports `listSalesRepContactOptions` (or equivalent) from `@builders/db` after the move, not from the module.

## Verification — Grep Pass

After the sweep, run these greps and confirm zero hits:

```bash
# In API routes — should have no legacy imports
grep -r 'requireRouteAccess' apps/web/app/api/contacts/
grep -r 'route-helpers' apps/web/app/api/contacts/
grep -r 'createAppError' apps/web/app/api/contacts/
grep -r 'apps/web/modules/contacts/domain' apps/web/app/api/contacts/
grep -r 'apps/web/modules/contacts/application' apps/web/app/api/contacts/

# In module components/controllers — should have no server imports
grep -r '@/server/http/' apps/web/modules/contacts/
```

All should return zero hits.

## Reference Pattern — Admin Module

The planner must mirror `packages/application/src/admin/` file-for-file:
- `errors.ts`
- `types.ts`
- Per-use-case files (one file per use case)
- `index.ts` barrel

Reference the admin module explicitly in each step as the structural template. Do not invent new structure.
