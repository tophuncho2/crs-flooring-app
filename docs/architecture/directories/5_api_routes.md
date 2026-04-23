# API Routes

## Purpose

The API routes layer is the HTTP boundary. It converts a request into a typed use case invocation, enforces policy (auth, rate limits, idempotency, optimistic locking), and serializes a response. Routes own nothing that isn't HTTP-specific: no domain rules, no persistence, no Prisma.

## Location and naming

- Collection endpoints: `apps/web/app/api/<module>/route.ts` (e.g. `GET`, `POST`).
- Item endpoints: `apps/web/app/api/<module>/[id]/route.ts`.
- Section endpoints: `apps/web/app/api/<module>/[id]/<section>/route.ts` (e.g. `.../primary/section/route.ts`).
- Colocated validators: `apps/web/app/api/<module>/_validators.ts` (underscore prefix marks route-private helpers).

## Request pipeline

Every route handler follows the same shape:

1. **Policy** — `applyRoutePolicy(request, { toolSlug, capability, rateLimit? })`. Returns either an `AuthorizedRouteContext` or a `Response`; if a `Response` comes back, return it immediately.
2. **Rate limit** — `enforceQueryRateLimit` for reads, scope-specific limits for writes (e.g. `contacts.write` 60/10min).
3. **Parse + validate** — for writes, `parseMutationEnvelope(body, validate<Module>Input, { requireExpectedUpdatedAt })` extracts the typed input and the mutation metadata (idempotency key, expected-updated-at). Validators live in `_validators.ts` and throw typed execution errors (`<Module>ExecutionError`).
4. **Optimistic lock** — `assertExpectedUpdatedAt({ actual, expected, … })` for PATCH/PUT; returns 409 on conflict.
5. **Idempotency** — `enforceMutationReceipt` before the write; `finalizeMutationReceipt` after. Replays return the stored response.
6. **Delegate** — call the application-layer use case (`create<Module>UseCase`, `update<Module>UseCase`). Routes never touch `data/` directly.
7. **Respond** — `routeJson(access, body, init?)` for success, `routeError(access, error)` for normalized error handling (Prisma errors included).

## Response shape

- Wrapped objects keyed by the resource: `{ contact: ContactDetail }`, `{ manufacturer: ManufacturerRow }`, `{ contacts: ContactRow[] }`.
- Status-only mutations return `{ ok: true }`.
- Errors are normalized by `routeError` (status, field, payload).

## Auth and access

- Tool slugs come from `@/modules/shared/access/lookup-domains` (`CONTACTS_TOOL_SLUG`, `MANUFACTURERS_TOOL_SLUG`, etc.).
- Capabilities are passed in the policy call (e.g. `capability: "system.access"`).
- Routes never read the session directly; `applyRoutePolicy` is the only entry point.

## Violations checklist

- [ ] Route imports from `@/modules/<module>/data/...` (Prisma access) instead of calling a use case.
- [ ] Route defines domain rules or invariants inline (validation of business constraints belongs in validators/domain, not in the handler).
- [ ] Handler skips `applyRoutePolicy` or duplicates its auth logic.
- [ ] Mutation handler skips `parseMutationEnvelope`, `enforceMutationReceipt`, or `assertExpectedUpdatedAt` where applicable.
- [ ] Rate limit omitted on a write endpoint or on a publicly reachable read.
- [ ] Response body shape deviates from the wrapped-resource convention.
- [ ] Errors returned via `NextResponse.json` directly instead of `routeError`.
- [ ] Validators inlined in the route file instead of colocated `_validators.ts`.
- [ ] Zod/schema validation used here where the project convention is typed validators returning domain errors.
- [ ] Route file placed outside `apps/web/app/api/<module>/…` (e.g. under `src/pages/api`, or mixed into dashboard routes).
- [ ] `"use server"` action used in place of an API route without a documented reason.
