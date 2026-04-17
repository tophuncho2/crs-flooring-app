# Application Package

Use case orchestration. Coordinates domain + data layer.

## Rules

1. May import from `@builders/domain` and `@builders/db`. Nothing else.
2. No HTTP concerns — no Request, Response, status codes, or Next.js imports.
3. Every use case accepts optional `client` parameter for transaction propagation.
4. Outbox writes are always in the same transaction as the state mutation.
5. Business rules are delegated to domain — use cases do not contain their own.
6. Refer to `docs/layers/application/APPLICATION.md` for full contract.