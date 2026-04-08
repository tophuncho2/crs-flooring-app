import { db } from "../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import { managedUserSelect, normalizeManagedUserRow } from "./shared.js"
export type { ManagedUserRecord } from "./shared.js"

type AdminDbClient = PrismaClient | Prisma.TransactionClient

// --- Read functions ---

export async function findManagedUsers(
  client: AdminDbClient = db,
): Promise<ManagedUserRecord[]> {
  const users = await client.user.findMany({
    where: {
      role: {
        in: ["OWNER", "ADMIN", "BUILDER"],
      },
    },
    orderBy: { createdAt: "desc" },
    select: managedUserSelect,
  })

  return users.map(normalizeManagedUserRow)
}

export async function findManagedUserById(
  id: string,
  client: AdminDbClient = db,
): Promise<ManagedUserRecord | null> {
  const user = await client.user.findUnique({
    where: { id },
    select: managedUserSelect,
  })

  if (!user) return null

  return normalizeManagedUserRow(user)
}
