import { normalizeTemplateMaterialItem } from "./material-items/normalizers.js"
import type { TemplateMaterialItemRow } from "./material-items/types.js"
import type {
  TemplateDetail,
  TemplateListRow,
  TemplateOption,
  TemplatePreviewHeader,
  TemplatePreviewMaterialItemPage,
} from "./types.js"

type TemplateListInput = {
  id: string
  templateNumber: string
  unitType: string
  description: string | null
  propertyId: string
  property: { name: string }
  managementCompanyId: string | null
  managementCompany: { id: string; name: string } | null
  jobTypeId: string | null
  jobType: { id: string; name: string } | null
  warehouseId: string | null
  warehouse: { name: string } | null
  _count: { items: number }
  createdAt: Date | string
  updatedAt: Date | string
}

type TemplateDetailInput = Omit<TemplateListInput, "property"> & {
  internalNotes: string | null
  installerInstructions: string | null
  property: {
    name: string
    streetAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    instructions: string | null
  }
  items: Array<Parameters<typeof normalizeTemplateMaterialItem>[0]>
}

export function normalizeTemplateListRow(template: TemplateListInput): TemplateListRow {
  return {
    id: template.id,
    templateNumber: template.templateNumber,
    unitType: template.unitType,
    description: template.description ?? "",
    propertyId: template.propertyId,
    propertyName: template.property.name,
    managementCompanyId: template.managementCompanyId,
    managementCompanyName: template.managementCompany?.name ?? null,
    jobTypeId: template.jobTypeId,
    jobTypeName: template.jobType?.name ?? null,
    warehouseId: template.warehouseId,
    warehouseName: template.warehouse?.name ?? "",
    itemsCount: template._count.items,
    createdAt: template.createdAt instanceof Date ? template.createdAt.toISOString() : template.createdAt,
    updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : template.updatedAt,
  }
}

export function normalizeTemplate(template: TemplateDetailInput): TemplateDetail {
  const base = normalizeTemplateListRow(template)
  const items: TemplateMaterialItemRow[] = template.items.map(normalizeTemplateMaterialItem)
  return {
    ...base,
    internalNotes: template.internalNotes ?? "",
    installerInstructions: template.installerInstructions ?? "",
    propertyStreetAddress: template.property.streetAddress ?? "",
    propertyCity: template.property.city ?? "",
    propertyState: template.property.state ?? "",
    propertyPostalCode: template.property.postalCode ?? "",
    propertyInstructions: template.property.instructions ?? "",
    items,
  }
}

type TemplatePreviewHeaderInput = {
  id: string
  unitType: string
  description: string | null
  installerInstructions: string | null
  jobType: { name: string } | null
  warehouse: { name: string } | null
  property: {
    streetAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    instructions: string | null
  }
}

export function normalizeTemplatePreviewHeader(
  template: TemplatePreviewHeaderInput,
): TemplatePreviewHeader {
  return {
    id: template.id,
    propertyStreetAddress: template.property.streetAddress ?? "",
    propertyCity: template.property.city ?? "",
    propertyState: template.property.state ?? "",
    propertyPostalCode: template.property.postalCode ?? "",
    propertyInstructions: template.property.instructions ?? "",
    jobTypeName: template.jobType?.name ?? null,
    unitType: template.unitType,
    warehouseName: template.warehouse?.name ?? "",
    description: template.description ?? "",
    installerInstructions: template.installerInstructions ?? "",
  }
}

export type TemplatePreviewMaterialItemPageInput = {
  rows: Array<Parameters<typeof normalizeTemplateMaterialItem>[0]>
  total: number
  page: number
  pageSize: number
}

export function normalizeTemplatePreviewMaterialItemPage(
  input: TemplatePreviewMaterialItemPageInput,
): TemplatePreviewMaterialItemPage {
  return {
    rows: input.rows.map(normalizeTemplateMaterialItem),
    total: input.total,
    page: input.page,
    pageSize: input.pageSize,
  }
}

export function normalizeTemplateOption(template: {
  id: string
  unitType: string
  description: string | null
}): TemplateOption {
  return {
    id: template.id,
    unitType: template.unitType,
    description: template.description,
  }
}
