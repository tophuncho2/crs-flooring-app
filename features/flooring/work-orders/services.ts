import { buildProductName } from "@/features/flooring/products/services"
import type { LineTotalInput } from "@/features/flooring/shared/line-totals"
import { buildRecordSummary } from "@/features/flooring/shared/record-summary"
import type { PricingLine } from "@/features/flooring/templates/services"
import {
  TEMPLATE_SYNC_POLICY,
  VACANCY_OPTIONS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_OPTIONS,
  getWorkOrderStatusLabel,
} from "./contracts"

export const workOrderStatuses = new Set(WORK_ORDER_STATUS_OPTIONS)
export const vacancyStatuses = new Set(VACANCY_OPTIONS)
export const workOrderStatusLabels = WORK_ORDER_STATUS_LABELS
export const templateSyncPolicy = TEMPLATE_SYNC_POLICY

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

export function normalizeWorkOrder(workOrder: {
  id: string
  workOrderNumber: string
  propertyId: string
  templateId?: string | null
  property: { id: string; name: string; streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null }
  warehouse: { id: string; name: string } | null
  status: string
  isComplete: boolean
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
  hasShortage?: boolean
}) {
  const hasShortage = workOrder.hasShortage ?? false

  return {
    id: workOrder.id,
    workOrderNumber: workOrder.workOrderNumber,
    propertyId: workOrder.propertyId,
    templateId: workOrder.templateId ?? "",
    propertyName: workOrder.property.name,
    propertyAddress: normalizeWorkOrderAddress(workOrder.property),
    warehouseId: workOrder.warehouse?.id ?? "",
    warehouseName: workOrder.warehouse?.name ?? "",
    status: workOrder.status,
    statusLabel: getWorkOrderStatusLabel({
      status: workOrder.status,
      isComplete: workOrder.isComplete,
      hasShortage,
    }),
    isComplete: workOrder.isComplete,
    hasShortage,
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
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  }
}

export function normalizeWorkOrderSummary(input: {
  items: LineTotalInput[]
  serviceItems: LineTotalInput[]
}) {
  return buildRecordSummary({
    materialItems: input.items,
    serviceItems: input.serviceItems,
  })
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
    dyeLot: string | null
    location: { locationCode: string; warehouse: { name: string } } | null
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
      ? `${item.linkedInventory.location ? `${item.linkedInventory.location.warehouse.name} / ${item.linkedInventory.location.locationCode}` : "No location"} / Item ${item.linkedInventory.itemNumber}${item.linkedInventory.dyeLot ? ` / Dye ${item.linkedInventory.dyeLot}` : ""}`
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
