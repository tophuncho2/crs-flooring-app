import { normalizeTemplateMaterialItem } from "./material-items/normalizers.js"
import type { TemplateMaterialItemRow } from "./material-items/types.js"
import type {
  TemplateDetail,
  TemplateListRow,
  TemplateNeighbor,
  TemplateOption,
} from "./types.js"

type TemplateNeighbors = {
  previousTemplate: TemplateNeighbor | null
  nextTemplate: TemplateNeighbor | null
}

const NO_TEMPLATE_NEIGHBORS: TemplateNeighbors = {
  previousTemplate: null,
  nextTemplate: null,
}

type TemplateListInput = {
  id: string
  templateNumber: string
  unitType: string
  description: string | null
  propertyId: string | null
  property: { name: string; managementCompany: { id: string; name: string } | null } | null
  jobTypeId: string | null
  jobType: { id: string; name: string } | null
  warehouseId: string | null
  warehouse: { name: string } | null
  _count: { items: number }
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

type TemplateDetailInput = Omit<TemplateListInput, "property"> & {
  internalNotes: string | null
  installerInstructions: string | null
  property: {
    name: string
    managementCompany: { id: string; name: string } | null
    streetAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    instructions: string | null
  } | null
  items: Array<Parameters<typeof normalizeTemplateMaterialItem>[0]>
}

export function normalizeTemplateListRow(template: TemplateListInput): TemplateListRow {
  return {
    id: template.id,
    templateNumber: template.templateNumber,
    unitType: template.unitType,
    description: template.description ?? "",
    propertyId: template.propertyId,
    propertyName: template.property?.name ?? "",
    managementCompanyId: template.property?.managementCompany?.id ?? null,
    managementCompanyName: template.property?.managementCompany?.name ?? null,
    jobTypeId: template.jobTypeId,
    jobTypeName: template.jobType?.name ?? null,
    warehouseId: template.warehouseId,
    warehouseName: template.warehouse?.name ?? "",
    itemsCount: template._count.items,
    createdAt: template.createdAt instanceof Date ? template.createdAt.toISOString() : template.createdAt,
    updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : template.updatedAt,
    createdBy: template.createdBy ?? null,
    updatedBy: template.updatedBy ?? null,
  }
}

export function normalizeTemplate(
  template: TemplateDetailInput,
  neighbors: TemplateNeighbors = NO_TEMPLATE_NEIGHBORS,
): TemplateDetail {
  const base = normalizeTemplateListRow(template)
  const items: TemplateMaterialItemRow[] = template.items.map(normalizeTemplateMaterialItem)
  return {
    ...base,
    internalNotes: template.internalNotes ?? "",
    installerInstructions: template.installerInstructions ?? "",
    propertyStreetAddress: template.property?.streetAddress ?? "",
    propertyCity: template.property?.city ?? "",
    propertyState: template.property?.state ?? "",
    propertyPostalCode: template.property?.postalCode ?? "",
    propertyInstructions: template.property?.instructions ?? "",
    items,
    previousTemplate: neighbors.previousTemplate,
    nextTemplate: neighbors.nextTemplate,
  }
}

export function normalizeTemplateOption(template: {
  id: string
  unitType: string
  description: string | null
  jobType: { name: string } | null
  _count: { items: number }
}): TemplateOption {
  return {
    id: template.id,
    unitType: template.unitType,
    jobTypeName: template.jobType?.name ?? null,
    description: template.description,
    itemsCount: template._count.items,
  }
}
