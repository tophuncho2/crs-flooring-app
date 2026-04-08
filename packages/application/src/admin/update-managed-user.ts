import { findManagedUserById, updateManagedUser, withDatabaseTransaction } from "@builders/db"
import type { GovernableRole, GovernanceActor, GovernanceTarget } from "@builders/domain"
import {
  canChangeUserRole,
  canUpdateUserStatus,
  getRoleChangeBlockedMessage,
  getUpdateBlockedMessage,
  getInvalidRoleTransitionMessage,
  isValidRoleTransition,
  resolveGovernedVerification,
} from "@builders/domain"
import { GovernanceExecutionError } from "./errors.js"
import { toManagedUserWithPermissions } from "./mappers.js"
import type { UpdateManagedUserInput, ManagedUserWithPermissions } from "./types.js"

export async function updateManagedUserUseCase(
  id: string,
  input: UpdateManagedUserInput,
  actor: { id: string; role: GovernableRole },
): Promise<ManagedUserWithPermissions> {
  return withDatabaseTransaction(async (tx) => {
    const record = await findManagedUserById(id, tx)

    if (!record) {
      throw new GovernanceExecutionError({
        code: "GOVERNANCE_USER_NOT_FOUND",
        message: "User not found",
        status: 404,
      })
    }

    const governanceActor: GovernanceActor = { id: actor.id, role: actor.role }
    const governanceTarget: GovernanceTarget = { id: record.id, role: record.role as GovernableRole }

    const normalizedData: { isVerified?: boolean; role?: string } = {}

    // --- Role change gate ---
    if (input.role !== undefined) {
      if (!canChangeUserRole(governanceActor, governanceTarget)) {
        throw new GovernanceExecutionError({
          code: "GOVERNANCE_ROLE_CHANGE_BLOCKED",
          message: getRoleChangeBlockedMessage(governanceActor, governanceTarget),
          status: 403,
        })
      }

      if (!isValidRoleTransition(record.role as GovernableRole, input.role as GovernableRole)) {
        throw new GovernanceExecutionError({
          code: "GOVERNANCE_INVALID_ROLE_TRANSITION",
          message: getInvalidRoleTransitionMessage(record.role as GovernableRole, input.role as GovernableRole),
          status: 422,
        })
      }

      normalizedData.role = input.role
    }

    // --- Status update gate ---
    if (input.isVerified !== undefined) {
      if (!canUpdateUserStatus(governanceActor, governanceTarget)) {
        throw new GovernanceExecutionError({
          code: "GOVERNANCE_UPDATE_BLOCKED",
          message: getUpdateBlockedMessage(governanceActor, governanceTarget),
          status: 403,
        })
      }

      normalizedData.isVerified = resolveGovernedVerification(
        record.role as GovernableRole,
        input.isVerified,
        record.isVerified,
      )
    }

    const updated = await updateManagedUser(id, normalizedData, tx)

    return toManagedUserWithPermissions(updated, governanceActor)
  })
}
