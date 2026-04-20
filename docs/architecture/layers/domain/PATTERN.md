# Domain Layer

> **Scope:** Business rules, invariants, and pure logic. No I/O, no framework, no infrastructure.
> **Package:** `packages/domain/src/`

## Rules

1. Domain functions must be pure — no database calls, no HTTP, no filesystem, no framework imports.
2. The only external runtime dependency allowed is `zod` (queue message schemas).
3. Domain does not throw. Rules return data — `boolean` from predicates, `string` from message builders, `DiffValidationIssue[]` from diff validators. The application layer decides how to react (throw, return 4xx, keep going). Domain may export `Error` types (e.g. `WorkflowProcessingError` from `packages/domain/src/queue/workflow-processing.ts`) for workers and application to construct and throw; domain itself never throws.
4. Domain functions accept plain data and return plain data — no Prisma types, no `Request`/`Response` objects, no HTTP status codes.
5. All business rule checks (delete eligibility, name normalization, diff validation) live here, not in the application or data layer.

## Patterns

Domain exports fall into a small set of shapes:

- **Predicate** — `(input) => boolean`. Named `can…`, `is…`, `has…`. No side effects, no throws.
- **Message builder** — `(input) => string`. Named `build…Message` / `get…Message`. Paired with a predicate so the UI reads a consistent reason.
- **Normalizer** — `(raw) => canonical`. Named `normalize…`. Collapses equivalent inputs before comparison or persistence.
- **Diff validator** — `(diff, existing) => DiffValidationIssue[]`. Multi-section diffs return an issue array; the application layer maps issues to responses.
- **Identity helper** — `(entries, generateId) => entries & { id }`. Stamps ids onto added entries with an injected `generateId`.
- **Queue schema** — Zod schema + queue/job name constants + retry policy. Defines the inter-service contract.
- **Types** — TypeScript types and Zod parsers for external input.
- **Utilities** — pure formatters, calculators, and record helpers under `shared/`.

## Structure

See `packages/domain/src/` for current contents. Each concern gets its own directory (`flooring/warehouses/`, `admin/`, …). Queue definitions live in `packages/domain/src/queue/` because they describe the **shape** of inter-service contracts, not the infrastructure that processes them.

## Anti-Patterns

1. **Do not** import `@builders/db`, Prisma, or any database type in domain code.
2. **Do not** throw — return the failure as data (predicate returning `false`, message builder producing the reason, validator returning an issue).
3. **Do not** put orchestration logic here — anything that coordinates steps or calls the data layer belongs in `packages/application/`.
4. **Do not** import Next.js, React, or any UI framework.
5. **Do not** put HTTP status codes or response shaping in domain code.

## Related Docs

- [../application/APPLICATION.md](../application/APPLICATION.md) — consumes domain functions for use case orchestration
- [../data/DATA.md](../data/DATA.md) — persistence layer that domain never touches directly
