import type { ManagedUserRecord } from "@builders/db"
import type { GovernancePermissions } from "@builders/domain"

export type UpdateManagedUserInput = {
  isVerified?: boolean
  role?: string
}

export type ManagedUserWithPermissions = ManagedUserRecord & GovernancePermissions

export type ListManagedUsersResult = {
  users: ManagedUserWithPermissions[]
}
