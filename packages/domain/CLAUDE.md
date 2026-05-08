# Domain Package

Pure business rules. No I/O.

## Rules

1. No imports from `@builders/db`, `@builders/application`, or any `apps/` code.
2. No Prisma types, no database calls, no HTTP, no filesystem.
3. Only allowed external dependency: `zod`.
4. All functions are pure — accept plain data, return plain data or throw typed domain errors.
