import { randomBytes } from "node:crypto"
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
// users and may only invite at or below their own rank. Returns the token so the
// caller can build the shareable link (no email is sent — copy-paste delivery).
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
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS)

  return withDatabaseTransaction(async (tx) => {
    const invite = await createInviteRecord(
      { email, rank: input.rank, token, invitedBy: actor.email, expiresAt },
      tx,
    )
    return {
      id: invite.id,
      email: invite.email,
      rank: invite.rank,
      token: invite.token,
      expiresAt: invite.expiresAt,
    }
  })
}
