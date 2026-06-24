import type { UserRank } from "./rank.js"

export type UserListRow = {
  id: string
  email: string
  rank: UserRank
  isVerified: boolean
  createdAt: string
}
