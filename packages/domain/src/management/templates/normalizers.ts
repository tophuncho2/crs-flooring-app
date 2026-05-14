import { normalizeTemplateMaterialItem } from "./material-items/normalizers.js"
import type { TemplateMaterialItemRow } from "./material-items/types.js"
import type {
  TemplateDetail,
  TemplateListRow,
  TemplateOption,
  TemplatePreview,
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
    propertyStreetAddress: template.property.streetAddress ?? "",
    propertyCity: template.property.city ?? "",
    propertyState: template.property.state ?? "",
    propertyPostalCode: template.property.postalCode ?? "",
    propertyInstructions: template.property.instructions ?? "",
    items,
  }
}

type TemplatePreviewInput = {
  id: string
  templateNumber: string
  unitType: string
  description: string | null
  jobType: { name: string } | null
  warehouse: { name: string } | null
  property: {
    streetAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    instructions: string | null
  }
  items: Array<Parameters<typeof normalizeTemplateMaterialItem>[0]>
  _count: { items: number }
}

export type TemplatePreviewPageInfo = {
  itemsPage: number
  itemsPageSize: number
}

export function normalizeTemplatePreview(
  template: TemplatePreviewInput,
  page: TemplatePreviewPageInfo,
): TemplatePreview {
  return {
    id: template.id,
    templateNumber: template.templateNumber,
    propertyStreetAddress: template.property.streetAddress ?? "",
    propertyCity: template.property.city ?? "",
    propertyState: template.property.state ?? "",
    propertyPostalCode: template.property.postalCode ?? "",
    propertyInstructions: template.property.instructions ?? "",
    jobTypeName: template.jobType?.name ?? null,
    unitType: template.unitType,
    warehouseName: template.warehouse?.name ?? "",
    description: template.description ?? "",
    items: template.items.map(normalizeTemplateMaterialItem),
    itemsTotal: template._count.items,
    itemsPage: page.itemsPage,
    itemsPageSize: page.itemsPageSize,
  }
}

export function normalizeTemplateOption(template: {
  id: string
  templateNumber: string
  unitType: string
}): TemplateOption {
  return {
    id: template.id,
    templateNumber: template.templateNumber,
    unitType: template.unitType,
  }
}
