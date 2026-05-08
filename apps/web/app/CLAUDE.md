## Routing — under `apps/web/app/api/`

Routes live outside the module folder, under `apps/web/app/api/{module}/`. Each route handler calls exactly one use case from `packages/application/` (or one repository read) — no business logic in route handlers. Every mutation goes through the canonical gauntlet (`applyRoutePolicy`, `parseMutationEnvelope`, `enforceMutationReceipt`, `finalizeMutationReceipt`, `withMutationTelemetry`). Validators colocate in `_validators.ts`.

### Module-level routes

```
apps/web/app/api/{module}/
├── _validators.ts                       — per-module input validators
├── route.ts                             — GET list + POST create
├── options/route.ts                     — GET form options (powers components/picker/)
└── {action}/route.ts                    — optional: module-scoped action route (e.g. POST /from-template)
```

### Section-diff routes (atomic per record section)

```
apps/web/app/api/{module}/[id]/
├── route.ts                             — GET detail + DELETE record
├── primary/section/route.ts             — PATCH primary section
└── {child-section}/section/route.ts     — PATCH atomic diff for the section
```

Each `section/route.ts` accepts the section's diff (added/updated/removed) and applies it in one transaction. This is the canonical pattern for sections whose state is reconciled as a single atomic diff (e.g. primary fields, material items).

### Per-row sync routes (canonical for new per-row mutations)

For sections that mutate **one row at a time** synchronously (no worker, no outbox), the canonical shape is one folder per child collection with per-row + sub-action route files:

```
apps/web/app/api/{module}/[id]/{collection}/
├── route.ts                                   — POST create one row
├── {action}/route.ts                          — POST collection-scoped action (e.g. /finalize)
└── [{rowId}]/
    ├── route.ts                               — PATCH update / DELETE one row
    └── {action}/route.ts                      — POST per-row action (e.g. /void)
```

Each handler calls one use case, takes the necessary `FOR UPDATE` lock, and returns 200 with the post-mutation row + recomputed parent totals. The section controller patches local state from the response without a refetch.

### Sub-resource routes (per-row reads / scoped helpers)

```
apps/web/app/api/{module}/[id]/{collection}/[{rowId}]/{action}/route.ts   — e.g. GET /download (signed URL)
apps/web/app/api/{module}/[id]/{collection}/[{rowId}]/{scope}/route.ts    — e.g. GET /eligible-inventory
```

Used for read-only helpers scoped to a specific row (signed download URLs, eligibility lookups, etc.).

### Loaders

Dashboard pages under `apps/web/app/dashboard/{module}/` are SSR loaders that import only from `modules/{module}/data/queries.ts`.
