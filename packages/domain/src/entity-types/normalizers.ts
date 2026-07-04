import type { EntityType, EntityTypeOption } from "./types.js"
import type { PaletteColor } from "../../shared/palette.js"

type EntityTypeInput = {
  id: string
  entityTypeNumber: string
  type: string
  color: PaletteColor
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeEntityType(entityType: EntityTypeInput): EntityType {
  return {
    id: entityType.id,
    entityTypeNumber: entityType.entityTypeNumber,
    type: entityType.type,
    color: entityType.color,
    createdAt:
      entityType.createdAt instanceof Date ? entityType.createdAt.toISOString() : entityType.createdAt,
    updatedAt:
      entityType.updatedAt instanceof Date ? entityType.updatedAt.toISOString() : entityType.updatedAt,
    createdBy: entityType.createdBy,
    updatedBy: entityType.updatedBy,
  }
}

export function normalizeEntityTypeOption(input: {
  id: string
  type: string
  color: PaletteColor
}): EntityTypeOption {
  return { id: input.id, type: input.type, color: input.color }
}
