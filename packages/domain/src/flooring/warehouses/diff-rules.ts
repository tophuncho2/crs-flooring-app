import { normalizeLocationCode } from "./location-rules.js"

export type SectionDraft = {
  tempId: string
  name: string
}

export type SectionUpdate = {
  id: string
  name: string
  expectedUpdatedAt: string
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
  locationCode: string
}

export type LocationUpdate = {
  id: string
  locationCode?: string
  sectionId?: string
  expectedUpdatedAt: string
}

export type LocationDelete = {
  id: string
  expectedUpdatedAt: string
}

export type SectionsWithLocationsDiff = {
  sections: {
    added: SectionDraft[]
    modified: SectionUpdate[]
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
  | { code: "DUPLICATE_SECTION_SLUG_IN_ADDED"; slug: string; tempIds: string[] }
  | { code: "DUPLICATE_SECTION_SLUG"; slug: string; offendingRefs: SectionRef[] }
  | { code: "DUPLICATE_LOCATION_CODE_IN_ADDED"; locationCode: string; tempIds: string[] }
  | { code: "DUPLICATE_LOCATION_CODE"; locationCode: string; offendingRefs: SectionRef[] }
  | { code: "UNRESOLVED_TEMPID"; locationTempId: string; referencedSectionTempId: string }
  | { code: "DELETED_SECTION_HAS_REMAINING_LOCATIONS"; sectionId: string; strandedLocationIds: string[] }

type ProjectedSection =
  | { origin: "existing"; id: string; slug: string }
  | { origin: "modified"; id: string; slug: string }
  | { origin: "added"; tempId: string; slug: string }

type ProjectedLocation =
  | { origin: "existing"; id: string; locationCode: string }
  | { origin: "modified"; id: string; locationCode: string }
  | { origin: "added"; tempId: string; locationCode: string }

function projectPostDiffSections(
  diff: SectionsWithLocationsDiff,
  existingSections: { id: string; slug: string }[],
  slugOf: (name: string) => string,
): ProjectedSection[] {
  const deletedIds = new Set(diff.sections.deleted.map((s) => s.id))
  const modifiedById = new Map(diff.sections.modified.map((m) => [m.id, m]))

  const result: ProjectedSection[] = []
  for (const section of existingSections) {
    if (deletedIds.has(section.id)) continue
    const mod = modifiedById.get(section.id)
    if (mod) {
      result.push({ origin: "modified", id: section.id, slug: slugOf(mod.name) })
    } else {
      result.push({ origin: "existing", id: section.id, slug: section.slug })
    }
  }
  for (const draft of diff.sections.added) {
    result.push({ origin: "added", tempId: draft.tempId, slug: slugOf(draft.name) })
  }
  return result
}

function projectPostDiffLocations(
  diff: SectionsWithLocationsDiff,
  existingLocations: { id: string; locationCode: string; sectionId: string | null }[],
): ProjectedLocation[] {
  const deletedIds = new Set(diff.locations.deleted.map((l) => l.id))
  const modifiedById = new Map(diff.locations.modified.map((m) => [m.id, m]))

  const result: ProjectedLocation[] = []
  for (const location of existingLocations) {
    if (deletedIds.has(location.id)) continue
    const mod = modifiedById.get(location.id)
    if (mod && mod.locationCode !== undefined) {
      result.push({ origin: "modified", id: location.id, locationCode: normalizeLocationCode(mod.locationCode) })
    } else {
      result.push({ origin: "existing", id: location.id, locationCode: normalizeLocationCode(location.locationCode) })
    }
  }
  for (const draft of diff.locations.added) {
    result.push({ origin: "added", tempId: draft.tempId, locationCode: normalizeLocationCode(draft.locationCode) })
  }
  return result
}

function toRef(projected: ProjectedSection | ProjectedLocation): SectionRef {
  return projected.origin === "added"
    ? { kind: "tempId", tempId: projected.tempId }
    : { kind: "id", id: projected.id }
}

export function findDuplicateSectionSlugsInDiff(
  diff: SectionsWithLocationsDiff,
  existingSections: { id: string; slug: string }[],
  slugOf: (name: string) => string,
): DiffValidationIssue[] {
  const issues: DiffValidationIssue[] = []

  const addedTempIdsBySlug = new Map<string, string[]>()
  for (const draft of diff.sections.added) {
    const slug = slugOf(draft.name)
    const group = addedTempIdsBySlug.get(slug) ?? []
    group.push(draft.tempId)
    addedTempIdsBySlug.set(slug, group)
  }
  for (const [slug, tempIds] of addedTempIdsBySlug.entries()) {
    if (tempIds.length > 1) {
      issues.push({ code: "DUPLICATE_SECTION_SLUG_IN_ADDED", slug, tempIds })
    }
  }

  const projected = projectPostDiffSections(diff, existingSections, slugOf)
  const bySlug = new Map<string, ProjectedSection[]>()
  for (const entry of projected) {
    const group = bySlug.get(entry.slug) ?? []
    group.push(entry)
    bySlug.set(entry.slug, group)
  }
  for (const [slug, entries] of bySlug.entries()) {
    if (entries.length > 1) {
      const addedCount = entries.filter((e) => e.origin === "added").length
      if (entries.length === addedCount && addedCount > 1) continue
      issues.push({
        code: "DUPLICATE_SECTION_SLUG",
        slug,
        offendingRefs: entries.map(toRef),
      })
    }
  }

  return issues
}

export function findDuplicateLocationCodesInDiff(
  diff: SectionsWithLocationsDiff,
  existingLocations: { id: string; locationCode: string; sectionId: string | null }[],
): DiffValidationIssue[] {
  const issues: DiffValidationIssue[] = []

  const addedTempIdsByCode = new Map<string, string[]>()
  for (const draft of diff.locations.added) {
    const code = normalizeLocationCode(draft.locationCode)
    const group = addedTempIdsByCode.get(code) ?? []
    group.push(draft.tempId)
    addedTempIdsByCode.set(code, group)
  }
  for (const [locationCode, tempIds] of addedTempIdsByCode.entries()) {
    if (tempIds.length > 1) {
      issues.push({ code: "DUPLICATE_LOCATION_CODE_IN_ADDED", locationCode, tempIds })
    }
  }

  const projected = projectPostDiffLocations(diff, existingLocations)
  const byCode = new Map<string, ProjectedLocation[]>()
  for (const entry of projected) {
    const group = byCode.get(entry.locationCode) ?? []
    group.push(entry)
    byCode.set(entry.locationCode, group)
  }
  for (const [locationCode, entries] of byCode.entries()) {
    if (entries.length > 1) {
      const addedCount = entries.filter((e) => e.origin === "added").length
      if (entries.length === addedCount && addedCount > 1) continue
      issues.push({
        code: "DUPLICATE_LOCATION_CODE",
        locationCode,
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
  existingLocations: { id: string; sectionId: string | null }[],
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
    sections: { id: string; slug: string }[]
    locations: { id: string; locationCode: string; sectionId: string | null }[]
  },
  slugOf: (name: string) => string,
): DiffValidationIssue[] {
  return [
    ...findDuplicateSectionSlugsInDiff(diff, existing.sections, slugOf),
    ...findDuplicateLocationCodesInDiff(diff, existing.locations),
    ...findUnresolvedTempIds(diff),
    ...findStrandedLocations(diff, existing.locations),
  ]
}
