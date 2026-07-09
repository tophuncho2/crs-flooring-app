import type { PaletteColor } from "../shared/palette.js"
import { normalizeTemplatePlannedProduct } from "./planned-products/normalizers.js"
import type { TemplatePlannedProductRow } from "./planned-products/types.js"
import { normalizeTemplatePlannedPayment } from "./planned-payments/normalizers.js"
import type { TemplatePlannedPaymentRow } from "./planned-payments/types.js"
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
  color: PaletteColor
  unitType: string
  customerName: string | null
  description: string | null
  propertyId: string | null
  property: { name: string; entity: { id: string; entity: string } | null } | null
  jobTypeId: string | null
  jobType: { id: string; name: string } | null
  warehouseId: string | null
  warehouse: { name: string } | null
  _count: { plannedProducts: number }
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
    entity: { id: string; entity: string } | null
    streetAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    instructions: string | null
  } | null
  plannedProducts: Array<Parameters<typeof normalizeTemplatePlannedProduct>[0]>
  plannedPayments: Array<Parameters<typeof normalizeTemplatePlannedPayment>[0]>
}

export function normalizeTemplateListRow(template: TemplateListInput): TemplateListRow {
  return {
    id: template.id,
    templateNumber: template.templateNumber,
    color: template.color,
    unitType: template.unitType,
    customerName: template.customerName ?? "",
    description: template.description ?? "",
    propertyId: template.propertyId,
    propertyName: template.property?.name ?? "",
    entityId: template.property?.entity?.id ?? null,
    entityName: template.property?.entity?.entity ?? null,
    jobTypeId: template.jobTypeId,
    jobTypeName: template.jobType?.name ?? null,
    warehouseId: template.warehouseId,
    warehouseName: template.warehouse?.name ?? "",
    plannedProductsCount: template._count.plannedProducts,
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
  const plannedProducts: TemplatePlannedProductRow[] = template.plannedProducts.map(normalizeTemplatePlannedProduct)
  const plannedPayments: TemplatePlannedPaymentRow[] = template.plannedPayments.map(normalizeTemplatePlannedPayment)
  return {
    ...base,
    internalNotes: template.internalNotes ?? "",
    installerInstructions: template.installerInstructions ?? "",
    propertyStreetAddress: template.property?.streetAddress ?? "",
    propertyCity: template.property?.city ?? "",
    propertyState: template.property?.state ?? "",
    propertyPostalCode: template.property?.postalCode ?? "",
    propertyInstructions: template.property?.instructions ?? "",
    plannedProducts,
    plannedPayments,
    previousTemplate: neighbors.previousTemplate,
    nextTemplate: neighbors.nextTemplate,
  }
}

export function normalizeTemplateOption(template: {
  id: string
  unitType: string
  description: string | null
  jobType: { name: string } | null
  _count: { plannedProducts: number }
}): TemplateOption {
  return {
    id: template.id,
    unitType: template.unitType,
    jobTypeName: template.jobType?.name ?? null,
    description: template.description,
    plannedProductsCount: template._count.plannedProducts,
  }
}
