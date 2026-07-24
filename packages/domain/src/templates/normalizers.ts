import { toIsoTimestamp } from "../shared/date-format.js"
import { normalizeMoneyAmount } from "../shared/money.js"
import { normalizeTaxRate } from "./tax.js"
import type { PaletteColor } from "../shared/palette.js"
import { normalizeTemplatePlannedProduct } from "./planned-products/normalizers.js"
import type { TemplatePlannedProductRow } from "./planned-products/types.js"
import { normalizeTemplatePlannedPayment } from "./planned-payments/normalizers.js"
import type { TemplatePlannedPaymentRow } from "./planned-payments/types.js"
import { normalizeTemplateEntityInvolvement } from "./entity-involvement/normalizers.js"
import type { TemplateEntityInvolvementRow } from "./entity-involvement/types.js"
import { normalizeTemplateServiceItem } from "./service-items/normalizers.js"
import type { TemplateServiceItemRow } from "./service-items/types.js"
import { normalizeTemplateCommission } from "./commissions/normalizers.js"
import type { TemplateCommissionRow } from "./commissions/types.js"
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
  totalTransaction: { toString(): string } | null
  taxRate: { toString(): string } | null
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
  serviceItems: Array<Parameters<typeof normalizeTemplateServiceItem>[0]>
  plannedPayments: Array<Parameters<typeof normalizeTemplatePlannedPayment>[0]>
  entityInvolvements: Array<Parameters<typeof normalizeTemplateEntityInvolvement>[0]>
  commissions: Array<Parameters<typeof normalizeTemplateCommission>[0]>
}

export function normalizeTemplateListRow(template: TemplateListInput): TemplateListRow {
  return {
    id: template.id,
    templateNumber: template.templateNumber,
    color: template.color,
    unitType: template.unitType,
    customerName: template.customerName ?? "",
    description: template.description ?? "",
    // Money-on-read: canonical "X.XX" / "" so dirty-checks compare stable strings
    // (no trailing-zero false-dirty). Mirrors the service-item bidCost normalizer.
    totalTransaction:
      template.totalTransaction == null ? "" : normalizeMoneyAmount(template.totalTransaction.toString()),
    // Rate-on-read: canonical scale-3 "X.XXX" / "" so dirty-checks compare stable
    // strings (no trailing-zero false-dirty), mirroring the money-on-read step.
    taxRate: template.taxRate == null ? "" : normalizeTaxRate(template.taxRate.toString()),
    propertyId: template.propertyId,
    propertyName: template.property?.name ?? "",
    entityId: template.property?.entity?.id ?? null,
    entityName: template.property?.entity?.entity ?? null,
    jobTypeId: template.jobTypeId,
    jobTypeName: template.jobType?.name ?? null,
    warehouseId: template.warehouseId,
    warehouseName: template.warehouse?.name ?? "",
    plannedProductsCount: template._count.plannedProducts,
    createdAt: toIsoTimestamp(template.createdAt),
    updatedAt: toIsoTimestamp(template.updatedAt),
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
  const serviceItems: TemplateServiceItemRow[] = template.serviceItems.map(normalizeTemplateServiceItem)
  const plannedPayments: TemplatePlannedPaymentRow[] = template.plannedPayments.map(normalizeTemplatePlannedPayment)
  const entityInvolvements: TemplateEntityInvolvementRow[] = template.entityInvolvements.map(
    normalizeTemplateEntityInvolvement,
  )
  const commissions: TemplateCommissionRow[] = template.commissions.map(normalizeTemplateCommission)
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
    serviceItems,
    plannedPayments,
    entityInvolvements,
    commissions,
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
