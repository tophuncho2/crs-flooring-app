import { findManagedUsers } from "@builders/db"
import type { GovernableRole } from "@builders/domain"
import { toManagedUserWithPermissions } from "./mappers.js"
import type { ListManagedUsersResult } from "./types.js"

export async function listManagedUsersUseCase(
  actor: { id: string; role: GovernableRole },
): Promise<ListManagedUsersResult> {
  const records = await findManagedUsers()

  return {
    users: records.map((record) => toManagedUserWithPermissions(record, actor)),
  }
}
