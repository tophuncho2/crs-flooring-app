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
  instructions: string
  templateNotes: string
  items: TemplateMaterialItemRow[]
}

export type TemplateOption = {
  id: string
  templateNumber: string
  unitType: string
}

export type TemplateForm = {
  propertyId: string
  managementCompanyId: string
  jobTypeId: string
  warehouseId: string
  unitType: string
  description: string
  instructions: string
  templateNotes: string
}

export const EMPTY_TEMPLATE_FORM: TemplateForm = {
  propertyId: "",
  managementCompanyId: "",
  jobTypeId: "",
  warehouseId: "",
  unitType: "",
  description: "",
  instructions: "",
  templateNotes: "",
}
