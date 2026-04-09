import type {
  GovernanceActor,
  GovernanceTarget,
  GovernancePermissions,
} from "./types.js"
import {
  canUpdateUserStatus,
  canChangeUserRole,
  canDeleteUser,
} from "./governance-rules.js"

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
