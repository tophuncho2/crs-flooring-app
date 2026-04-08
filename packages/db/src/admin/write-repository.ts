import { db } from "../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import type { ManagedUserRecord } from "./shared.js"
import { managedUserSelect, normalizeManagedUserRow } from "./shared.js"

type AdminDbClient = PrismaClient | Prisma.TransactionClient

// --- Input types ---

export type ManagedUserUpdateInput = {
  isVerified?: boolean
  role?: string
}

// --- Write functions ---

export async function updateManagedUser(
  id: string,
  data: ManagedUserUpdateInput,
  client: AdminDbClient = db,
): Promise<ManagedUserRecord> {
  const row = await client.user.update({
    where: { id },
    data,
    select: managedUserSelect,
  })

  return normalizeManagedUserRow(row)
}

export async function deleteManagedUser(
  id: string,
  client: AdminDbClient = db,
): Promise<{ id: string }> {
  await client.user.delete({ where: { id } })

  return { id }
}
