import { canInviteRank, canManageUsers, USER_FORBIDDEN_RANK_MESSAGE, USER_NOT_AUTHORIZED_MESSAGE, USER_NOT_FOUND_MESSAGE, USER_SELF_DELETE_MESSAGE, } from "@builders/domain"
import {
  Prisma, deleteUserRecordById, getUserRecordById, withDatabaseTransaction } from "@builders/db"
import { isP2025 } from "../shared/prisma-errors.js"
import { UserExecutionError } from "./errors.js"
import type { UserActor } from "./types.js"

// Manager-gated, rank-scoped permanent delete. The actor must manage users, may
// not delete themselves, and may only delete a user ranked below their own (so a
// DEVELOPER is unreachable through the UI — only the break-glass script can touch
// one). Optimistic-concurrency checked against `expectedUpdatedAt`. Deleting the
// row cascades the user's sessions/accounts/receipts (schema `onDelete: Cascade`);
// `createdBy`/`updatedBy` audit stamps are plain email text and survive.
export async function deleteUserUseCase(
  input: { id: string; expectedUpdatedAt: string },
  actor: UserActor,
): Promise<{ ok: true }> {
  if (!canManageUsers(actor.rank)) {
    throw new UserExecutionError({
      code: "USER_NOT_AUTHORIZED",
      message: USER_NOT_AUTHORIZED_MESSAGE,
      status: 403,
    })
  }

  if (actor.id === input.id) {
    throw new UserExecutionError({
      code: "USER_SELF_DELETE",
      message: USER_SELF_DELETE_MESSAGE,
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

  if (current.updatedAt !== input.expectedUpdatedAt) {
    throw new UserExecutionError({
      code: "USER_CONFLICT",
      message: "User changed before delete completed. Refresh and try again.",
      status: 409,
      field: "updatedAt",
      payload: { snapshot: { user: current } },
    })
  }

  return withDatabaseTransaction(async (tx) => {
    try {
      await deleteUserRecordById(input.id, tx)
    } catch (error) {
      if (isP2025(error)) {
        throw new UserExecutionError({
          code: "USER_NOT_FOUND",
          message: USER_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
