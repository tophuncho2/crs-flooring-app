import type { DataAccessContext } from "@/server/db/context"
import { prisma } from "@/server/db/prisma"
import { canManageUsers } from "@/server/auth/access-control"
import { type SessionUser } from "@/server/auth/session"
import {
  assertGovernedUserDelete,
  assertGovernedUserUpdate,
  normalizeManagedUserRow,
  resolveGovernedVerification,
} from "@/server/auth/user-governance"
import { createAppError } from "@/server/http/api-helpers"

export async function listManagedUsers(actor: SessionUser, db: DataAccessContext = prisma) {
  const users = await db.user.findMany({
    where: {
      role: {
        in: ["OWNER", "ADMIN", "BUILDER"],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  })

  return {
    viewerCanManageUsers: canManageUsers(actor.email, actor.role),
    users: users.map((user) => normalizeManagedUserRow(user, actor)),
  }
}

export function normalizeManagedUserUpdateInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw createAppError("Invalid request body")
  }

  const record = body as Record<string, unknown>

  if ("role" in record) {
    throw createAppError("Builder roles cannot be edited from this panel")
  }

  if ("isVerified" in record && typeof record.isVerified !== "boolean") {
    throw createAppError("isVerified must be true or false", { field: "isVerified" })
  }

  return {
    isVerified: typeof record.isVerified === "boolean" ? record.isVerified : undefined,
  }
}

export async function updateManagedUser(
  actor: SessionUser,
  id: string,
  input: { isVerified?: boolean },
  db: DataAccessContext = prisma,
) {
  const existingUser = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  })

  if (!existingUser) {
    throw createAppError("User not found", { status: 404 })
  }

  if (existingUser.role !== "BUILDER") {
    throw createAppError("Only builder accounts can be governed from this panel", { status: 409 })
  }

  assertGovernedUserUpdate({
    actor,
    target: existingUser,
  })

  const updated = await db.user.update({
    where: { id },
    data: {
      isVerified: resolveGovernedVerification(existingUser.role, input.isVerified, existingUser.isVerified),
    },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  })

  return normalizeManagedUserRow(updated, actor)
}

export async function deleteManagedUser(actor: SessionUser, id: string, db: DataAccessContext = prisma) {
  const existingUser = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
    },
  })

  if (!existingUser) {
    throw createAppError("User not found", { status: 404 })
  }

  if (existingUser.role !== "BUILDER") {
    throw createAppError("Only builder accounts can be governed from this panel", { status: 409 })
  }

  assertGovernedUserDelete({
    actor,
    target: existingUser,
  })

  await db.user.delete({ where: { id } })

  return {
    id: existingUser.id,
    email: existingUser.email,
    role: existingUser.role,
  }
}

export async function listManagedUserActivity(db: DataAccessContext = prisma) {
  const activity = await db.userLoginActivity.findMany({
    orderBy: { loggedInAt: "desc" },
    take: 200,
    select: {
      id: true,
      userEmail: true,
      loggedInAt: true,
    },
  })

  return activity.map((row) => ({
    ...row,
    loggedInAt: row.loggedInAt.toISOString(),
  }))
}
