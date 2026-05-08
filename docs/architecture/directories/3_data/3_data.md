# Data

The data layer is the canonical boundary to persistence. It owns read and write access to Prisma, normalizes rows into domain-shaped records, and exposes a typed repository API per module. Use cases (and only use cases) consume it for mutation flows; read-only paths may consume it directly from routes and loaders.

- **Canonical path:** `packages/db/src/<area>/<module>/` (areas: `flooring/`, `management/`, `account/`, `auth/`, `queues/`, `shared/`)
- **Exported via:** `@builders/db`
- **Persistence does not live inside** `apps/web/modules/<module>/`
- **Prisma client is centralized** at `packages/db/src/client.ts` and exported as `db` — no other file instantiates `PrismaClient`

> Note: `apps/web/modules/<module>/data/` exists but is **not** the data layer. `queries.ts` is a thin server-side wrapper around `@builders/db` reads (with `PrismaPageDataResult<T>` translation for dashboard loaders); `mutations.ts` is `"use client"` HTTP code that calls API routes. Neither performs Prisma I/O directly.

## What data imports

- [ ] **`@prisma/client`** — `PrismaClient`, `Prisma` types/namespace
- [ ] **`@builders/domain`** — types and **pure** helpers only (formatters + pure computations) for normalizer reuse. **Forbidden:** importing rules that throw (`validate*`, `assert*`, `is*Blocked`)
- [ ] **Other files inside `packages/db/src/`** — via relative paths
- [ ] **Nothing else** — no `@builders/application`, no `apps/*`, no Next.js, no React, no HTTP libs

## Where data is imported

Data is consumed only on the server. Always imported via the `@builders/db` barrel.

- [ ] **Application layer** — `packages/application/` (use cases — the primary consumer; only use cases compose reads + writes inside transactions)
- [ ] **API routes** — `apps/web/app/api/<module>/` (call repositories after the gauntlet for simple read paths; mutations go through use cases)
- [ ] **Dashboard loaders** — `apps/web/app/dashboard/` and `apps/web/modules/<module>/data/queries.ts` (server-side only; wraps reads with `PrismaPageDataResult<T>`)
- [ ] **Module `data/queries.ts` (canonical runtime consumer)** — `apps/web/modules/<module>/data/queries.ts` is the canonical place inside a module that reaches `@builders/db` at runtime (thin wrappers over the read repository). Type-only imports of record types (e.g. `import type { WarehouseDetailRecord } from "@builders/db"`) also appear in some module `controllers/`, `components/list/`, and `components/record/` files for prop / return typing — these are erased at compile time and carry no runtime dependency. Runtime imports of `@builders/db` outside `data/` are not the canonical pattern
- [ ] **Server platform** — `apps/web/server/{auth,account,http,platform,telemetry}`
- [ ] **Worker** — `apps/worker/src/` (job processors that need persistence)
- [ ] **Relay** — `apps/relay/src/` (outbox state-machine reads/writes)

## What is NOT allowed to be built in data

- [ ] **Business rules / invariants** — belong in domain (predicates, `validate*`, `is*Blocked`)
- [ ] **Use-case orchestration** — multi-step flows, transaction openers, lock decisions belong in application; data exposes the pieces, application composes them
- [ ] **HTTP shaping** — no status codes, no `Response`/`NextResponse`, no route policies, no auth checks
- [ ] **Domain-error translation** — data returns raw Prisma errors; the application use case catches `Prisma.PrismaClientKnownRequestError` and throws module-scoped errors
- [ ] **UI code** — no JSX, no React, no `"use client"` / `"use server"` directives
- [ ] **Direct Prisma writes inside `apps/web/modules/<module>/data/mutations.ts`** — `mutations.ts` is an HTTP client, not a repository
- [ ] **Persistence under `apps/web/modules/<module>/`** — Prisma queries belong in `packages/db/src/`, not in any module directory
- [ ] **Local `PrismaClient` instances** — only `packages/db/src/client.ts` instantiates Prisma; everything else imports `db`
- [ ] **Repository functions without the optional `client` parameter** — every function must be transaction-threadable
- [ ] **Returning raw Prisma rows to callers** — every read must return a normalized record
- [ ] **Normalizers placed in domain or application** — they belong in data

## What is built in data

- [ ] **Read repository** — `read-repository.ts` with `list<Module>s`, `get<Module>ById`, `get<Module>DeleteState`, `get<Module>Options`
- [ ] **Write repository** — `write-repository.ts` with `create<Module>Record`, `update<Module>Record`, `delete<Module>ById`
- [ ] **Normalizers** — Prisma row → domain record mappers (Date → ISO string, null coalescing, relation counts, enum label mapping). May be colocated in `read-repository.ts` or split into a sibling file. **Note:** normalizers also live in the domain layer (`packages/domain/src/<area>/<module>/normalizers.ts`); data hosts the Prisma-row-to-record mappers, domain hosts the pure shape-to-shape transforms
- [ ] **Include / select shape constants** — `<module>CountInclude`, detail-include shapes (often in a `shared.ts`)
- [ ] **Transaction-aware functions** — every repository function accepts an optional `client: <Module>DbClient = db` (union of `PrismaClient | Prisma.TransactionClient`) so callers can thread a transaction
- [ ] **Outbox repository** — implements the state machine `PENDING → PROCESSING → DISPATCHED | EXHAUSTED` (under `queues/`)
- [ ] **`index.ts` barrel** — consumers import from `@builders/db`, not deep paths
