import { WarehouseExecutionError } from "@builders/application"
import type { CreateWarehouseInput } from "@builders/application"
import type {
  LocationDelete,
  LocationDraft,
  LocationUpdate,
  SectionDelete,
  SectionDraft,
  SectionRef,
  SectionsWithLocationsDiff,
} from "@builders/domain"

export function validateWarehouseInput(body: Record<string, unknown>): CreateWarehouseInput {
  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!name) {
    throw new WarehouseExecutionError({
      code: "WAREHOUSE_VALIDATION_FAILED",
      message: "name is required",
      status: 400,
      field: "name",
    })
  }

  const address = typeof body.address === "string" && body.address.trim() !== "" ? body.address : null
  const phone = typeof body.phone === "string" && body.phone.trim() !== "" ? body.phone : null

  return { name, address, phone }
}

function failDiff(message: string, field?: string): never {
  throw new WarehouseExecutionError({
    code: "DIFF_VALIDATION_FAILED",
    message,
    status: 400,
    ...(field ? { field } : {}),
  })
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") failDiff(`${path} is required`, path)
  return value as string
}

function requireInt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) failDiff(`${path} must be an integer`, path)
  return value as number
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failDiff(`${path} must be an array`, path)
  return value as unknown[]
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failDiff(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

function validateSectionRef(value: unknown, path: string): SectionRef {
  const ref = requireObject(value, path)
  if (ref.kind === "id") {
    return { kind: "id", id: requireString(ref.id, `${path}.id`) }
  }
  if (ref.kind === "tempId") {
    return { kind: "tempId", tempId: requireString(ref.tempId, `${path}.tempId`) }
  }
  failDiff(`${path}.kind must be "id" or "tempId"`, path)
}

function validateSectionDraft(value: unknown, path: string): SectionDraft {
  const raw = requireObject(value, path)
  return { tempId: requireString(raw.tempId, `${path}.tempId`) }
}

function validateSectionDelete(value: unknown, path: string): SectionDelete {
  const raw = requireObject(value, path)
  return {
    id: requireString(raw.id, `${path}.id`),
    expectedUpdatedAt: requireString(raw.expectedUpdatedAt, `${path}.expectedUpdatedAt`),
  }
}

function validateLocationDraft(value: unknown, path: string): LocationDraft {
  const raw = requireObject(value, path)
  return {
    tempId: requireString(raw.tempId, `${path}.tempId`),
    sectionRef: validateSectionRef(raw.sectionRef, `${path}.sectionRef`),
    rafter: requireInt(raw.rafter, `${path}.rafter`),
    level: requireInt(raw.level, `${path}.level`),
  }
}

function validateLocationUpdate(value: unknown, path: string): LocationUpdate {
  const raw = requireObject(value, path)
  const update: LocationUpdate = {
    id: requireString(raw.id, `${path}.id`),
    expectedUpdatedAt: requireString(raw.expectedUpdatedAt, `${path}.expectedUpdatedAt`),
  }
  if (raw.sectionId !== undefined) update.sectionId = requireString(raw.sectionId, `${path}.sectionId`)
  if (raw.rafter !== undefined) update.rafter = requireInt(raw.rafter, `${path}.rafter`)
  if (raw.level !== undefined) update.level = requireInt(raw.level, `${path}.level`)
  return update
}

function validateLocationDelete(value: unknown, path: string): LocationDelete {
  const raw = requireObject(value, path)
  return {
    id: requireString(raw.id, `${path}.id`),
    expectedUpdatedAt: requireString(raw.expectedUpdatedAt, `${path}.expectedUpdatedAt`),
  }
}

export function validateSectionsWithLocationsDiff(
  body: Record<string, unknown>,
): SectionsWithLocationsDiff {
  const sections = requireObject(body.sections, "sections")
  const locations = requireObject(body.locations, "locations")

  const sectionsAdded = requireArray(sections.added, "sections.added").map((item, index) =>
    validateSectionDraft(item, `sections.added[${index}]`),
  )
  const sectionsDeleted = requireArray(sections.deleted, "sections.deleted").map((item, index) =>
    validateSectionDelete(item, `sections.deleted[${index}]`),
  )
  const locationsAdded = requireArray(locations.added, "locations.added").map((item, index) =>
    validateLocationDraft(item, `locations.added[${index}]`),
  )
  const locationsModified = requireArray(locations.modified, "locations.modified").map((item, index) =>
    validateLocationUpdate(item, `locations.modified[${index}]`),
  )
  const locationsDeleted = requireArray(locations.deleted, "locations.deleted").map((item, index) =>
    validateLocationDelete(item, `locations.deleted[${index}]`),
  )

  return {
    sections: { added: sectionsAdded, deleted: sectionsDeleted },
    locations: { added: locationsAdded, modified: locationsModified, deleted: locationsDeleted },
  }
}
