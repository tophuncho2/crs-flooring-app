# Data Package

Persistence only. Prisma queries and repositories.

## Rules

1. May import from Prisma. No imports from `@builders/domain` or `@builders/application`.
2. No business logic — no conditional rules, no invariant checks.
3. Repository functions accept optional transaction client for composition.
4. Read/write repository split per module.
5. Outbox repository implements the state machine: PENDING → PROCESSING → DISPATCHED | EXHAUSTED.
6. Refer to `docs/layers/data/DATA.md` for full contract.