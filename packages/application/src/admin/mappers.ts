import type { ManagedUserRecord } from "@builders/db"
import type { GovernableRole, GovernanceActor } from "@builders/domain"
import { computeGovernancePermissions } from "@builders/domain"
import type { ManagedUserWithPermissions } from "./types.js"

export function toManagedUserWithPermissions(
  record: ManagedUserRecord,
  actor: GovernanceActor,
): ManagedUserWithPermissions {
  const target = { id: record.id, role: record.role as GovernableRole }
  const permissions = computeGovernancePermissions(actor, target)

  return {
    ...record,
    ...permissions,
  }
}
