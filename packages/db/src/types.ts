import type { Prisma, PrismaClient } from "@prisma/client"

export type DataAccessContext = PrismaClient | Prisma.TransactionClient
export type TransactionContext = Prisma.TransactionClient
