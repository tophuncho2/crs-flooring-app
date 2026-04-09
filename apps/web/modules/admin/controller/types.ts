import type { ManagedUserWithPermissions } from "@builders/application"

export type { ManagedUserWithPermissions }

export type ManagedUserForm = {
  isVerified: boolean
  role: string
}

export const EMPTY_MANAGED_USER_FORM: ManagedUserForm = {
  isVerified: false,
  role: "BUILDER",
}

export function toManagedUserForm(row: ManagedUserWithPermissions): ManagedUserForm {
  return { isVerified: row.isVerified, role: row.role }
}
