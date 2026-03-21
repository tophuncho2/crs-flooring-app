import type { Role } from "@prisma/client"
import { canManageUsers } from "@/server/auth/access-control"
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
  role: "OWNER" | "ADMIN" | "BUILDER"
  isVerified: boolean
  createdAt: string
  canRestrict: boolean
  canEditRole: boolean
  canDelete: boolean
}

type AssertGovernedUserUpdateOptions = {
  actor: SessionUser
  target: Pick<ManagedUserRecord, "role">
}

type AssertGovernedUserDeleteOptions = {
  actor: SessionUser
  target: Pick<ManagedUserRecord, "role">
}

function buildGovernanceError(message: string, status = 400) {
  return { message, status, field: "user" }
}

export function resolveGovernedVerification(
  role: Role,
  input: boolean | undefined,
  fallback: boolean,
) {
  if (role !== "BUILDER") {
    return true
  }

  return typeof input === "boolean" ? input : fallback
}

export function assertGovernedUserUpdate({
  actor,
  target,
}: AssertGovernedUserUpdateOptions) {
  if (!canManageUsers(actor.email, actor.role)) {
    throw buildGovernanceError("Forbidden", 403)
  }

  if (target.role !== "BUILDER") {
    throw buildGovernanceError("Only builder accounts can be governed from this panel", 409)
  }
}

export function assertGovernedUserDelete({
  actor,
  target,
}: AssertGovernedUserDeleteOptions) {
  if (!canManageUsers(actor.email, actor.role)) {
    throw buildGovernanceError("Forbidden", 403)
  }

  if (target.role !== "BUILDER") {
    throw buildGovernanceError("Only builder accounts can be governed from this panel", 409)
  }
}

export function normalizeManagedUserRow(
  user: ManagedUserRecord,
  actor: SessionUser,
): ManagedUserRow {
  const canManage = canManageUsers(actor.email, actor.role)
  const isBuilder = user.role === "BUILDER"

  return {
    id: user.id,
    email: user.email,
    role: user.role as "OWNER" | "ADMIN" | "BUILDER",
    isVerified: isBuilder ? user.isVerified : true,
    createdAt: user.createdAt.toISOString(),
    canRestrict: canManage && isBuilder,
    canEditRole: false,
    canDelete: canManage && isBuilder,
  }
}
