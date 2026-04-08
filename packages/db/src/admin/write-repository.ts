import { db } from "../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import type { ManagedUserRecord } from "./read-repository.js"

type AdminDbClient = PrismaClient | Prisma.TransactionClient

// --- Input types ---

export type ManagedUserUpdateInput = {
  isVerified?: boolean
  role?: string
}

// --- Select shape ---

const managedUserSelect = {
  id: true,
  email: true,
  role: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} as const

// --- Normalizer ---

function normalizeManagedUserRow(user: {
  id: string
  email: string
  role: string
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}): ManagedUserRecord {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
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
