import type { Role } from "@prisma/client"

export const MASTER_EMAIL_LIST = [
  "admin@test.com",
  "j.ottohull@gmail.com",
] as const

const MASTER_EMAILS: ReadonlySet<string> = new Set<string>(MASTER_EMAIL_LIST)

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isMasterEmail(email: string): boolean {
  return MASTER_EMAILS.has(normalizeEmail(email))
}

export function canAccessBuilderPanel(email: string, role: Role): boolean {
  return role === "BUILDER" || isMasterEmail(email)
}

export function canEditBuilderTab(email: string): boolean {
  return isMasterEmail(email)
}

export function canBypassVerification(email: string, role: Role): boolean {
  void role
  return isMasterEmail(email)
}

export function canRestrictUser(email: string, role: Role): boolean {
  return !canBypassVerification(email, role)
}

export function canEditRole(email: string, role: Role): boolean {
  void role
  return !isMasterEmail(email)
}
