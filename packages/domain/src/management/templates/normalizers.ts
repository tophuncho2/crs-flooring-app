import { normalizeTemplateMaterialItem } from "./material-items/normalizers.js"
import type { TemplateMaterialItemRow } from "./material-items/types.js"
import type { TemplateDetail, TemplateListRow, TemplateOption } from "./types.js"

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

type TemplateDetailInput = TemplateListInput & {
  instructions: string | null
  templateNotes: string | null
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
    instructions: template.instructions ?? "",
    templateNotes: template.templateNotes ?? "",
    items,
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
