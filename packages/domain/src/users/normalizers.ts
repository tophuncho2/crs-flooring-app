import { toIsoTimestamp } from "../shared/date-format.js"
import type { UserRank } from "./rank.js"
import type { UserListRow } from "./types.js"

type UserListRowInput = {
  id: string
  email: string
  rank: UserRank
  createdAt: Date | string
  updatedAt: Date | string
}

export function normalizeUserListRow(user: UserListRowInput): UserListRow {
  return {
    id: user.id,
    email: user.email,
    rank: user.rank,
    createdAt: toIsoTimestamp(user.createdAt),
    updatedAt: toIsoTimestamp(user.updatedAt),
  }
}
