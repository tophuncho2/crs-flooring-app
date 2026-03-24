import type { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/server/db/prisma"

export type TransactionClient = Prisma.TransactionClient

export async function withTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
  db: PrismaClient = prisma,
) {
  return db.$transaction((tx) => operation(tx))
}
