import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"

export type EntityType = {
  id: string
  entityTypeNumber: string
  type: string
  color: PaletteColor
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type EntityTypeListRow = EntityType

/** Picker option — the slim shape the entity-type array picker renders. */
export type EntityTypeOption = {
  id: string
  type: string
  color: PaletteColor
}

export type EntityTypeForm = {
  type: string
  color: PaletteColor
}

export const EMPTY_ENTITY_TYPE_FORM: EntityTypeForm = {
  type: "",
  color: DEFAULT_PALETTE_COLOR,
}

export function toEntityTypeForm(entityType: EntityType): EntityTypeForm {
  return { type: entityType.type, color: entityType.color }
}
