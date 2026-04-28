# Application Package

Use case orchestration. Coordinates domain + data layer.

## Rules

1. May import from `@builders/domain`, `@builders/db`, `@builders/lib`, and `@builders/pdf`. Nothing else.
   - `@builders/lib` exposes thin SDK wrappers (storage/bucket, redis, structured logging, request-json). Use cases orchestrate; lib does the actual SDK call.
   - `@builders/pdf` exposes a thin puppeteer wrapper (`renderHtmlToPdf`). Use cases pass HTML in (built by domain message builders) and get bytes out.
2. No HTTP concerns — no Request, Response, status codes, or Next.js imports.
3. Every use case accepts optional `client` parameter for transaction propagation.
4. Outbox writes are always in the same transaction as the state mutation.
5. Business rules are delegated to domain — use cases do not contain their own.
6. Refer to `docs/layers/application/APPLICATION.md` for full contract.