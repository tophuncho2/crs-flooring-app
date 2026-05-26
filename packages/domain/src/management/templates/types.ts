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
  unitType: string
  jobTypeName: string | null
  description: string | null
  itemsCount: number
}

// Side-panel preview header: the stable per-template snapshot rendered above
// the paginated material-items list. installerInstructions is the only
// installer-facing copy carried into a synced work order; internalNotes are
// template-only back-office notes and are intentionally excluded.
export type TemplatePreviewHeader = {
  id: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  jobTypeName: string | null
  unitType: string
  warehouseName: string
  description: string
  installerInstructions: string
}

// Paginated material-items slice for the side-panel preview. Pagination math
// (total pages) reads from this response, not the header.
export type TemplatePreviewMaterialItemPage = {
  rows: TemplateMaterialItemRow[]
  total: number
  page: number
  pageSize: number
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
