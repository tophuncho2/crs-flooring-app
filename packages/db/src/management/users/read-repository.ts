import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeUserListRow, type UserListRow } from "@builders/domain"

type UsersDbClient = PrismaClient | Prisma.TransactionClient

export const USER_ROW_SELECT = {
  id: true,
  email: true,
  rank: true,
  createdAt: true,
  updatedAt: true,
} as const

// Single user row (with `updatedAt` for optimistic concurrency). Used by the
// rank-change / delete mutations.
export async function getUserRecordById(
  id: string,
  client: UsersDbClient = db,
): Promise<UserListRow | null> {
  const user = await client.user.findUnique({
    where: { id },
    select: USER_ROW_SELECT,
  })
  return user ? normalizeUserListRow(user) : null
}

export type UserListViewOptions = {
  skip: number
  take: number
}

export type UserListViewResult = {
  rows: UserListRow[]
  total: number
}

// Read-only users list — no search/filter (the surface is a bare data table).
// Counted pagination: count + page fetch in parallel, mirroring the job-types
// list read.
export async function listUsersForListView(
  options: UserListViewOptions,
  client: UsersDbClient = db,
): Promise<UserListViewResult> {
  const [total, rows] = await Promise.all([
    client.user.count(),
    client.user.findMany({
      orderBy: [{ email: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      select: USER_ROW_SELECT,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeUserListRow),
  }
}
