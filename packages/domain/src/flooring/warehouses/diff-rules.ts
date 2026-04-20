export type SectionDraft = {
  tempId: string
}

export type SectionDelete = {
  id: string
  expectedUpdatedAt: string
}

export type LocationSectionRef =
  | { kind: "id"; id: string }
  | { kind: "tempId"; tempId: string }

export type LocationDraft = {
  tempId: string
  sectionRef: LocationSectionRef
  rafter: number
  level: number
}

export type LocationUpdate = {
  id: string
  sectionId?: string
  rafter?: number
  level?: number
  expectedUpdatedAt: string
}

export type LocationDelete = {
  id: string
  expectedUpdatedAt: string
}

export type SectionsWithLocationsDiff = {
  sections: {
    added: SectionDraft[]
    deleted: SectionDelete[]
  }
  locations: {
    added: LocationDraft[]
    modified: LocationUpdate[]
    deleted: LocationDelete[]
  }
}

export type SectionRef =
  | { kind: "id"; id: string }
  | { kind: "tempId"; tempId: string }

export type DiffValidationIssue =
  | { code: "DUPLICATE_LOCATION_COORD_IN_ADDED"; rafter: number; level: number; tempIds: string[] }
  | { code: "DUPLICATE_LOCATION_COORD"; rafter: number; level: number; offendingRefs: SectionRef[] }
  | { code: "UNRESOLVED_TEMPID"; locationTempId: string; referencedSectionTempId: string }
  | { code: "DELETED_SECTION_HAS_REMAINING_LOCATIONS"; sectionId: string; strandedLocationIds: string[] }

/**
 * Produce a user-readable explanation for a single diff validation issue.
 * Pure function; safe to call from use cases that need to build a human
 * message before throwing a transport-layer error.
 */
export function describeDiffIssue(issue: DiffValidationIssue): string {
  switch (issue.code) {
    case "DUPLICATE_LOCATION_COORD_IN_ADDED":
      return `${issue.tempIds.length} new locations share R${issue.rafter}-L${issue.level}. Each rafter/level must be unique within a warehouse.`
    case "DUPLICATE_LOCATION_COORD":
      return `R${issue.rafter}-L${issue.level} is already in use by another location. Each rafter/level must be unique within a warehouse.`
    case "UNRESOLVED_TEMPID":
      return "A new location references an unsaved section. Save sections first, then add locations to them."
    case "DELETED_SECTION_HAS_REMAINING_LOCATIONS":
      return `Cannot delete a section while ${issue.strandedLocationIds.length} location(s) still belong to it. Remove or reassign the locations first.`
  }
}

/**
 * Build a single human-readable message from a non-empty list of diff issues.
 * Joins individual descriptions with a space so they render cleanly in a
 * single-line UI error slot.
 */
export function describeDiffIssues(issues: DiffValidationIssue[]): string {
  return issues.map(describeDiffIssue).join(" ")
}

type ProjectedLocation =
  | { origin: "existing"; id: string; rafter: number; level: number }
  | { origin: "modified"; id: string; rafter: number; level: number }
  | { origin: "added"; tempId: string; rafter: number; level: number }

function coordKey(rafter: number, level: number): string {
  return `${rafter}:${level}`
}

function projectPostDiffLocations(
  diff: SectionsWithLocationsDiff,
  existingLocations: { id: string; rafter: number; level: number }[],
): ProjectedLocation[] {
  const deletedIds = new Set(diff.locations.deleted.map((l) => l.id))
  const modifiedById = new Map(diff.locations.modified.map((m) => [m.id, m]))

  const result: ProjectedLocation[] = []
  for (const location of existingLocations) {
    if (deletedIds.has(location.id)) continue
    const mod = modifiedById.get(location.id)
    const hasCoordChange = mod !== undefined && (mod.rafter !== undefined || mod.level !== undefined)
    const rafter = mod?.rafter ?? location.rafter
    const level = mod?.level ?? location.level
    result.push({
      origin: hasCoordChange ? "modified" : "existing",
      id: location.id,
      rafter,
      level,
    })
  }
  for (const draft of diff.locations.added) {
    result.push({ origin: "added", tempId: draft.tempId, rafter: draft.rafter, level: draft.level })
  }
  return result
}

