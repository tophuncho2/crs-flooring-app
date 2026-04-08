import { db } from "../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"

type AdminDbClient = PrismaClient | Prisma.TransactionClient

// --- Types ---

export type ManagedUserRecord = {
  id: string
  email: string
  role: string
  isVerified: boolean
  createdAt: string
  updatedAt: string
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
