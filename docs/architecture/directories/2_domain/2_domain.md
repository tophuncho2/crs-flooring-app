# Domain

The domain layer is the source of truth for types, rules, and invariants. Pure logic — no I/O, no framework ties, no side effects. It is the innermost dependency of the system: routes, loaders, and use cases all consume domain, but nothing in domain consumes them.

- **Canonical path:** `packages/domain/src/<area>/<module>/` (areas: `flooring/`, `management/`, `queue/`, `shared/`)
- **Exported via:** `@builders/domain`
- **Domain never lives inside** `apps/web/modules/<module>/`
- **Only allowed external dependency:** `zod`


## What is built in domain

- [ ] **Value types and DTOs** — `<Module>Row`, `<Module>Form`, enums, value objects (`types.ts`)
- [ ] **Zod schemas / payload schemas** — input shape contracts validated at boundaries; payload schemas for queue messages and form submissions
- [ ] **Validation functions** — `validate<Module>Form`, shape + invariant checks that return typed results or throw typed domain errors
- [ ] **Predicates / rule helpers** — pure boolean checks (`is<Module>DeleteBlocked`, `can<Module>Edit`) and rule helpers (`<rule>-rules.ts`, e.g. `delete-rules.ts`, `form-rules.ts`, `lock-rules.ts`)
- [ ] **Mappers / normalizers** — pure transforms between shapes (`to<Module>Form`, `normalizers.ts`)
- [ ] **Diff identity helpers** — pure helpers for diff-based updates (e.g. assigning draft IDs to added entries)
- [ ] **Domain error classes** — named error types describing domain-level failure modes (`errors.ts`, `error-messages.ts`)
- [ ] **Message builders** — pure functions that build queue payloads / outbox messages from domain inputs
- [ ] **Constants and enums** with semantic meaning (status enums, role enums, etc.)
- [ ] **`index.ts` barrel** — consumers import from the barrel, not individual files


## What domain imports

Domain consumes nothing from outside its own package other than `zod`. It is a leaf — there is no inbound dependency on application, data, apps, or any framework.

- [ ] **`zod`** — the only allowed external dependency
- [ ] **Other files inside `packages/domain/src/`** — via relative paths (e.g. `flooring/<module>/` may import from `shared/`)
- [ ] **Nothing else** — no `@builders/db`, no `@builders/application`, no `apps/*`, no Prisma, no React, no I/O libs

## Where domain is imported

Domain is the innermost layer — it is consumed everywhere outward of it, never the reverse. Always imported via the `@builders/domain` barrel, never via deep paths into `packages/domain/src/...`.

- [ ] **Application layer** — `packages/application/` (use cases consume types, schemas, predicates, message builders)
- [ ] **Data layer (carve-out only)** — `packages/db/` may import *pure* domain helpers (formatters, pure computations) to keep a single source of truth. **Forbidden:** importing rules that throw (`validate*`, `assert*`, `is*Blocked`)
- [ ] **API routes** — `apps/web/app/api/<module>/` (zod payload schemas, types, validation at the request boundary)
- [ ] **Dashboard pages / loaders** — `apps/web/app/dashboard/<module>/` (types for server-side loaders)
- [ ] **Controllers** — `apps/web/controllers/` (list-view contracts, etc., share domain types)
- [ ] **Module directories** — `apps/web/modules/<module>/{components,controllers,data,...}` (UI consumes domain types and predicates only — never re-declares them)
- [ ] **Shared components** — `apps/web/components/` (badges, cells, dialogs, sections, etc., import domain types)
- [ ] **Worker** — `apps/worker/src/processors/` (job processors consume payload schemas + types)
- [ ] **Relay** — `apps/relay/src/dispatch/` (dispatchers consume payload schemas to validate outbox rows before BullMQ publish)

## What is NOT allowed to be built in domain

- [ ] **Use cases / orchestration** — multi-step flows, transaction boundaries, lock decisions belong in application
- [ ] **I/O of any kind** — no DB calls, no HTTP, no filesystem, no queue dispatch, no `await` against external systems
- [ ] **Repository code / persistence** — no read or write repositories, no Prisma queries, no normalizers that touch a DB client
- [ ] **UI code** — no JSX, no React components, no hooks, no `"use client"` / `"use server"` directives
- [ ] **Controllers / loaders / route handlers** — no request/response shaping, no Next.js route handlers, no server-action wrappers
- [ ] **Outbox dispatch / worker logic** — building the payload is domain; sending it is application/relay
- [ ] **Generic `Error` throws** — failures must be a named domain error class
- [ ] **Stateful classes with mutable internals** — rules are pure functions over plain inputs, not class methods with hidden state
- [ ] **Local `domain/` folder inside a module directory** — would shadow the canonical package; domain only lives under `packages/domain/`
- [ ] **Duplicated domain types** — modules re-export from `@builders/domain`, they do not redeclare
