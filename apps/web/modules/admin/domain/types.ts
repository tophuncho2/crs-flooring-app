import type { ManagedUserRow } from "@/server/auth/user-governance"

export type { ManagedUserRow }

export type ManagedUserForm = {
  isVerified: boolean
}

export const EMPTY_MANAGED_USER_FORM: ManagedUserForm = {
  isVerified: false,
}

export function toManagedUserForm(row: ManagedUserRow): ManagedUserForm {
  return { isVerified: row.isVerified }
}

export function validateManagedUserForm(_input: ManagedUserForm): string {
  return ""
}
