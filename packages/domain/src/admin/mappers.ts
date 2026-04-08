import type {
  GovernableRole,
  GovernanceActor,
  GovernanceTarget,
  GovernancePermissions,
} from "./types"
import {
  canUpdateUserStatus,
  canChangeUserRole,
  canDeleteUser,
} from "./governance-rules"

export function resolveGovernedVerification(
  role: GovernableRole,
  inputValue: boolean | undefined | null,
  fallbackValue: boolean,
): boolean {
  if (role === "OWNER" || role === "ADMIN") {
    return true
  }

  return inputValue ?? fallbackValue
}

export function computeGovernancePermissions(
  actor: GovernanceActor,
  target: GovernanceTarget,
): GovernancePermissions {
  return {
    canUpdateStatus: canUpdateUserStatus(actor, target),
    canChangeRole: canChangeUserRole(actor, target),
    canDelete: canDeleteUser(actor, target),
  }
}
