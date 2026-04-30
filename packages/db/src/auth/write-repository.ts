import { db } from "../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"

type AuthDbClient = PrismaClient | Prisma.TransactionClient

export async function setUserPassword(
  id: string,
  hashedPassword: string,
  client: AuthDbClient = db,
): Promise<{ id: string }> {
  await client.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      isVerified: true,
    },
  })

  return { id }
}
