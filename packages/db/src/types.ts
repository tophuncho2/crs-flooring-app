import type { Prisma, PrismaClient } from "./generated/prisma/client.js"

export type DataAccessContext = PrismaClient | Prisma.TransactionClient
export type TransactionContext = Prisma.TransactionClient
