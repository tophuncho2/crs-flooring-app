import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"

/** A linked entity-type, slimmed to what the chip/picker need to render. */
export type EntityTypeRef = {
  id: string
  type: string
  color: PaletteColor
}

/**
 * An adjacent entity in the global entity-number sequence (`entityNumberInt`).
 * Carries only `id` — the record-view stepper navigates straight to the neighbor
 * record by number. Null at the ends of the sequence.
 */
export type EntityNeighbor = {
  id: string
}

export type EntityDetail = {
  id: string
  entityNumber: string
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
  color: PaletteColor
  propertyCount: number
  type: EntityTypeRef | null
  /**
   * Neighbors by global entity-number order (`entityNumberInt`), ignoring
   * state/type filters — powers the record-view shell stepper (◀ ENT-# ▶). Null
   * when the current row is at the start/end of the sequence.
   */
  previousEntity: EntityNeighbor | null
  nextEntity: EntityNeighbor | null
}

export type EntityListRow = {
  id: string
  entityNumber: string
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
  color: PaletteColor
  propertyCount: number
  type: EntityTypeRef | null
}

export type EntityOption = {
  id: string
  entity: string
  /** ENT-# label — lets a picked option hydrate the read-only ENT-# chip. */
  entityNumber: string
  /** Palette tag — lets a picked option hydrate the read-only color chip. */
  color: PaletteColor
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  /** Linked entity-type, for the picker option's subtitle line. */
  type: EntityTypeRef | null
}

export type EntityForm = {
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  /** Id of the entity-type linked to this entity, or null when unassigned. */
  typeId: string | null
  /** Edit-only palette tag — wraps the ENT-# chip. New entities default SLATE. */
  color: PaletteColor
}

export const EMPTY_ENTITY_FORM: EntityForm = {
  entity: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  typeId: null,
  color: DEFAULT_PALETTE_COLOR,
}
