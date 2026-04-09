import { db } from "../client.js"
import type { Prisma, PrismaClient, Role } from "@prisma/client"
import type { ManagedUserRecord } from "./shared.js"
import { managedUserSelect, normalizeManagedUserRow } from "./shared.js"

type AdminDbClient = PrismaClient | Prisma.TransactionClient

// --- Input types ---

export type ManagedUserUpdateInput = {
  role?: string
}

export type ManagedUserCreateInput = {
  email: string
  role: string
}

// --- Write functions ---

export async function createManagedUser(
  data: ManagedUserCreateInput,
  client: AdminDbClient = db,
): Promise<ManagedUserRecord> {
  const row = await client.user.create({
    data: {
      email: data.email,
      password: null,
      role: data.role as Role,
      isVerified: false,
    },
    select: managedUserSelect,
  })

  return normalizeManagedUserRow(row)
}

export async function updateManagedUser(
  id: string,
  data: ManagedUserUpdateInput,
  client: AdminDbClient = db,
): Promise<ManagedUserRecord> {
  const row = await client.user.update({
    where: { id },
    data: {
      ...( data.role !== undefined ? { role: data.role as Role } : {}),
    },
    select: managedUserSelect,
  })

  return normalizeManagedUserRow(row)
}

export async function setUserPassword(
  id: string,
  hashedPassword: string,
  client: AdminDbClient = db,
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

export async function deleteManagedUser(
  id: string,
  client: AdminDbClient = db,
): Promise<{ id: string }> {
  await client.user.delete({ where: { id } })

  return { id }
}
