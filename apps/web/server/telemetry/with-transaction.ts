import { prisma, type Prisma, type PrismaClient } from "@builders/db"

export type TransactionClient = Prisma.TransactionClient

export async function withTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
  db: PrismaClient = prisma,
) {
  return db.$transaction((tx) => operation(tx))
}
