# Domain — Imports

> **Scope:** What domain code is allowed to import.

## Allowed

- `zod` — the only external runtime dependency.
- Other modules inside `packages/domain/src/`.

## Forbidden

- `@builders/db` and any Prisma type.
- `@builders/application` or anything from `apps/`.
- Next.js, React, or any UI framework.
- Node `fs`, `http`, or other I/O modules.
