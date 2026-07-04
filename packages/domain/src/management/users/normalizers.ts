import type { UserRank } from "./rank.js"
import type { UserListRow } from "./types.js"

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value)

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
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
  }
}
