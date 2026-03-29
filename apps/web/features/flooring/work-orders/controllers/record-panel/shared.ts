"use client"

import type { EditableMaterialItem } from "@/features/flooring/shared/line-items/material-items-editor"
import type { EditableServiceItem } from "@/features/flooring/shared/line-items/service-items-editor"
import type {
  DraftWorkOrder,
  WorkOrderDetail,
  WorkOrderItemAllocationRow,
  WorkOrderMaterialItem,
} from "@/features/flooring/work-orders/types"

export type MaterialSectionDraftState = WorkOrderMaterialItem[]
export type ServiceSectionDraftState = EditableServiceItem[]
export type SalesRepSectionDraftState = WorkOrderDetail["salesReps"]

export function createLocalRowId(scope: string) {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return `temp:${scope}:${randomId}`
}

export function isLocalOnlyRow(id: string) {
  return id.startsWith("temp:")
}

export function cloneDraftWorkOrder(draft: DraftWorkOrder): DraftWorkOrder {
  return { ...draft }
}

function normalizeComparableText(value: string | null | undefined) {
  return value ?? ""
}

function normalizeComparableDecimal(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""
  if (!normalized) {
    return ""
  }

  const asNumber = Number(normalized)
  return Number.isFinite(asNumber) ? String(asNumber) : normalized
}

function buildComparableDraftWorkOrderFingerprint(draft: DraftWorkOrder) {
  return [
    draft.propertyId,
    draft.templateId,
    draft.warehouseId,
    draft.status,
    draft.isComplete ? "true" : "false",
    draft.vacancy,
    draft.date,
    draft.unitText,
    draft.customAddress,
    draft.instructions,
    draft.notes,
    draft.workOrderImageUrl,
  ].join("|")
}

function buildComparableServiceItemFingerprint(item: EditableServiceItem) {
  return [
    item.id,
    item.serviceId,
    normalizeComparableText(item.name),
    item.unitId,
    normalizeComparableDecimal(item.quantity),
    normalizeComparableDecimal(item.unitPrice),
    normalizeComparableText(item.notes),
  ].join("|")
}

function buildComparableSalesRepFingerprint(item: WorkOrderDetail["salesReps"][number]) {
  return [
    item.id,
    item.contactId,
    normalizeComparableDecimal(item.percent),
  ].join("|")
}

function buildComparableAllocationFingerprint(allocation: WorkOrderItemAllocationRow) {
  return [
    allocation.id,
    allocation.inventoryId,
    normalizeComparableDecimal(allocation.quantity),
    normalizeComparableText(allocation.cutSize),
    normalizeComparableText(allocation.notes),
  ].join("|")
}

function buildComparableMaterialItemFingerprint(item: WorkOrderMaterialItem) {
  return [
    item.id,
    item.productId,
    normalizeComparableDecimal(item.quantity),
    normalizeComparableDecimal(item.unitPrice),
    normalizeComparableText(item.notes),
    item.allocations.map(buildComparableAllocationFingerprint).join("||"),
  ].join("|")
}

export function areWorkOrderDraftsEqual(left: DraftWorkOrder, right: DraftWorkOrder) {
  return buildComparableDraftWorkOrderFingerprint(left) === buildComparableDraftWorkOrderFingerprint(right)
}

export function cloneServiceItems(items: EditableServiceItem[]) {
  return items.map((item) => ({ ...item }))
}

