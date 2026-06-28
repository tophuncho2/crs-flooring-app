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

// Read-only login-activity list, sourced from Better Auth `Session` rows (the
// legacy append-only UserLoginActivity table was retired). Each session row is a
// sign-in; `createdAt` is the login time and the joined user supplies the email.
// Most-recent-first, counted pagination mirrors the job-types read.
//
// NOTE: sessions are current/active (deleted on logout/expiry/revocation), so this
// reflects live sessions rather than an all-time historical login log.
export async function listUserLoginActivityForListView(
  options: UserLoginActivityListViewOptions,
  client: UserActivityDbClient = db,
): Promise<UserLoginActivityListViewResult> {
  const [total, rows] = await Promise.all([
    client.session.count(),
    client.session.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      select: {
        id: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
  ])

  return {
    total,
    rows: rows.map((row) =>
      normalizeUserLoginActivityListRow({
        id: row.id,
        userEmail: row.user.email,
        loggedInAt: row.createdAt,
      }),
    ),
  }
}
