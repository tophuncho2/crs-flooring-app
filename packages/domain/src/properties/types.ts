import type { PaletteColor } from "../shared/palette.js"

export type PropertyEntity = {
  id: string
  entity: string
}

/**
 * An adjacent property in the global property-number sequence
 * (`propertyNumberInt`). Carries only `id` — the record-view stepper navigates
 * straight to the neighbor record by number. Null at the ends of the sequence.
 */
export type PropertyNeighbor = {
  id: string
}

export type PropertyDetailRecord = {
  id: string
  propertyNumber: string
  createdAt: string
  updatedAt: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  instructions: string
  fullAddress: string
  color: PaletteColor
  createdBy: string | null
  updatedBy: string | null
  entity: PropertyEntity | null
  /**
   * Neighbors by global property-number order (`propertyNumberInt`), ignoring
   * entity/state filters — powers the record-view shell stepper (◀ PROP-# ▶). Null
   * when the current row is at the start/end of the sequence.
   */
  previousProperty: PropertyNeighbor | null
  nextProperty: PropertyNeighbor | null
}

export type PropertyListRow = {
  id: string
  propertyNumber: string
  createdAt: string
  updatedAt: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  color: PaletteColor
  createdBy: string | null
  updatedBy: string | null
  entity: PropertyEntity | null
  templateCount: number
}

export type PropertyOption = {
  id: string
  name: string
  address: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  instructions: string
  entityId: string | null
  entityName: string | null
}

export type PropertyPrimaryForm = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  instructions: string
  color: PaletteColor
  entityId: string
}
