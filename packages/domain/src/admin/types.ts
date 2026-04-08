/** The role hierarchy for governance purposes */
export type GovernableRole = "OWNER" | "ADMIN" | "BUILDER"

/** Minimal actor shape needed by governance predicates */
export type GovernanceActor = {
  id: string
  role: GovernableRole
}

/** Minimal target shape needed by governance predicates */
export type GovernanceTarget = {
  id: string
  role: GovernableRole
}

/** Permission flags computed per-row for the admin list UI */
export type GovernancePermissions = {
  canUpdateStatus: boolean
  canChangeRole: boolean
  canDelete: boolean
}
