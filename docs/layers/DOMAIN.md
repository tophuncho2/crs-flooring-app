# Domain Layer

> **Scope:** Business rules, invariants, and pure logic. No I/O, no framework, no infrastructure.
> **Package:** `packages/domain/src/`

## Rules

1. Domain functions must be pure — no database calls, no HTTP, no filesystem, no framework imports.
2. The only external dependency allowed is `zod` for schema validation.
3. Domain objects enforce their own invariants via assertion functions that throw typed errors.
4. Domain errors use domain-specific error classes with typed codes (not HTTP status codes).
5. All business rule checks (e.g. delete eligibility, name normalization) live here, not in the application or data layer.
6. Domain functions accept plain data and return plain data — no Prisma types, no Request/Response objects.

## Contract

Domain functions follow one of three patterns:

- **Assertion:** Validates an invariant. Throws a typed domain error on violation. Returns void.
- **Computation:** Accepts data, returns derived data. No side effects.
- **Schema:** Zod schema that validates and parses external input into a domain type.

## Structure

snapshot of domain content organized by concern - keep this as modules move in:

```
packages/domain/src/
├── flooring/
│   ├── categories/          ← delete-rules, name-rules
│   ├── contacts/            ← delete-rules, name-rules
│   ├── services/            ← delete-rules, name-rules
│   ├── unit-of-measures/    ← delete-rules, name-rules
│   └── work-orders/
│       └── allocations/     ← compatibility, status, delta, invariants,
│                              auto-allocation-plan, reservation-semantics
├── shared/
│   ├── address-helpers.ts
│   ├── date-format.ts
│   ├── line-totals.ts
│   ├── product-display-name.ts
│   ├── inventory-allocation-totals.ts
│   ├── record-summary.ts
│   ├── record-sales-reps.ts
│   └── table-preferences.ts
└── queues/
    ├── send-work-order.ts
    ├── sync-inventory.ts
    ├── auto-allocate-work-order.ts
    └── workflow-processing.ts
```

Queue definitions (job schemas, queue names) live in domain because they define the **shape** of inter-service contracts, not the infrastructure that processes them.

## Anti-Patterns

1. **Do not** import `@builders/db`, Prisma, or any database type in domain code.
2. **Do not** throw generic `Error` — use typed domain error classes with codes.
3. **Do not** put orchestration logic here — if it coordinates multiple steps or calls the data layer, it belongs in `packages/application/`.
4. **Do not** import Next.js, React, or any UI framework.
5. **Do not** put HTTP status codes or response shaping in domain code.

## Related Docs

- [APPLICATION.md](APPLICATION.md) — consumes domain functions for use case orchestration
- [DATA.md](DATA.md) — persistence layer that domain never touches directly
