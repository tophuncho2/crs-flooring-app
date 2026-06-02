import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"

type AuthDbClient = PrismaClient | Prisma.TransactionClient

export async function recordUserLoginActivity(
  input: { userId: string; userEmail: string },
  client: AuthDbClient = db,
): Promise<void> {
  await client.userLoginActivity.create({
    data: {
      userId: input.userId,
      userEmail: input.userEmail,
    },
  })
}
