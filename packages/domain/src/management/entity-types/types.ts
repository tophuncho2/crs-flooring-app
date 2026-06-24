import { DEFAULT_ENTITY_TYPE_COLOR, type EntityTypeColor } from "./palette.js"

export type EntityType = {
  id: string
  entityTypeNumber: string
  type: string
  color: EntityTypeColor
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type EntityTypeListRow = EntityType

export type EntityTypeForm = {
  type: string
  color: EntityTypeColor
}

export const EMPTY_ENTITY_TYPE_FORM: EntityTypeForm = {
  type: "",
  color: DEFAULT_ENTITY_TYPE_COLOR,
}

export function toEntityTypeForm(entityType: EntityType): EntityTypeForm {
  return { type: entityType.type, color: entityType.color }
}
