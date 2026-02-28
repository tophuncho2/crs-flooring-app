import type { Role } from "@prisma/client"

export const MASTER_EMAIL = "admin@test.com"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isMasterEmail(email: string): boolean {
  return normalizeEmail(email) === MASTER_EMAIL
}

export function canBypassVerification(email: string, role: Role): boolean {
  return role === "BUILDER" || isMasterEmail(email)
}

export function canRestrictUser(email: string, role: Role): boolean {
  return !canBypassVerification(email, role)
}

export function canEditRole(email: string, role: Role): boolean {
  return !isMasterEmail(email) && role !== "BUILDER"
}
