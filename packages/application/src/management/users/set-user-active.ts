import {
  canInviteRank,
  canManageUsers,
  USER_FORBIDDEN_RANK_MESSAGE,
  USER_NOT_AUTHORIZED_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
  USER_SELF_DEACTIVATE_MESSAGE,
  type UserListRow,
} from "@builders/domain"
import {
  deleteUserSessions,
  getUserRecordById,
  setUserActive,
  withDatabaseTransaction,
} from "@builders/db"
import { UserExecutionError } from "./errors.js"
import type { UserActor } from "./types.js"

// Manager-gated activation toggle. The actor must manage users and may not edit a
// user ranked above their own, nor deactivate themselves. Deactivating revokes
// the target's sessions for an immediate lockout.
export async function setUserActiveUseCase(
  input: { id: string; isActive: boolean },
  actor: UserActor,
): Promise<UserListRow> {
  if (!canManageUsers(actor.rank)) {
    throw new UserExecutionError({
      code: "USER_NOT_AUTHORIZED",
      message: USER_NOT_AUTHORIZED_MESSAGE,
      status: 403,
    })
  }

  if (!input.isActive && actor.id === input.id) {
    throw new UserExecutionError({
      code: "USER_SELF_DEACTIVATE",
      message: USER_SELF_DEACTIVATE_MESSAGE,
      status: 400,
    })
  }

  const current = await getUserRecordById(input.id)
  if (!current) {
    throw new UserExecutionError({
      code: "USER_NOT_FOUND",
      message: USER_NOT_FOUND_MESSAGE,
      status: 404,
    })
  }

  if (!canInviteRank(actor.rank, current.rank)) {
    throw new UserExecutionError({
      code: "USER_FORBIDDEN_RANK",
      message: USER_FORBIDDEN_RANK_MESSAGE,
      status: 403,
    })
  }

  return withDatabaseTransaction(async (tx) => {
    const updated = await setUserActive(input.id, input.isActive, tx)
    if (!input.isActive) {
      await deleteUserSessions(input.id, tx)
    }
    return updated
  })
}
