import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeUserListRow, type UserListRow } from "@builders/domain"

type UsersDbClient = PrismaClient | Prisma.TransactionClient

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
      select: {
        id: true,
        email: true,
        rank: true,
        isVerified: true,
        createdAt: true,
      },
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeUserListRow),
  }
}
