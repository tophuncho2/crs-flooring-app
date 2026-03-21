import type { Role } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { isAdmin } from "@/server/auth/access-control"
import type { SessionUser } from "@/server/auth/session"

type ManagedUserRecord = {
  id: string
  email: string
  role: Role
  isVerified: boolean
  createdAt: Date
}

export type ManagedUserRow = {
  id: string
  email: string
  role: "ADMIN" | "BUILDER"
  isVerified: boolean
  createdAt: string
  canRestrict: boolean
  canEditRole: boolean
  canDelete: boolean
}

type AssertGovernedUserUpdateOptions = {
  actor: SessionUser
  target: Pick<ManagedUserRecord, "id" | "role">
  nextRole: "ADMIN" | "BUILDER"
  adminCount: number
}

type AssertGovernedUserDeleteOptions = {
  actor: SessionUser
  target: Pick<ManagedUserRecord, "id" | "role">
  adminCount: number
}

function buildGovernanceError(message: string, status = 400) {
  return { message, status, field: "user" }
}

export async function countAdminUsers() {
  return prisma.user.count({
    where: {
      role: "ADMIN",
    },
  })
}

export function resolveGovernedVerification(
  role: "ADMIN" | "BUILDER",
  input: boolean | undefined,
  fallback: boolean,
) {
  if (role === "ADMIN") {
    return true
  }

  return typeof input === "boolean" ? input : fallback
}

export function assertGovernedUserUpdate({
  actor,
  target,
  nextRole,
  adminCount,
}: AssertGovernedUserUpdateOptions) {
  if (!isAdmin(actor.role)) {
    throw buildGovernanceError("Forbidden", 403)
  }

  if (actor.id === target.id && nextRole !== "ADMIN") {
    throw buildGovernanceError("You cannot remove your own admin access")
  }

  if (target.role === "ADMIN" && nextRole !== "ADMIN" && adminCount <= 1) {
    throw buildGovernanceError("At least one admin must remain", 409)
  }
}

export function assertGovernedUserDelete({
  actor,
  target,
  adminCount,
}: AssertGovernedUserDeleteOptions) {
  if (!isAdmin(actor.role)) {
    throw buildGovernanceError("Forbidden", 403)
  }

  if (actor.id === target.id) {
    throw buildGovernanceError("You cannot delete your own account")
  }

  if (target.role === "ADMIN" && adminCount <= 1) {
    throw buildGovernanceError("At least one admin must remain", 409)
  }
}

export function normalizeManagedUserRow(
  user: ManagedUserRecord,
  actor: SessionUser,
  adminCount: number,
): ManagedUserRow {
  const canManage = isAdmin(actor.role)
  const isSelf = actor.id === user.id
  const isLastAdmin = user.role === "ADMIN" && adminCount <= 1

  return {
    id: user.id,
    email: user.email,
    role: user.role as "ADMIN" | "BUILDER",
    isVerified: user.role === "ADMIN" ? true : user.isVerified,
    createdAt: user.createdAt.toISOString(),
    canRestrict: canManage && user.role !== "ADMIN",
    canEditRole: canManage && !isSelf && !isLastAdmin,
    canDelete: canManage && !isSelf && !isLastAdmin,
  }
}
