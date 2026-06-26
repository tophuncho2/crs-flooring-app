import type { PaletteColor } from "../../shared/palette.js"

/** A linked entity-type, slimmed to what the chip/picker need to render. */
export type EntityTypeRef = {
  id: string
  type: string
  color: PaletteColor
}

export type EntityDetail = {
  id: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  propertyCount: number
  types: EntityTypeRef[]
}

export type EntityListRow = {
  id: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  propertyCount: number
  types: EntityTypeRef[]
}

export type EntityOption = {
  id: string
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
}

export type EntityForm = {
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  /** Ids of the entity-types linked to this entity (set semantics). */
  typeIds: string[]
}

export const EMPTY_ENTITY_FORM: EntityForm = {
  entity: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  typeIds: [],
}
