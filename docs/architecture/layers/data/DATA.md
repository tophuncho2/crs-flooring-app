# Data Layer

> **Scope:** Persistence only. Prisma queries, raw SQL, repository functions.
> **Package:** `packages/db/src/`


## Rules

1. Data layer functions perform persistence only — no business logic, no computed business fields.
2. All queries are parameterized. No string interpolation in SQL. Use `Prisma.sql` template literals for raw queries.
3. Row locking uses `SELECT ... FOR UPDATE` via parameterized raw queries when needed for concurrency control.
4. Repository functions accept and return plain data types, not domain objects.
5. The outbox repository implements a state machine: `PENDING` -> `PROCESSING` -> `DISPATCHED` | `EXHAUSTED`.
6. Mutation receipt support provides idempotency at the persistence level.
7. All repository functions accept an optional transaction client for composition.

## Contract

Repository functions follow this shape:

```typescript
export async function findSomething(
  filter: FilterInput,
  client?: Prisma.TransactionClient | PrismaClient
): Promise<Result | null>

export async function createSomething(
  data: CreateInput,
  client?: Prisma.TransactionClient | PrismaClient
): Promise<CreatedRecord>
```

The optional client parameter enables callers to compose multiple repository calls within a single transaction.

## Structure

See `packages/db/src/` for current contents. Each concern gets its own directory (e.g., `flooring/categories/`, `admin/`).

Read/write repository split: read repositories handle queries and filtering, write repositories handle inserts, updates, and deletes.

## Anti-Patterns

1. **Do not** put business logic in repository functions — no conditional business rules, no invariant checks.
2. **Do not** use string interpolation in SQL — always use `Prisma.sql` template literals.
3. **Do not** import domain or application layer code.
4. **Do not** return Prisma-specific types to callers — map to plain types at the boundary.
5. **Do not** perform outbox state transitions outside the defined state machine.

## Related Docs

- [../application/APPLICATION.md](../application/APPLICATION.md) — consumes data layer for persistence
- [../../server/IDEMPOTENCY.md](../../server/IDEMPOTENCY.md) — mutation receipt system
- [../../execution-patterns/OUTBOX_PATTERN.md](../../execution-patterns/OUTBOX_PATTERN.md) — outbox repository usage
