import { deleteInviteById, withDatabaseTransaction } from "@builders/db"
import { canManageUsers, INVITE_NOT_AUTHORIZED_MESSAGE } from "@builders/domain"
import { InviteExecutionError } from "./errors.js"
import type { InviteActor } from "./types.js"

// Manager-gated invite revocation. Deleting the row closes the signup gate for
// that email immediately (the gate re-checks for an open invite on every signup).
export async function revokeInviteUseCase(id: string, actor: InviteActor): Promise<void> {
  if (!canManageUsers(actor.rank)) {
    throw new InviteExecutionError({
      code: "INVITE_NOT_AUTHORIZED",
      message: INVITE_NOT_AUTHORIZED_MESSAGE,
      status: 403,
    })
  }

  await withDatabaseTransaction((tx) => deleteInviteById(id, tx))
}
