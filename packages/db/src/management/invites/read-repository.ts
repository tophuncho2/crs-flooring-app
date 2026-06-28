import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeUserInvite, type UserInvite } from "@builders/domain"

type InvitesDbClient = PrismaClient | Prisma.TransactionClient

// The most recent still-open invite for an email (not accepted, not expired).
// This is the signup gate's lookup — a brand-new Google user must match one.
export async function findOpenInviteByEmail(
  email: string,
  now: Date,
  client: InvitesDbClient = db,
): Promise<UserInvite | null> {
  const invite = await client.userInvite.findFirst({
    where: { email, acceptedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  })
  return invite ? normalizeUserInvite(invite) : null
}

export async function findInviteByToken(
  token: string,
  client: InvitesDbClient = db,
): Promise<UserInvite | null> {
  const invite = await client.userInvite.findUnique({ where: { token } })
  return invite ? normalizeUserInvite(invite) : null
}
