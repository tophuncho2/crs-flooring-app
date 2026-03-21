import type { Role } from "@prisma/client"

export function isBuilder(role: Role): boolean {
  return role === "BUILDER"
}

export function isOwner(role: Role): boolean {
  return role === "OWNER"
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN"
}

export function hasGovernanceAccess(role: Role): boolean {
  return isOwner(role) || isAdmin(role)
}

export function hasSystemAccess(role: Role): boolean {
  return isBuilder(role) || hasGovernanceAccess(role)
}

export function canAccessBuilderPanel(_email: string, role: Role): boolean {
  return hasGovernanceAccess(role)
}

export function canBypassVerification(_email: string, role: Role): boolean {
  return hasGovernanceAccess(role)
}

export function canRestrictUser(_email: string, role: Role): boolean {
  return hasGovernanceAccess(role)
}

export function canEditRole(_email: string, role: Role): boolean {
  return false
}

export function canManageUsers(_email: string, role: Role): boolean {
  return hasGovernanceAccess(role)
}

export function canManageHotkeys(_email: string, role: Role): boolean {
  return hasGovernanceAccess(role)
}

export function canEditCategories(role: Role): boolean {
  return hasGovernanceAccess(role)
}

export function canEditUnitOfMeasures(role: Role): boolean {
  return hasGovernanceAccess(role)
}
