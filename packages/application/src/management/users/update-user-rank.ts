import {
  canInviteRank,
  canManageUsers,
  USER_FORBIDDEN_RANK_MESSAGE,
  USER_NOT_AUTHORIZED_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
  type UserListRow,
  type UserRank,
} from "@builders/domain"
import {
  deleteUserSessions,
  getUserRecordById,
  setUserRank,
  withDatabaseTransaction,
} from "@builders/db"
import { UserExecutionError } from "./errors.js"
import type { UserActor } from "./types.js"

// Manager-gated, rank-scoped rank change. The actor must manage users, may only
// set a rank at or below their own, and may not edit a user currently ranked
// above their own. Optimistic-concurrency checked against `expectedUpdatedAt`.
// On success the target's sessions are revoked so the new rank takes effect now.
export async function updateUserRankUseCase(
  input: { id: string; rank: UserRank; expectedUpdatedAt: string },
  actor: UserActor,
): Promise<UserListRow> {
  if (!canManageUsers(actor.rank)) {
    throw new UserExecutionError({
      code: "USER_NOT_AUTHORIZED",
      message: USER_NOT_AUTHORIZED_MESSAGE,
      status: 403,
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

  // Actor may only grant ranks at/below their own, and may not touch a user who
  // currently outranks them.
  if (!canInviteRank(actor.rank, input.rank) || !canInviteRank(actor.rank, current.rank)) {
    throw new UserExecutionError({
      code: "USER_FORBIDDEN_RANK",
      message: USER_FORBIDDEN_RANK_MESSAGE,
      status: 403,
      field: "rank",
    })
  }

  if (current.updatedAt !== input.expectedUpdatedAt) {
    throw new UserExecutionError({
      code: "USER_CONFLICT",
      message: "User changed before save completed. Refresh and try again.",
      status: 409,
      field: "updatedAt",
      payload: { snapshot: { user: current } },
    })
  }

  return withDatabaseTransaction(async (tx) => {
    const updated = await setUserRank(input.id, input.rank, tx)
    await deleteUserSessions(input.id, tx)
    return updated
  })
}
