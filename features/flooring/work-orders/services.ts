import { buildProductName } from "@/features/flooring/products/services"
import type { PricingLine } from "@/features/flooring/templates/services"

export const workOrderStatuses = new Set([
  "DRAFT",
  "BUILDING_ORDER",
  "PENDING_EXPORT",
  "CARPET_CLEANING",
  "SENT_OUT",
  "COMPLETE",
  "PENDING",
  "PULL_TEMPLATE",
  "MODIFY",
])

export const vacancyStatuses = new Set(["VACANT", "OCCUPIED"])

export const workOrderStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  BUILDING_ORDER: "Building Order",
  PENDING_EXPORT: "Pending Export",
  CARPET_CLEANING: "Carpet Cleaning",
  SENT_OUT: "Sent Out",
  COMPLETE: "Complete",
  PENDING: "Pending Export",
  PULL_TEMPLATE: "Pending Export",
  MODIFY: "Complete",
}

export function normalizeWorkOrderAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

export function calculateWorkOrderTotal(input: {
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

export function normalizeWorkOrder(workOrder: {
  id: string
  propertyId: string
  property: { id: string; name: string; streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null }
  warehouse: { id: string; name: string } | null
  status: string
  vacancy: "VACANT" | "OCCUPIED" | null
  scheduledFor: Date | null
  unitLabel: string | null
  unitNumber: number | null
  unitType: string | null
  customAddress: string | null
  instructions: string | null
  notes: string | null
  googleDriveSlip: string | null
  googleDocUrl: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { items: number; serviceItems: number }
  analytics?: {
    totalMaterialCost: { toString(): string }
    totalServiceCost: { toString(): string }
    totalCost: { toString(): string }
  } | null
}) {
  return {
    id: workOrder.id,
    propertyId: workOrder.propertyId,
    propertyName: workOrder.property.name,
    propertyAddress: normalizeWorkOrderAddress(workOrder.property),
    warehouseId: workOrder.warehouse?.id ?? "",
    warehouseName: workOrder.warehouse?.name ?? "",
    status: workOrder.status,
    statusLabel: workOrderStatusLabels[workOrder.status] ?? workOrder.status,
    vacancy: workOrder.vacancy,
    date: workOrder.scheduledFor?.toISOString() ?? null,
    unitText: workOrder.unitLabel ?? "",
    unitNumber: workOrder.unitNumber === null ? "" : String(workOrder.unitNumber),
    unitType: workOrder.unitType ?? "",
    customAddress: workOrder.customAddress ?? "",
    instructions: workOrder.instructions ?? "",
    notes: workOrder.notes ?? "",
    workOrderImageUrl: workOrder.googleDriveSlip ?? "",
    unitDoc: workOrder.googleDocUrl ?? "",
    itemsCount: workOrder._count ? workOrder._count.items + workOrder._count.serviceItems : undefined,
    totalMaterialCost: workOrder.analytics?.totalMaterialCost.toString() ?? "0",
    totalServiceCost: workOrder.analytics?.totalServiceCost.toString() ?? "0",
    totalCost: workOrder.analytics?.totalCost.toString() ?? "0",
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  }
}

export function normalizeWorkOrderItem(item: {
  id: string
  productId: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
  linkedInventoryId: string | null
  changeOrderStatus: "SUFFICIENT" | "SHORTAGE" | null
  product: {
    manufacturerName: string | null
    style: string | null
    color: string | null
    category: { sendUnit: { name: string } | null }
  }
  linkedInventory: {
    itemNumber: string
    dyeLot: string
    location: { locationCode: string; warehouse: { name: string } }
  } | null
}) {
  return {
    id: item.id,
    productId: item.productId,
    productName: buildProductName(item.product),
    sendUnit: item.product.category.sendUnit?.name ?? "",
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    notes: item.notes ?? "",
    linkedInventoryId: item.linkedInventoryId ?? "",
    linkedInventoryLabel: item.linkedInventory
      ? `${item.linkedInventory.location.warehouse.name} / ${item.linkedInventory.location.locationCode} / Item ${item.linkedInventory.itemNumber}${item.linkedInventory.dyeLot ? ` / Dye ${item.linkedInventory.dyeLot}` : ""}`
      : "",
    changeOrderStatus: item.changeOrderStatus ?? "SUFFICIENT",
  }
}

export function normalizeWorkOrderServiceItem(item: {
  id: string
  serviceId: string | null
  name: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
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
  }
}
