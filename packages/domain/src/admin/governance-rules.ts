import type {
  GovernableRole,
  GovernanceActor,
  GovernanceTarget,
} from "./types.js"

// ---------------------------------------------------------------------------
// Role hierarchy (private)
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<GovernableRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  BUILDER: 1,
}

function isStrictlyAbove(
  actorRole: GovernableRole,
  targetRole: GovernableRole,
): boolean {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole]
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

export function isSelfAction(
  actor: GovernanceActor,
  target: GovernanceTarget,
): boolean {
  return actor.id === target.id
}

export function canActorModifyTarget(
  actor: GovernanceActor,
  target: GovernanceTarget,
): boolean {
  return !isSelfAction(actor, target) && isStrictlyAbove(actor.role, target.role)
}

export function canUpdateUserStatus(
  actor: GovernanceActor,
  target: GovernanceTarget,
): boolean {
  return canActorModifyTarget(actor, target)
}

export function canDeleteUser(
  actor: GovernanceActor,
  target: GovernanceTarget,
): boolean {
  return canActorModifyTarget(actor, target)
}

export function canChangeUserRole(
  actor: GovernanceActor,
  target: GovernanceTarget,
): boolean {
  return canActorModifyTarget(actor, target)
}

export function isValidRoleTransition(
  fromRole: GovernableRole,
  toRole: GovernableRole,
): boolean {
  if (fromRole === toRole) return false
  if (fromRole === "OWNER" || toRole === "OWNER") return false

  return (
    (fromRole === "BUILDER" && toRole === "ADMIN") ||
    (fromRole === "ADMIN" && toRole === "BUILDER")
  )
}

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

export function getUpdateBlockedMessage(
  actor: GovernanceActor,
  target: GovernanceTarget,
): string {
  if (isSelfAction(actor, target)) {
    return "You cannot update your own status"
  }

  if (!isStrictlyAbove(actor.role, target.role)) {
    return "You can only update the status of users with a lower role than yours"
  }

  return ""
}

export function getDeleteBlockedMessage(
  actor: GovernanceActor,
  target: GovernanceTarget,
): string {
  if (isSelfAction(actor, target)) {
    return "You cannot delete your own account"
  }

  if (!isStrictlyAbove(actor.role, target.role)) {
    return "You can only delete users with a lower role than yours"
  }

  return ""
}

export function getRoleChangeBlockedMessage(
  actor: GovernanceActor,
  target: GovernanceTarget,
): string {
  if (isSelfAction(actor, target)) {
    return "You cannot change your own role"
  }

  if (!isStrictlyAbove(actor.role, target.role)) {
    return "You can only change the role of users with a lower role than yours"
  }

  return ""
}

export function getInvalidRoleTransitionMessage(
  fromRole: GovernableRole,
  toRole: GovernableRole,
): string {
  if (fromRole === toRole) {
    return `User is already a ${fromRole}`
  }

  if (fromRole === "OWNER" || toRole === "OWNER") {
    return "The OWNER role cannot be changed via the admin panel"
  }

  return ""
}