function toRef(projected: ProjectedLocation): SectionRef {
  return projected.origin === "added"
    ? { kind: "tempId", tempId: projected.tempId }
    : { kind: "id", id: projected.id }
}

export function findDuplicateLocationCoordsInDiff(
  diff: SectionsWithLocationsDiff,
  existingLocations: { id: string; warehouseId: string; rafter: number; level: number }[],
): DiffValidationIssue[] {
  const issues: DiffValidationIssue[] = []

  const addedTempIdsByCoord = new Map<string, { rafter: number; level: number; tempIds: string[] }>()
  for (const draft of diff.locations.added) {
    const key = coordKey(draft.rafter, draft.level)
    const group = addedTempIdsByCoord.get(key) ?? { rafter: draft.rafter, level: draft.level, tempIds: [] }
    group.tempIds.push(draft.tempId)
    addedTempIdsByCoord.set(key, group)
  }
  for (const { rafter, level, tempIds } of addedTempIdsByCoord.values()) {
    if (tempIds.length > 1) {
      issues.push({ code: "DUPLICATE_LOCATION_COORD_IN_ADDED", rafter, level, tempIds })
    }
  }

  const projected = projectPostDiffLocations(diff, existingLocations)
  const byCoord = new Map<string, ProjectedLocation[]>()
  for (const entry of projected) {
    const key = coordKey(entry.rafter, entry.level)
    const group = byCoord.get(key) ?? []
    group.push(entry)
    byCoord.set(key, group)
  }
  for (const entries of byCoord.values()) {
    if (entries.length > 1) {
      const addedCount = entries.filter((e) => e.origin === "added").length
      if (entries.length === addedCount && addedCount > 1) continue
      issues.push({
        code: "DUPLICATE_LOCATION_COORD",
        rafter: entries[0].rafter,
        level: entries[0].level,
        offendingRefs: entries.map(toRef),
      })
    }
  }

  return issues
}

export function findUnresolvedTempIds(diff: SectionsWithLocationsDiff): DiffValidationIssue[] {
  const issues: DiffValidationIssue[] = []
  const addedSectionTempIds = new Set(diff.sections.added.map((s) => s.tempId))

  for (const location of diff.locations.added) {
    if (location.sectionRef.kind === "tempId" && !addedSectionTempIds.has(location.sectionRef.tempId)) {
      issues.push({
        code: "UNRESOLVED_TEMPID",
        locationTempId: location.tempId,
        referencedSectionTempId: location.sectionRef.tempId,
      })
    }
  }

  return issues
}

export function findStrandedLocations(
  diff: SectionsWithLocationsDiff,
  existingLocations: { id: string; sectionId: string }[],
): DiffValidationIssue[] {
  const issues: DiffValidationIssue[] = []
  const deletedSectionIds = new Set(diff.sections.deleted.map((s) => s.id))
  const deletedLocationIds = new Set(diff.locations.deleted.map((l) => l.id))
  const reassignedLocationIds = new Set(
    diff.locations.modified.filter((m) => m.sectionId !== undefined).map((m) => m.id),
  )

  for (const sectionId of deletedSectionIds) {
    const stranded = existingLocations
      .filter(
        (l) =>
          l.sectionId === sectionId &&
          !deletedLocationIds.has(l.id) &&
          !reassignedLocationIds.has(l.id),
      )
      .map((l) => l.id)
    if (stranded.length > 0) {
      issues.push({
        code: "DELETED_SECTION_HAS_REMAINING_LOCATIONS",
        sectionId,
        strandedLocationIds: stranded,
      })
    }
  }

  return issues
}

export function validateDiff(
  diff: SectionsWithLocationsDiff,
  existing: {
    locations: { id: string; warehouseId: string; sectionId: string; rafter: number; level: number }[]
  },
): DiffValidationIssue[] {
  return [
    ...findDuplicateLocationCoordsInDiff(diff, existing.locations),
    ...findUnresolvedTempIds(diff),
    ...findStrandedLocations(diff, existing.locations),
  ]
}
