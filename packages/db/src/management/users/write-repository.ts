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

export async function setUserActive(
  id: string,
  isActive: boolean,
  client: UsersDbClient = db,
): Promise<UserListRow> {
  const user = await client.user.update({
    where: { id },
    data: { isActive },
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
