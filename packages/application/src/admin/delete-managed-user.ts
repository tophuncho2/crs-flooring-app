import { findManagedUserById, deleteManagedUser, withDatabaseTransaction } from "@builders/db"
import type { GovernableRole, GovernanceActor, GovernanceTarget } from "@builders/domain"
import { canDeleteUser, getDeleteBlockedMessage } from "@builders/domain"
import { GovernanceExecutionError } from "./errors.js"

export async function deleteManagedUserUseCase(
  id: string,
  actor: { id: string; role: GovernableRole },
): Promise<{ ok: true }> {
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

    if (!canDeleteUser(governanceActor, governanceTarget)) {
      throw new GovernanceExecutionError({
        code: "GOVERNANCE_DELETE_BLOCKED",
        message: getDeleteBlockedMessage(governanceActor, governanceTarget),
        status: 403,
      })
    }

    await deleteManagedUser(id, tx)

    return { ok: true }
  })
}
