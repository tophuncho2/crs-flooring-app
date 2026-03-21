import type { Role } from "@prisma/client"

export function isBuilder(role: Role): boolean {
  return role === "BUILDER"
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN"
}

export function hasSystemAccess(role: Role): boolean {
  return isBuilder(role) || isAdmin(role)
}

export function canAccessBuilderPanel(_email: string, role: Role): boolean {
  return isAdmin(role)
}

export function canBypassVerification(_email: string, role: Role): boolean {
  return isAdmin(role)
}

export function canRestrictUser(_email: string, role: Role): boolean {
  return isAdmin(role)
}

export function canEditRole(_email: string, role: Role): boolean {
  return isAdmin(role)
}

export function canManageUsers(_email: string, role: Role): boolean {
  return isAdmin(role)
}

export function canManageHotkeys(_email: string, role: Role): boolean {
  return isAdmin(role)
}
