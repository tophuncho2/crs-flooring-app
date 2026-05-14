import type { TemplateMaterialItemRow } from "./material-items/types.js"

export type TemplateListRow = {
  id: string
  templateNumber: string
  unitType: string
  description: string
  propertyId: string
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

export type TemplateDetail = TemplateListRow & {
  internalNotes: string
  installerInstructions: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  items: TemplateMaterialItemRow[]
}

export type TemplateOption = {
  id: string
  templateNumber: string
  unitType: string
}

export type TemplatePreview = {
  id: string
  templateNumber: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  jobTypeName: string | null
  unitType: string
  warehouseName: string
  description: string
  // installer-facing copy that gets carried into the synced work order;
  // internalNotes are intentionally NOT exposed here — they are
  // template-only back-office notes that never travel to a work order.
  installerInstructions: string
  // Page slice of material items (bounded by itemsPageSize), not the full set.
  items: TemplateMaterialItemRow[]
  itemsTotal: number
  itemsPage: number
  itemsPageSize: number
}

export type TemplateForm = {
  propertyId: string
  managementCompanyId: string
  jobTypeId: string
  warehouseId: string
  unitType: string
  description: string
  internalNotes: string
  installerInstructions: string
}

export const EMPTY_TEMPLATE_FORM: TemplateForm = {
  propertyId: "",
  managementCompanyId: "",
  jobTypeId: "",
  warehouseId: "",
  unitType: "",
  description: "",
  internalNotes: "",
  installerInstructions: "",
}
