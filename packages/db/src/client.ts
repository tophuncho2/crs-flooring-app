import { PrismaPg } from "@prisma/adapter-pg"
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
  const adapter = new PrismaPg({
    connectionString: DATABASE_URL,
    application_name: process.env.RAILWAY_SERVICE_NAME ?? "crs-flooring-local",
    max: getPoolMax(),
    min: isDev ? 2 : 0,
    idleTimeoutMillis: isDev ? 0 : 10_000,
    keepAlive: isDev,
    keepAliveInitialDelayMillis: isDev ? 5_000 : 0,
  })

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
