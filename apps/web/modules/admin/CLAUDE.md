# Admin Module

User governance UI for OWNER/ADMIN users.

## Rules

1. All business logic lives in `packages/domain/src/admin/` — governance predicates, role validation, permission computation.
2. All use cases live in `packages/application/src/admin/` — create, update, delete, list, get users.
3. All persistence lives in `packages/db/src/admin/` — read/write repository split with shared select/normalizer.
4. Controllers and UI live here. No domain logic, no direct Prisma calls.
5. `data/queries.ts` bridges Server Components to application use cases via `withPrismaConnectivityHandling`.
6. The `+ User` button uses the canonical `primaryAction` slot and `useRecordEntryNavigation.openCreate()`.
7. Role editing is gated by `canChangeRole` permission flag from the governance predicates.
8. Verification status is read-only — managed automatically by the set-password flow.
9. Refer to `docs/domains/USER_GOVERNANCE.md` for the governance truth table and user lifecycle.