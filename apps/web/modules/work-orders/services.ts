import { buildFlooringProductDisplayName, buildRecordSummary, type LineTotalInput } from "@builders/domain"
import type { PricingLine } from "@/modules/templates/services"
import {
  buildWorkOrderItemAllocationSummary,
  calculateAllocationRowTotal,
  type WorkOrderMaterialAllocationStatus,
} from "@builders/domain"
import { normalizeWorkOrderExpenseSummary } from "./domain/expense-summary"
import { normalizeWorkOrderSalesRep } from "./domain/sales-reps"
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

export function normalizeWorkOrderExpenseTotals(input: {
  items: Array<LineTotalInput & { materialExpense?: string | number | null }>
  serviceItems: LineTotalInput[]
  salesReps: Array<{ percent: string | number }>
}) {
  return normalizeWorkOrderExpenseSummary({
    items: input.items,
    serviceItems: input.serviceItems,
    salesReps: input.salesReps,
  })
}

export function normalizeWorkOrderItem(item: {
  id: string
  productId: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
  allocationStatus: WorkOrderMaterialAllocationStatus
  changeOrderStatus: "SUFFICIENT" | "SHORTAGE" | null
  updatedAt: Date
  product: {
    name: string
    style: string | null
    color: string | null
    category: { sendUnit: { name: string } | null }
  }
  allocations?: Array<{
    id: string
    workOrderItemId: string
    inventoryId: string
    quantity: { toString(): string }
    cutSize: string | null
    unitCost: { toString(): string }
    method: "MANUAL" | "AUTO"
    notes: string | null
    createdAt: Date
    updatedAt: Date
    inventory: {
      itemNumber: string
      dyeLot: string | null
      product: {
        category: {
          stockUnit: {
            name: string
          } | null
        }
      }
      location: {
        locationCode: string
        warehouse: {
          name: string
        }
      } | null
      importEntry: {
        warehouse: {
          name: string
        } | null
      } | null
    }
  }>
}, options?: {
  hasPendingAllocationRun?: boolean
  hasEligibleInventoryRemaining?: boolean
  allocationStatus?: WorkOrderMaterialAllocationStatus
  isAllocationDone?: boolean
}) {
  const allocations = (item.allocations ?? []).map((allocation) => ({
    id: allocation.id,
    workOrderItemId: allocation.workOrderItemId,
    inventoryId: allocation.inventoryId,
    quantity: allocation.quantity.toString(),
    cutSize: allocation.cutSize ?? "",
    unitCost: allocation.unitCost.toString(),
    totalCost: calculateAllocationRowTotal({
      quantity: allocation.quantity.toString(),
      unitCost: allocation.unitCost.toString(),
    }),
    method: allocation.method,
    notes: allocation.notes ?? "",
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
    inventory: {
      itemNumber: allocation.inventory.itemNumber,
      dyeLot: allocation.inventory.dyeLot ?? "",
      locationCode: allocation.inventory.location?.locationCode ?? "Unassigned",
      warehouseName:
        allocation.inventory.location?.warehouse.name ??
        allocation.inventory.importEntry?.warehouse?.name ??
        "",
      stockUnit: allocation.inventory.product.category.stockUnit?.name ?? "",
    },
  }))
  const allocationSummary = buildWorkOrderItemAllocationSummary({
    requiredQuantity: item.quantity.toString(),
    allocations: allocations.map((allocation) => ({
      quantity: allocation.quantity,
      unitCost: allocation.unitCost,
    })),
    hasPendingAllocationRun: options?.hasPendingAllocationRun,
    hasEligibleInventoryRemaining: options?.hasEligibleInventoryRemaining,
  })
  const allocationStatus = options?.allocationStatus ?? item.allocationStatus ?? allocationSummary.allocationStatus
  const isAllocationDone = options?.isAllocationDone ?? allocationSummary.isDone
  const changeOrderStatus: "SUFFICIENT" | "SHORTAGE" =
    allocationStatus === "SHORTAGE" ? "SHORTAGE" : "SUFFICIENT"

  return {
    id: item.id,
    productId: item.productId,
    productName: buildFlooringProductDisplayName(item.product),
    sendUnit: item.product.category.sendUnit?.name ?? "",
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    notes: item.notes ?? "",
    updatedAt: item.updatedAt.toISOString(),
    allocations,
    allocatedQuantity: allocationSummary.allocatedQuantity,
    remainingQuantity: allocationSummary.remainingQuantity,
    materialExpense: allocationSummary.materialExpense,
    hasAllocationShortage: allocationSummary.hasAllocationShortage,
    allocationStatus,
    isAllocationDone,
    changeOrderStatus,
  }
}

export function normalizeWorkOrderServiceItem(item: {
  id: string
  serviceId: string | null
  name: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
  updatedAt: Date
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
    updatedAt: item.updatedAt.toISOString(),
  }
}

export { normalizeWorkOrderSalesRep }
