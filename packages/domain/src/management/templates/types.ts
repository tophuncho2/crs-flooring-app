import type { TemplateMaterialItemRow } from "./material-items/types.js"

export type TemplateListRow = {
  id: string
  templateNumber: string
  unitType: string
  description: string
  propertyId: string | null
  propertyName: string
  managementCompanyId: string | null
  managementCompanyName: string | null
  jobTypeId: string | null
  jobTypeName: string | null
  warehouseId: string | null
  warehouseName: string
  itemsCount: number
  createdAt: string
  updatedAt: string
}

/**
 * An adjacent template in the global template-number sequence
 * (`templateNumberInt`). Carries only `id` — the record-view stepper navigates
 * straight to the neighbor record by number; it does not drive the
 * MC→Property→Template cascade. Null at the ends of the sequence.
 */
export type TemplateNeighbor = {
  id: string
}

export type TemplateDetail = TemplateListRow & {
  internalNotes: string
  installerInstructions: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  items: TemplateMaterialItemRow[]
  /**
   * Neighbors by global template-number order (`templateNumberInt`), ignoring
   * property/MC filters — powers the record-view shell stepper (◀ TP-# ▶). Null
   * when the current row is at the start/end of the sequence.
   */
  previousTemplate: TemplateNeighbor | null
  nextTemplate: TemplateNeighbor | null
}

export type TemplateOption = {
  id: string
  unitType: string
  jobTypeName: string | null
  description: string | null
  itemsCount: number
}

export type TemplateForm = {
  propertyId: string
  jobTypeId: string
  warehouseId: string
  unitType: string
  description: string
  internalNotes: string
  installerInstructions: string
}

export const EMPTY_TEMPLATE_FORM: TemplateForm = {
  propertyId: "",
  jobTypeId: "",
  warehouseId: "",
  unitType: "",
  description: "",
  internalNotes: "",
  installerInstructions: "",
}
