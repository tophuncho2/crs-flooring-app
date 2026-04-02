"use client"

import {
  createLocalRecordRowId,
  isLocalOnlyRecordRow,
  type RecordSectionWorkflowPhase,
} from "@/modules/shared/engines/record-view"
import type { EditableMaterialItem } from "@/modules/shared/engines/record-view/contracts/material-item-contracts"
import type { EditableServiceItem } from "@/modules/shared/engines/record-view/contracts/service-item-contracts"
import { reconcileMaterialItemDraft } from "@/modules/work-orders/domain/material-allocations"
import type {
  DraftWorkOrder,
  WorkOrderAutoAllocationRun,
  WorkOrderDetail,
  WorkOrderItemAllocationRow,
  WorkOrderMaterialItem,
} from "@/modules/work-orders/types"

export type MaterialSectionDraftState = WorkOrderMaterialItem[]
export type ServiceSectionDraftState = EditableServiceItem[]
export type SalesRepSectionDraftState = WorkOrderDetail["salesReps"]

export const createLocalRowId = createLocalRecordRowId
export const isLocalOnlyRow = isLocalOnlyRecordRow

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
    (item.allocations ?? []).map(buildComparableAllocationFingerprint).join("||"),
  ].join("|")
}

export function areWorkOrderDraftsEqual(left: DraftWorkOrder, right: DraftWorkOrder) {
  return buildComparableDraftWorkOrderFingerprint(left) === buildComparableDraftWorkOrderFingerprint(right)
}

export function cloneServiceItems(items: EditableServiceItem[]) {
  return (items ?? []).map((item) => ({ ...item }))
}

export function areServiceItemsEqual(left: EditableServiceItem[], right: EditableServiceItem[]) {
  const safeLeft = left ?? []
  const safeRight = right ?? []

  if (safeLeft.length !== safeRight.length) {
    return false
  }

  return safeLeft.every(
    (item, index) => buildComparableServiceItemFingerprint(item) === buildComparableServiceItemFingerprint(safeRight[index]),
  )
}

export function cloneSalesRepItems(items: WorkOrderDetail["salesReps"]) {
  return (items ?? []).map((item) => ({ ...item }))
}

export function areSalesRepItemsEqual(left: WorkOrderDetail["salesReps"], right: WorkOrderDetail["salesReps"]) {
  const safeLeft = left ?? []
  const safeRight = right ?? []

  if (safeLeft.length !== safeRight.length) {
    return false
  }

  return safeLeft.every(
    (item, index) => buildComparableSalesRepFingerprint(item) === buildComparableSalesRepFingerprint(safeRight[index]),
  )
}

export function cloneMaterialItems(items: WorkOrderMaterialItem[]) {
  return (items ?? []).map((item) => ({
    ...item,
    allocations: (item.allocations ?? []).map((allocation) => ({
      ...allocation,
      inventory: { ...allocation.inventory },
    })),
  }))
}

export function areMaterialItemsEqual(left: WorkOrderMaterialItem[], right: WorkOrderMaterialItem[]) {
  const safeLeft = left ?? []
  const safeRight = right ?? []

  if (safeLeft.length !== safeRight.length) {
    return false
  }

  return safeLeft.every(
    (item, index) => buildComparableMaterialItemFingerprint(item) === buildComparableMaterialItemFingerprint(safeRight[index]),
  )
}

export function isAutoAllocationRequestBlocked(
  run: WorkOrderAutoAllocationRun | null | undefined,
  currentSourceVersion: string,
) {
  if (!run) {
    return false
  }

  if (run.status === "PROCESSING") {
    return true
  }

  return (run.status === "REQUESTED" || run.status === "QUEUED") && run.sourceVersion === currentSourceVersion
}

export function buildWorkflowActionLabel(input: {
  phase: RecordSectionWorkflowPhase
  isStalled: boolean
  idleLabel: string
  requestedLabel: string
  queuedLabel: string
  processingLabel: string
  stalledLabel: string
}) {
  if (input.isStalled) {
    return input.stalledLabel
  }

  if (input.phase === "requested") {
    return input.requestedLabel
  }

  if (input.phase === "queued") {
    return input.queuedLabel
  }

  if (input.phase === "processing") {
    return input.processingLabel
  }

  return input.idleLabel
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
