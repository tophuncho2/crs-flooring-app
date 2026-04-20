# Pre-plan — Products Security Sweep

Scratch pad. Notes collected before formulating the full plan. Not a plan itself.

## Intent

Audit the products module end-to-end and harden anything that isn't locked down. "Secure" covers both data integrity (constraints, invariants, validation coverage, FK behavior, schema correctness) and mutation-lifecycle hygiene (route policy, rate limits, idempotency, `expectedUpdatedAt`, telemetry, envelope parsing, error surfacing). Goal state: nothing in the products surface area can be partially-saved, silently duplicated, or reached through a route that skips the standard guardrails.

## Quick notes (to fold into the real plan)

- **Product-name uniqueness change** — the current schema enforces `@@unique` on `FlooringProduct.name`. Change this. Open question for the real plan: drop uniqueness entirely, or move it to a composite (e.g. `@@unique([manufacturerId, name])` / `@@unique([categoryId, manufacturerId, name])`)? Either way, the global-single-name constraint goes. Decide the replacement before writing Phase A.

## Topics to cover in the real plan

(Seed list — expand during planning.)

- Schema audit: FK `onDelete` behavior, nullability, unique constraints, indexes, decimal precision on `coveragePerUnit`, orphan-prevention on category / manufacturer deletes.
- Domain rules: complete coverage of `product-rules.ts` invariants (name trim, coveragePerUnit ≥ 0, category required, category-unit consistency vs. the unit-conversion rules).
- Use-case audit: every product use case opens its own transaction, delegates rules to domain, returns canonical `ProductDetailRecord`. No ad-hoc reads/writes.
- Route audit: every mutation route runs the full lifecycle (`applyRoutePolicy` + `parseMutationEnvelope` + `assertExpectedUpdatedAt` + `enforceMutationReceipt` + `withMutationTelemetry` + `finalizeMutationReceipt`). Rate-limit scopes named correctly.
- Validator audit: `_validators.ts` structural guards match the canonical form types; no untyped `any` slipping through.
- Delete-block audit: `isProductDeleteBlocked` covers inventory references, work-order-item references, template-item references.
- Module-slim audit: products module conforms to the four-folder shape; no lingering `data/api.ts`, `domain/`, `application/`, `record/` folders inside the module; client mutations all wrap `withMutationMeta`.
- Test coverage: every public contract has at least one test; normalizer tests for every read path.
