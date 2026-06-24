import type { UserRank } from "./rank.js"
import type { UserListRow } from "./types.js"

type UserListRowInput = {
  id: string
  email: string
  rank: UserRank
  isVerified: boolean
  createdAt: Date | string
}

export function normalizeUserListRow(user: UserListRowInput): UserListRow {
  return {
    id: user.id,
    email: user.email,
    rank: user.rank,
    isVerified: user.isVerified,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  }
}
