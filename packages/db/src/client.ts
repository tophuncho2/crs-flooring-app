import { PrismaPg } from "@prisma/adapter-pg"
import { Client as PgClient } from "pg"
import { type Prisma, PrismaClient } from "./generated/prisma/client.js"
import { getDatabaseEnvironment } from "./env.js"

declare global {
  var prismaClientSingleton: PrismaClient | undefined
}

function getPoolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX
  if (!raw) return 10
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10
}

// ── Runtime cage (Cage 2) ──────────────────────────────────────────────────
// The bug class: a read/write whose select pulls 2+ relations (a `_count`
// counts), or a `Promise.all` of queries, run on a single pinned interactive-
// transaction connection fires concurrent sub-queries on that one connection.
// pg silently QUEUES + serializes them (it warns only on the 3rd, once two are
// already backed up), so the offense is invisible until it blows the tx timeout
// over the WAN dev DB. This strict client surfaces the SECOND concurrent query —
// any query issued while the connection is still mid-query — pointing the
// developer at the fix. Installed only outside production (local dev); never in a
// deployed env. Warns by default; set DB_TX_CAGE=throw to hard-fail once the
// codebase is swept clean (belt + suspenders alongside the static arch-test).
const TX_CAGE_ENABLED = process.env.NODE_ENV !== "production"
const TX_CAGE_THROWS = process.env.DB_TX_CAGE === "throw"
const TX_CAGE_MESSAGE =
  "[db-tx-cage] Concurrent query on a pinned connection: a multi-relation read or " +
  "Promise.all ran on a transaction (tx) client. Move the read to the pool (db) and " +
  "enrich after commit — see packages/application/src/shared/with-tx-then-enrich.ts."

class StrictPgClient extends PgClient {
  // Overloaded base signature — `any` is required to override it in one shot.
  // biome-ignore lint/suspicious/noExplicitAny: matches pg's overloaded query()
  query(...args: any[]): any {
    // `readyForQuery === false` means a query is already in flight on THIS client.
    // On the pool each concurrent query gets its own client, so this only trips
    // for queries piled onto one pinned (transaction) connection.
    const busy = (this as unknown as { readyForQuery?: boolean }).readyForQuery === false
    if (busy) {
      if (TX_CAGE_THROWS) {
        throw new Error(TX_CAGE_MESSAGE)
      }
      console.warn(TX_CAGE_MESSAGE, "\n", new Error("db-tx-cage").stack)
    }
    return (super.query as (...a: unknown[]) => unknown)(...args)
  }
}

export function createPrismaClient() {
  const { DATABASE_URL } = getDatabaseEnvironment()
  // Local dev connects to the shared Railway Postgres over the WAN proxy: a cold
  // connection costs ~1s (TLS over WAN) and every round-trip ~150ms. The 10s idle
  // timeout closed connections during normal think-time, so a developer paid the
  // ~1s cold-connect tax on nearly every click. Locally we keep a couple of
  // connections warm, never idle-close them, and keep the TCP socket alive. Prod
  // is in-network (reconnect ~1ms) with steady traffic, so its behavior is left
  // exactly as it was.
  const isDev = process.env.NODE_ENV === "development"
  const poolConfig = {
    connectionString: DATABASE_URL,
    application_name: process.env.RAILWAY_SERVICE_NAME ?? "crs-flooring-local",
    max: getPoolMax(),
    min: isDev ? 2 : 0,
    idleTimeoutMillis: isDev ? 0 : 10_000,
    keepAlive: isDev,
    keepAliveInitialDelayMillis: isDev ? 5_000 : 0,
    // Trip on concurrent queries on a pinned tx connection (see StrictPgClient).
    // Outside production only; the deployed pool uses the default pg client.
    ...(TX_CAGE_ENABLED ? { Client: StrictPgClient } : {}),
  }
  // Cast to PrismaPg's own pg.PoolConfig view: @types/pg types `Client` as
  // `new () => ClientBase`, which TS won't reconcile with our subclass's inherited
  // optional-config constructor across the adapter's bundled pg types.
  const adapter = new PrismaPg(poolConfig as ConstructorParameters<typeof PrismaPg>[0])

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

function getPrismaClient() {
  if (globalThis.prismaClientSingleton) {
    return globalThis.prismaClientSingleton
  }

  const prismaClient = createPrismaClient()

  // Next can bundle shared workspace packages into multiple server chunks.
  // Persisting the client on globalThis keeps those chunks from opening their own pools.
  globalThis.prismaClientSingleton = prismaClient

  return prismaClient
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const prismaClient = getPrismaClient()
    const value = Reflect.get(prismaClient, property, receiver)
    return typeof value === "function" ? value.bind(prismaClient) : value
  },
  set(_target, property, value, receiver) {
    return Reflect.set(getPrismaClient(), property, value, receiver)
  },
}) as PrismaClient

export const db = prisma

export function withDatabaseTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
) {
  return db.$transaction(callback, options)
}
