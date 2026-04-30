import type { Role } from "@builders/db"

export const CAPABILITIES = [
  "system.access",
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
    "tool.admin",
    "workOrders.read",
    "workOrders.write",
    "workOrders.delete",
    "workOrders.allocate",
    "workOrders.syncTemplate",
  ]),
  ADMIN: new Set<Capability>([
    "system.access",
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

export function hasSystemAccess(role: Role): boolean {
  return hasCapability(role, "system.access")
}

export function hasCapability(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].has(capability)
}