export function areServiceItemsEqual(left: EditableServiceItem[], right: EditableServiceItem[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every(
    (item, index) => buildComparableServiceItemFingerprint(item) === buildComparableServiceItemFingerprint(right[index]),
  )
}

export function cloneSalesRepItems(items: WorkOrderDetail["salesReps"]) {
  return items.map((item) => ({ ...item }))
}

export function areSalesRepItemsEqual(left: WorkOrderDetail["salesReps"], right: WorkOrderDetail["salesReps"]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every(
    (item, index) => buildComparableSalesRepFingerprint(item) === buildComparableSalesRepFingerprint(right[index]),
  )
}

export function cloneMaterialItems(items: WorkOrderMaterialItem[]) {
  return items.map((item) => ({
    ...item,
    allocations: item.allocations.map((allocation) => ({
      ...allocation,
      inventory: { ...allocation.inventory },
    })),
  }))
}

export function areMaterialItemsEqual(left: WorkOrderMaterialItem[], right: WorkOrderMaterialItem[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every(
    (item, index) => buildComparableMaterialItemFingerprint(item) === buildComparableMaterialItemFingerprint(right[index]),
  )
}

export function toWorkOrderDraft(workOrder: WorkOrderDetail): DraftWorkOrder {
  return {
    propertyId: workOrder.propertyId,
    templateId: workOrder.templateId,
    warehouseId: workOrder.warehouseId,
    status: workOrder.status,
    isComplete: workOrder.isComplete,
    vacancy: workOrder.vacancy ?? "",
    date: workOrder.date ? workOrder.date.split("T")[0] : "",
    unitText: workOrder.unitText,
    customAddress: workOrder.customAddress,
    instructions: workOrder.instructions,
    notes: workOrder.notes,
    workOrderImageUrl: workOrder.workOrderImageUrl,
  }
}

export function selectedAddress(propertyOptions: Array<{ id: string; address: string }>, draft: DraftWorkOrder, fallbackAddress: string) {
  if (draft.customAddress.trim()) {
    return draft.customAddress
  }

  return propertyOptions.find((property) => property.id === draft.propertyId)?.address ?? fallbackAddress
}

function normalizeNumericValue(value: string) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

export function reconcileMaterialItemDraft(item: WorkOrderMaterialItem): WorkOrderMaterialItem {
  const requiredQuantity = normalizeNumericValue(item.quantity)
  const allocatedQuantity = item.allocations.reduce((total, allocation) => total + normalizeNumericValue(allocation.quantity), 0)
  const materialExpense = item.allocations.reduce(
    (total, allocation) => total + normalizeNumericValue(allocation.quantity) * normalizeNumericValue(allocation.unitCost),
    0,
  )
  const remainingQuantity = Math.max(requiredQuantity - allocatedQuantity, 0)
  const nextAllocationStatus =
    item.allocationStatus === "SHORTAGE" && allocatedQuantity < requiredQuantity
      ? "SHORTAGE"
      : allocatedQuantity <= 0
        ? "NOT_STARTED"
        : allocatedQuantity >= requiredQuantity
          ? "FULLY_ALLOCATED"
          : "PARTIALLY_ALLOCATED"

  return {
    ...item,
    allocatedQuantity,
    remainingQuantity,
    materialExpense,
    allocationStatus: nextAllocationStatus,
    isAllocationDone: nextAllocationStatus === "FULLY_ALLOCATED" || nextAllocationStatus === "SHORTAGE",
    hasAllocationShortage: nextAllocationStatus === "SHORTAGE",
  }
}

export function createEmptyServiceItem(): EditableServiceItem {
  return {
    id: createLocalRowId("service"),
    serviceId: "",
    name: "",
    unitId: "",
    unitName: "",
    quantity: "",
    unitPrice: "",
    notes: "",
    updatedAt: "",
  }
}

export function createEmptySalesRepItem(): WorkOrderDetail["salesReps"][number] {
  return {
    id: createLocalRowId("sales-rep"),
    contactId: "",
    contactName: "",
    percent: "",
    updatedAt: "",
  }
}

export function createEmptyAllocationRow(workOrderItemId: string): WorkOrderItemAllocationRow {
  return {
    id: createLocalRowId("allocation"),
    workOrderItemId,
    inventoryId: "",
    quantity: "",
    cutSize: "",
    unitCost: "0",
    totalCost: 0,
    method: "MANUAL",
    notes: "",
    createdAt: "",
    updatedAt: "",
    inventory: {
      itemNumber: "",
      dyeLot: "",
      locationCode: "",
      warehouseName: "",
      stockUnit: "",
    },
  }
}

export function createEmptyMaterialItem(): WorkOrderMaterialItem {
  const id = createLocalRowId("material")
  return {
    id,
    productId: "",
    productName: "",
    sendUnit: "",
    quantity: "",
    unitPrice: "",
    notes: "",
    updatedAt: "",
    allocations: [],
    allocatedQuantity: 0,
    remainingQuantity: 0,
    materialExpense: 0,
    hasAllocationShortage: false,
    allocationStatus: "NOT_STARTED",
    isAllocationDone: false,
    changeOrderStatus: "SUFFICIENT",
  }
}
