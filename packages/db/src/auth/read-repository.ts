import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"

type AuthDbClient = PrismaClient | Prisma.TransactionClient

export type UserAuthRecord = {
  id: string
  email: string
  rank: string
  password: string | null
  isVerified: boolean
}

export async function findUserByEmail(
  email: string,
  client: AuthDbClient = db,
): Promise<UserAuthRecord | null> {
  return client.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      rank: true,
      password: true,
      isVerified: true,
    },
  })
}
