import { buildProductName } from "@/features/flooring/products/services"

export type PricingLine = {
  quantity: number
  unitPrice: number
}

export function buildPadLabel(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Pad Product"
}

export function calculateTemplateTotal(input: {
  items: PricingLine[]
  serviceItems: PricingLine[]
}) {
  const materialTotal = input.items.reduce((total, line) => total + line.quantity * line.unitPrice, 0)
  const serviceTotal = input.serviceItems.reduce((total, line) => total + line.quantity * line.unitPrice, 0)

  return {
    materialTotal,
    serviceTotal,
    total: materialTotal + serviceTotal,
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
  padProduct: { id: string; manufacturerName: string | null; style: string | null; color: string | null } | null
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

export function normalizeTemplateItem(item: {
  id: string
  productId: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
  createdAt: Date
  product: {
    manufacturerName: string | null
    style: string | null
    color: string | null
    category: { sendUnit: { name: string } | null }
  }
}) {
  return {
    id: item.id,
    productId: item.productId,
    productName: buildProductName(item.product),
    sendUnit: item.product.category.sendUnit?.name ?? "",
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    notes: item.notes ?? "",
    createdAt: item.createdAt.toISOString(),
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
  }
}
