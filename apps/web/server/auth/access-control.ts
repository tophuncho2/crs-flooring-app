import type { Role } from "@builders/db"

export const CAPABILITIES = [
  "system.access",
  "governance.access",
  "adminPanel.access",
  "users.manage",
  "categories.edit",
  "unitOfMeasures.edit",
  "tool.admin",
  "workOrders.read",
  "workOrders.write",
  "workOrders.delete",
  "workOrders.allocate",
  "workOrders.syncTemplate",
] as const

export type Capability = (typeof CAPABILITIES)[number]

const ROLE_CAPABILITIES: Record<Role, ReadonlySet<Capability>> = {
  OWNER: new Set<Capability>([
    "system.access",
    "governance.access",
    "adminPanel.access",
    "users.manage",
    "categories.edit",
    "unitOfMeasures.edit",
    "tool.admin",
    "workOrders.read",
    "workOrders.write",
    "workOrders.delete",
    "workOrders.allocate",
    "workOrders.syncTemplate",
  ]),
  ADMIN: new Set<Capability>([
    "system.access",
    "governance.access",
    "adminPanel.access",
    "users.manage",
    "categories.edit",
    "unitOfMeasures.edit",
    "workOrders.read",
    "workOrders.write",
    "workOrders.delete",
    "workOrders.allocate",
    "workOrders.syncTemplate",
  ]),
  BUILDER: new Set<Capability>([
    "system.access",
    "workOrders.read",
    "workOrders.write",
    "workOrders.delete",
    "workOrders.allocate",
    "workOrders.syncTemplate",
  ]),
  CONTRACTOR: new Set<Capability>([]),
  CUSTOMER: new Set<Capability>([]),
}

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
  return hasCapability(role, "governance.access")
}

export function hasSystemAccess(role: Role): boolean {
  return hasCapability(role, "system.access")
}

export function hasCapability(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].has(capability)
}

export function canAccessAdminPanel(_email: string, role: Role): boolean {
  return hasCapability(role, "adminPanel.access")
}

export function canBypassVerification(_email: string, role: Role): boolean {
  return hasGovernanceAccess(role)
}

export function canManageUsers(_email: string, role: Role): boolean {
  return hasCapability(role, "users.manage")
}

export function canEditCategories(role: Role): boolean {
  return hasCapability(role, "categories.edit")
}

export function canEditUnitOfMeasures(role: Role): boolean {
  return hasCapability(role, "unitOfMeasures.edit")
}
