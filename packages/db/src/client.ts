import { type Prisma, PrismaClient } from "@prisma/client"
import { getDatabaseEnvironment } from "./env.js"

declare global {
  var prismaClientSingleton: PrismaClient | undefined
}

function createPrismaClient() {
  getDatabaseEnvironment()

  return new PrismaClient({
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

export function withDatabaseTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(callback)
}
