import { createManagedUser, withDatabaseTransaction } from "@builders/db"
import type { GovernableRole } from "@builders/domain"
import {
  canCreateUser,
  isValidCreationRole,
  getCreateBlockedMessage,
  getInvalidCreationRoleMessage,
} from "@builders/domain"
import { GovernanceExecutionError } from "./errors.js"
import { toManagedUserWithPermissions } from "./mappers.js"
import type { ManagedUserWithPermissions } from "./types.js"

export async function createManagedUserUseCase(
  input: { email: string; role: string },
  actor: { id: string; role: GovernableRole },
): Promise<ManagedUserWithPermissions> {
  if (!canCreateUser(actor.role)) {
    throw new GovernanceExecutionError({
      code: "GOVERNANCE_CREATE_BLOCKED",
      message: getCreateBlockedMessage(),
      status: 403,
    })
  }

  if (!isValidCreationRole(input.role)) {
    throw new GovernanceExecutionError({
      code: "GOVERNANCE_INVALID_CREATION_ROLE",
      message: getInvalidCreationRoleMessage(input.role),
      status: 422,
      field: "role",
    })
  }

  const email = input.email.trim().toLowerCase()

  return withDatabaseTransaction(async (tx) => {
    const record = await createManagedUser({ email, role: input.role }, tx)
    return toManagedUserWithPermissions(record, { id: actor.id, role: actor.role })
  })
}
