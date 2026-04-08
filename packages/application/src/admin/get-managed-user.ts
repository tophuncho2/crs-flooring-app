import { findManagedUserById } from "@builders/db"
import type { GovernableRole } from "@builders/domain"
import { GovernanceExecutionError } from "./errors.js"
import { toManagedUserWithPermissions } from "./mappers.js"
import type { ManagedUserWithPermissions } from "./types.js"

export async function getManagedUserUseCase(
  id: string,
  actor: { id: string; role: GovernableRole },
): Promise<ManagedUserWithPermissions> {
  const record = await findManagedUserById(id)

  if (!record) {
    throw new GovernanceExecutionError({
      code: "GOVERNANCE_USER_NOT_FOUND",
      message: "User not found",
      status: 404,
    })
  }

  return toManagedUserWithPermissions(record, actor)
}
