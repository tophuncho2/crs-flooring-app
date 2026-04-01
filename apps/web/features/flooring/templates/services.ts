import { buildFlooringProductDisplayName, buildPadProductDisplayName, buildRecordSummary, type LineTotalInput } from "@builders/domain"
import { normalizeTemplateExpenseSummary } from "./domain/expense-summary"
import { normalizeTemplateSalesRep } from "./domain/sales-reps"

export type PricingLine = {
  quantity: number
  unitPrice: number
}

export function buildPadLabel(product: {
  name?: string | null
  categoryName?: string | null
  style: string | null
  color: string | null
}) {
  return buildPadProductDisplayName(product)
}

export function calculateTemplateTotal(input: {
  items: PricingLine[]
  serviceItems: PricingLine[]
}) {
  const summary = buildRecordSummary({
    materialItems: input.items,
    serviceItems: input.serviceItems,
  })

  return {
    materialTotal: summary.materialTotal,
    serviceTotal: summary.serviceTotal,
    total: summary.grandTotal,
  }
}

export function snapshotTemplateLinesToWorkOrderLines<T extends PricingLine>(lines: T[]) {
  return lines.map((line) => ({
    ...line,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }))
}

export function normalizeTemplate(template: {
  id: string
  templateNumber: string
  templateTag: string
  instructions: string | null
  templateNotes: string | null
  propertyId: string
  property: { id: string; name: string }
  warehouse: { id: string; name: string } | null
  padProduct: { id: string; name: string; style: string | null; color: string | null } | null
  createdAt: Date
  updatedAt: Date
  _count?: { items: number; serviceItems: number }
}) {
  return {
    id: template.id,
    templateNumber: template.templateNumber,
    templateTag: template.templateTag,
    propertyId: template.propertyId,
    propertyName: template.property.name,
    warehouseId: template.warehouse?.id ?? "",
    warehouseName: template.warehouse?.name ?? "",
    instructions: template.instructions ?? "",
    templateNotes: template.templateNotes ?? "",
    padProductId: template.padProduct?.id ?? "",
    padTypeLabel: template.padProduct ? buildPadLabel(template.padProduct) : "",
    itemsCount: template._count ? template._count.items + template._count.serviceItems : undefined,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }
}

export function normalizeTemplateSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
}) {
  return buildRecordSummary({
    materialItems: input.items,
    serviceItems: input.serviceItems,
  })
}

export function normalizeTemplateExpenseTotals(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
  salesReps: Array<{ percent: string | number }>
}) {
  return normalizeTemplateExpenseSummary({
    items: input.items,
    serviceItems: input.serviceItems,
    salesReps: input.salesReps,
  })
}

export function normalizeTemplateItem(item: {
  id: string
  productId: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
  createdAt: Date
  updatedAt?: Date | null
  product: {
    name: string
    style: string | null
    color: string | null
    category: { sendUnit: { name: string } | null }
  }
}) {
  return {
    id: item.id,
    productId: item.productId,
    productName: buildFlooringProductDisplayName(item.product),
    sendUnit: item.product.category.sendUnit?.name ?? "",
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    notes: item.notes ?? "",
    createdAt: item.createdAt.toISOString(),
    updatedAt: (item.updatedAt ?? item.createdAt).toISOString(),
  }
}

export function normalizeTemplateServiceItem(item: {
  id: string
  serviceId: string | null
  name: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
  createdAt: Date
  updatedAt?: Date | null
  unit: { id: string; name: string }
}) {
  return {
    id: item.id,
    serviceId: item.serviceId ?? "",
    name: item.name,
    unitId: item.unit.id,
    unitName: item.unit.name,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    notes: item.notes ?? "",
    createdAt: item.createdAt.toISOString(),
    updatedAt: (item.updatedAt ?? item.createdAt).toISOString(),
  }
}

export { normalizeTemplateSalesRep }
