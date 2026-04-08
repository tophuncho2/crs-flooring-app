import type { ManagedUserWithPermissions } from "@builders/application"

export type { ManagedUserWithPermissions }

export type ManagedUserForm = {
  isVerified: boolean
}

export const EMPTY_MANAGED_USER_FORM: ManagedUserForm = {
  isVerified: false,
}

export function toManagedUserForm(row: ManagedUserWithPermissions): ManagedUserForm {
  return { isVerified: row.isVerified }
}
