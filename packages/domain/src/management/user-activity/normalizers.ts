import type { UserLoginActivityListRow } from "./types.js"

type UserLoginActivityInput = {
  id: string
  userEmail: string
  loggedInAt: Date | string
}

export function normalizeUserLoginActivityListRow(
  row: UserLoginActivityInput,
): UserLoginActivityListRow {
  return {
    id: row.id,
    userEmail: row.userEmail,
    loggedInAt: row.loggedInAt instanceof Date ? row.loggedInAt.toISOString() : row.loggedInAt,
  }
}
