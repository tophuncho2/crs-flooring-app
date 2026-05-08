# Data Package

Persistence only. Prisma queries and repositories.

## Rules

1. May import from Prisma. No imports from `@builders/application`. **Carve-out for `@builders/domain`:** data-layer normalizers MAY import *pure domain helpers* (formatters + pure computations) to keep a single source of truth for derived strings/numbers. They MUST NOT import domain rules that throw (`validate*`, `assert*`, `is*Blocked`). This carve-out was established in Sweep 1 — examples: `calculateImportSummary`, `buildFlooringProductDisplayName`, `formatFullLocationCode`. This is data *reusing* a pure utility, not domain *dictating* behavior; control flow still runs routes → application → data.
2. No business logic — no conditional rules, no invariant checks.
3. Repository functions accept optional transaction client for composition.
4. Read/write repository split per module.
5. Outbox repository implements the state machine: PENDING → PROCESSING → DISPATCHED | EXHAUSTED.
