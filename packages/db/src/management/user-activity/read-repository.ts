import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeUserLoginActivityListRow,
  type UserLoginActivityListRow,
} from "@builders/domain"

type UserActivityDbClient = PrismaClient | Prisma.TransactionClient

export type UserLoginActivityListViewOptions = {
  skip: number
  take: number
}

export type UserLoginActivityListViewResult = {
  rows: UserLoginActivityListRow[]
  total: number
}

// Read-only login-activity list — append-only source, most-recent-first. No
// search/filter (bare data table). Counted pagination mirrors the job-types read.
export async function listUserLoginActivityForListView(
  options: UserLoginActivityListViewOptions,
  client: UserActivityDbClient = db,
): Promise<UserLoginActivityListViewResult> {
  const [total, rows] = await Promise.all([
    client.userLoginActivity.count(),
    client.userLoginActivity.findMany({
      orderBy: [{ loggedInAt: "desc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      select: {
        id: true,
        userEmail: true,
        loggedInAt: true,
      },
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeUserLoginActivityListRow),
  }
}
