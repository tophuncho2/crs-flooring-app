import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeUserListRow, type UserListRow, type UserRank } from "@builders/domain"
import { USER_ROW_SELECT } from "./read-repository.js"

type UsersDbClient = PrismaClient | Prisma.TransactionClient

export async function setUserRank(
  id: string,
  rank: UserRank,
  client: UsersDbClient = db,
): Promise<UserListRow> {
  const user = await client.user.update({
    where: { id },
    data: { rank },
    select: USER_ROW_SELECT,
  })
  return normalizeUserListRow(user)
}

// Revokes every Better Auth session for a user (immediate lockout — also busts
// the cookie cache, since the session lookup then fails).
export async function deleteUserSessions(
  userId: string,
  client: UsersDbClient = db,
): Promise<void> {
  await client.session.deleteMany({ where: { userId } })
}

// Permanently removes the user row. Schema relations (`onDelete: Cascade` on
// Session, Account, AppMutationReceipt) drop the auth plumbing automatically;
// `createdBy`/`updatedBy` audit stamps are plain email text, not FKs, so history
// survives. Throws Prisma `P2025` when the row is already gone.
export async function deleteUserRecordById(
  id: string,
  client: UsersDbClient = db,
): Promise<void> {
  await client.user.delete({ where: { id } })
}
