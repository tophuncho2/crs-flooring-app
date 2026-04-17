# Domain — Exports

> **Scope:** What domain code exposes to the application layer.

Domain exports fall into three shapes:

- **Assertions** — validate an invariant, throw a typed domain error on violation, return void.
- **Computations** — accept plain data, return derived plain data. No side effects.
- **Schemas** — Zod schemas that parse external input into a domain type.

## Output contract

- Plain data only. No Prisma types, no `Request`/`Response` objects, no HTTP status codes.
- Errors are domain-specific error classes with typed codes (not HTTP status codes).
- Queue job schemas and queue names are exported from domain because they define the shape of inter-service contracts.
