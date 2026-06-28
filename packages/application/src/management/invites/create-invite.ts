import { createInviteRecord, withDatabaseTransaction } from "@builders/db"
import {
  canInviteRank,
  canManageUsers,
  INVITE_EXPIRY_MS,
  INVITE_FORBIDDEN_RANK_MESSAGE,
  INVITE_NOT_AUTHORIZED_MESSAGE,
} from "@builders/domain"
import { InviteExecutionError } from "./errors.js"
import type { CreateInviteResult, CreateInviteUseCaseInput, InviteActor } from "./types.js"

// Manager-gated, rank-scoped invite creation. The actor must be allowed to manage
// users and may only invite a rank strictly below their own. No secret link or
// email — the invitee just signs in with Google and the email-match gate provisions them.
export async function createInviteUseCase(
  input: CreateInviteUseCaseInput,
  actor: InviteActor,
): Promise<CreateInviteResult> {
  if (!canManageUsers(actor.rank)) {
    throw new InviteExecutionError({
      code: "INVITE_NOT_AUTHORIZED",
      message: INVITE_NOT_AUTHORIZED_MESSAGE,
      status: 403,
    })
  }

  if (!canInviteRank(actor.rank, input.rank)) {
    throw new InviteExecutionError({
      code: "INVITE_FORBIDDEN_RANK",
      message: INVITE_FORBIDDEN_RANK_MESSAGE,
      status: 403,
      field: "rank",
    })
  }

  const email = input.email.trim().toLowerCase()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS)

  return withDatabaseTransaction(async (tx) => {
    const invite = await createInviteRecord(
      { email, rank: input.rank, invitedBy: actor.email, expiresAt },
      tx,
    )
    return {
      id: invite.id,
      email: invite.email,
      rank: invite.rank,
      expiresAt: invite.expiresAt,
    }
  })
}
