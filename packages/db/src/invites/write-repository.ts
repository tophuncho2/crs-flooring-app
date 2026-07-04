import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { normalizeUserInvite, type UserInvite, type UserRank } from "@builders/domain"

type InvitesDbClient = PrismaClient | Prisma.TransactionClient

export type CreateInviteRecordInput = {
  email: string
  rank: UserRank
  invitedBy: string | null
  expiresAt: Date
}

export async function createInviteRecord(
  input: CreateInviteRecordInput,
  client: InvitesDbClient = db,
): Promise<UserInvite> {
  const invite = await client.userInvite.create({
    data: {
      email: input.email,
      rank: input.rank,
      invitedBy: input.invitedBy,
      expiresAt: input.expiresAt,
    },
  })
  return normalizeUserInvite(invite)
}

// Marks every still-open invite for this email accepted. Called from the Better
// Auth `user.create.after` hook once a Google sign-in has provisioned the user.
export async function markInviteAcceptedByEmail(
  email: string,
  acceptedAt: Date,
  client: InvitesDbClient = db,
): Promise<void> {
  await client.userInvite.updateMany({
    where: { email, acceptedAt: null },
    data: { acceptedAt },
  })
}

export async function deleteInviteById(
  id: string,
  client: InvitesDbClient = db,
): Promise<void> {
  await client.userInvite.delete({ where: { id } })
}
