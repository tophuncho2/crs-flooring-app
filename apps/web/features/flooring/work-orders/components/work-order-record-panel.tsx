"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { getConflictSnapshot, withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { CenteredErrorState, CenteredLoadingState } from "@/features/dashboard/shared/feedback/feedback-states"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import {
  type EditableMaterialItem,
  type MaterialItemField,
  type MaterialItemOption,
  validateMaterialItemFields,
} from "@/features/flooring/shared/line-items/material-items-editor"
import {
  type EditableServiceItem,
  type ServiceItemField,
  type ServiceOption,
  type UnitOption,
  validateServiceItemFields,
} from "@/features/flooring/shared/line-items/service-items-editor"
import {
  type EditableSalesRepItem,
  type SalesRepField,
  type SalesRepOption,
  validateSalesRepFields,
} from "@/features/flooring/shared/line-items/sales-rep-items-editor"
import {
  clearRowFieldError,
  setRowFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"
import { buildRecordSummary } from "@/features/flooring/shared/domain/record-summary"
import { useRecordDetailController } from "@/features/dashboard/shared/record-view/client/use-record-detail-controller"
import { useRecordSectionController } from "@/features/dashboard/shared/record-view/client/use-record-section-controller"
import {
  formatRecordSectionWorkflowPhase,
  useRecordSectionWorkflow,
} from "@/features/dashboard/shared/record-view/client/use-record-section-workflow"
import {
  buildRecordSectionDraftKey,
  clearRecordSectionDraft,
  readRecordSectionDraft,
  writeRecordSectionDraft,
} from "@/features/dashboard/shared/record-view/client/record-section-drafts"
import { useRecordNotices, type RecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"
import { RecordSectionStack } from "@/features/dashboard/shared/record-view/sections/record-section-stack"
import {
  RecordSectionActionPanel,
  RecordSectionStatusBadge,
} from "@/features/dashboard/shared/record-view/sections/record-section-action-panel"
import {
  buildWorkOrderCalculationRowsFromSummary,
  normalizeWorkOrderExpenseSummary,
  type WorkOrderCalculationRow,
} from "@/features/flooring/work-orders/domain/expense-summary"
import {
  buildDeleteConfirmationMessage,
  confirmRecordDelete,
} from "@/features/flooring/shared/ui/table/confirm-delete"
import {
  MaterialAllocationsEditor,
  type AllocationField,
  validateAllocationFields,
} from "@/features/flooring/work-orders/components/material-allocations-editor"
import { WorkOrderMaterialItemsSection } from "@/features/flooring/work-orders/components/record/material-items-section"
import { WorkOrderCalculationsSection } from "@/features/flooring/work-orders/components/record/sections/work-order-calculations-section"
import { WorkOrderInvoiceSection } from "@/features/flooring/work-orders/components/record/sections/work-order-invoice-section"
import { WorkOrderPrimaryFieldsSection } from "@/features/flooring/work-orders/components/record/sections/work-order-primary-fields-section"
import { WorkOrderSalesRepsSection } from "@/features/flooring/work-orders/components/record/sections/work-order-sales-reps-section"
import { WorkOrderServiceItemsSection } from "@/features/flooring/work-orders/components/record/sections/work-order-service-items-section"
import type { WorkOrderInvoiceStatusResponse } from "@/features/flooring/work-orders/transport/invoice"
import type { WorkOrderAutoAllocationStatusResponse } from "@/features/flooring/work-orders/transport/allocations"
import type {
  DraftWorkOrder,
  InventoryAllocationOption,
  PropertyOption,
  SalesRepContactOption,
  WarehouseOption,
  WorkOrderAutoAllocationRun,
  WorkOrderDetail,
  WorkOrderExpenseSummary,
  WorkOrderItemAllocationRow,
  WorkOrderMaterialItem,
  WorkOrderReconciliationStatus,
} from "@/features/flooring/work-orders/types"

type MaterialSectionDraftState = WorkOrderMaterialItem[]
type ServiceSectionDraftState = EditableServiceItem[]
type SalesRepSectionDraftState = WorkOrderDetail["salesReps"]

function createLocalRowId(scope: string) {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return `temp:${scope}:${randomId}`
}

function isLocalOnlyRow(id: string) {
  return id.startsWith("temp:")
}

function cloneDraftWorkOrder(draft: DraftWorkOrder): DraftWorkOrder {
  return { ...draft }
}

function cloneServiceItems(items: EditableServiceItem[]) {
  return items.map((item) => ({ ...item }))
}

function cloneSalesRepItems(items: WorkOrderDetail["salesReps"]) {
  return items.map((item) => ({ ...item }))
}

function cloneMaterialItems(items: WorkOrderMaterialItem[]) {
  return items.map((item) => ({
    ...item,
    allocations: item.allocations.map((allocation) => ({
      ...allocation,
      inventory: { ...allocation.inventory },
    })),
  }))
}

function toDraft(workOrder: WorkOrderDetail): DraftWorkOrder {
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

function selectedAddress(propertyOptions: PropertyOption[], draft: DraftWorkOrder, fallbackAddress: string) {
  if (draft.customAddress.trim()) {
    return draft.customAddress
  }

  return propertyOptions.find((property) => property.id === draft.propertyId)?.address ?? fallbackAddress
}

function buildWorkOrderReconciliationKey(input: {
  updatedAt: string
  autoAllocationRun?: WorkOrderDetail["autoAllocationRun"] | WorkOrderReconciliationStatus["autoAllocationRun"]
  invoiceStatus?: WorkOrderDetail["invoiceStatus"] | WorkOrderReconciliationStatus["invoiceStatus"]
}) {
  return [
    input.updatedAt,
    input.autoAllocationRun?.id ?? "",
    input.autoAllocationRun?.sourceVersion ?? "",
    input.autoAllocationRun?.status ?? "",
    input.invoiceStatus?.sourceVersion ?? "",
    input.invoiceStatus?.generation?.id ?? "",
    input.invoiceStatus?.generation?.status ?? "",
    input.invoiceStatus?.artifact?.id ?? "",
  ].join(":")
}

function createEmptyServiceItem(): EditableServiceItem {
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

function createEmptySalesRepItem(): EditableSalesRepItem {
  return {
    id: createLocalRowId("sales-rep"),
    contactId: "",
    contactName: "",
    percent: "",
    updatedAt: "",
  }
}

function createEmptyAllocationRow(workOrderItemId: string): WorkOrderItemAllocationRow {
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

function createEmptyMaterialItem(): WorkOrderMaterialItem {
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

function normalizeNumericValue(value: string) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function reconcileMaterialItemDraft(item: WorkOrderMaterialItem): WorkOrderMaterialItem {
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

function buildPrimarySectionStatus(input: {
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
}) {
  return (
    <>
      <RecordSectionStatusBadge tone={input.isSaving ? "processing" : input.isDirty ? "warning" : "success"}>
        {input.isSaving ? "Saving" : input.isDirty ? "Dirty" : "Saved"}
      </RecordSectionStatusBadge>
      {input.hasConflict ? <RecordSectionStatusBadge tone="error">Conflict</RecordSectionStatusBadge> : null}
    </>
  )
}

function buildSectionStatus(input: {
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  workflow?: ReactNode
}) {
  return (
    <>
      <RecordSectionStatusBadge tone={input.isSaving ? "processing" : input.isDirty ? "warning" : "success"}>
        {input.isSaving ? "Saving" : input.isDirty ? "Dirty" : "Saved"}
      </RecordSectionStatusBadge>
      {input.hasConflict ? <RecordSectionStatusBadge tone="error">Conflict</RecordSectionStatusBadge> : null}
      {input.workflow}
    </>
  )
}

export function WorkOrderRecordPanel({
  currentUserId,
  workOrderId,
  initialWorkOrder,
  showPrimaryFields = true,
  propertyOptions,
  warehouseOptions,
  productOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  invoice,
  invoiceError,
  invoiceLoading = false,
  invoiceWorkflowPhase = "idle",
  onQueueInvoice,
  onOpenInvoice,
  onInvoiceSectionOpenChange,
  onClose,
  onWorkOrderChange,
  onWorkOrderSaved,
  onWorkOrderDeleted,
  onExpenseSummaryChange,
  onDirtyChange,
  onDirtySectionsChange,
  notices,
}: {
  currentUserId: string
  workOrderId: string
  initialWorkOrder: WorkOrderDetail
  showPrimaryFields?: boolean
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  invoice: WorkOrderInvoiceStatusResponse
  invoiceError?: string | null
  invoiceLoading?: boolean
  invoiceWorkflowPhase?: "idle" | "requested" | "queued" | "processing" | "completed" | "failed" | "superseded"
  onQueueInvoice: () => void
  onOpenInvoice: () => void
  onInvoiceSectionOpenChange?: (open: boolean) => void
  onClose: () => void
  onWorkOrderChange?: (workOrder: WorkOrderDetail) => void
  onWorkOrderSaved?: (workOrder: WorkOrderDetail) => void
  onWorkOrderDeleted?: (workOrderId: string) => void
  onExpenseSummaryChange?: (summary: WorkOrderExpenseSummary) => void
  onDirtyChange?: (value: boolean) => void
  onDirtySectionsChange?: (sections: string[]) => void
  notices?: RecordNotices
}) {
  const initialWorkOrderDetail = useMemo<WorkOrderDetail>(() => initialWorkOrder, [initialWorkOrder])
  const localNotices = useRecordNotices()
  const noticeController = notices ?? localNotices
  const { message, error: noticeError, showSuccess, showError, clearNotices } = noticeController
  const [remoteReconciliation, setRemoteReconciliation] = useState<WorkOrderReconciliationStatus | null>(null)
  const [materialItemErrors, setMaterialItemErrors] = useState<RowFieldErrors<MaterialItemField>>({})
  const [materialAllocationErrorsByItemId, setMaterialAllocationErrorsByItemId] = useState<
    Record<string, RowFieldErrors<AllocationField>>
  >({})
  const [serviceItemErrors, setServiceItemErrors] = useState<RowFieldErrors<ServiceItemField>>({})
  const [salesRepItemErrors, setSalesRepItemErrors] = useState<RowFieldErrors<SalesRepField>>({})
  const [expandedMaterialItemIds, setExpandedMaterialItemIds] = useState<string[]>([])
  const [allocationOptionsByItemId, setAllocationOptionsByItemId] = useState<Record<string, InventoryAllocationOption[]>>({})
  const [loadingAllocationOptionsByItemId, setLoadingAllocationOptionsByItemId] = useState<Record<string, boolean>>({})

  const {
    record: workOrder,
    loading,
    error,
    setError,
    publishRecord,
    refreshRecord,
    clearRecordCache,
  } = useRecordDetailController<WorkOrderDetail, DraftWorkOrder>({
    scope: "workOrder",
    id: workOrderId,
    initialRecord: initialWorkOrderDetail,
    toDraft,
    url: `/api/flooring/work-orders/${workOrderId}`,
    payloadKey: "workOrder",
  })

  const onExpenseSummaryChangeRef = useRef(onExpenseSummaryChange)
  const onWorkOrderChangeRef = useRef(onWorkOrderChange)
  const onWorkOrderSavedRef = useRef(onWorkOrderSaved)

  useEffect(() => {
    onExpenseSummaryChangeRef.current = onExpenseSummaryChange
  }, [onExpenseSummaryChange])

  useEffect(() => {
    onWorkOrderChangeRef.current = onWorkOrderChange
  }, [onWorkOrderChange])

  useEffect(() => {
    onWorkOrderSavedRef.current = onWorkOrderSaved
  }, [onWorkOrderSaved])

  const publishWorkOrder = useCallback(
    (nextWorkOrder: WorkOrderDetail) => {
      publishRecord(nextWorkOrder)
      onWorkOrderChangeRef.current?.(nextWorkOrder)
    },
    [publishRecord],
  )

  const refreshWorkOrderDetail = useCallback(async () => {
    const nextWorkOrder = await refreshRecord()
    setRemoteReconciliation(null)
    publishWorkOrder(nextWorkOrder)
    onExpenseSummaryChangeRef.current?.(nextWorkOrder.financialSummary)
    return nextWorkOrder
  }, [publishWorkOrder, refreshRecord])

  const applyConflictWorkOrderSnapshot = useCallback(
    (saveError: unknown) => {
      const conflictSnapshot = getConflictSnapshot<{ workOrder?: WorkOrderDetail }>(saveError)
      if (conflictSnapshot?.workOrder) {
        publishWorkOrder(conflictSnapshot.workOrder)
        return conflictSnapshot.workOrder
      }

      return null
    },
    [publishWorkOrder],
  )

  const primarySection = useRecordSectionController<DraftWorkOrder, DraftWorkOrder>({
    serverValue: toDraft(workOrder ?? initialWorkOrderDetail),
    createLocalValue: cloneDraftWorkOrder,
    onSave: async (nextDraft) => {
      const currentWorkOrder = workOrder ?? initialWorkOrderDetail
      clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(`/api/flooring/work-orders/${currentWorkOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(nextDraft, currentWorkOrder.updatedAt)),
        })
        publishWorkOrder(payload.workOrder)
        onWorkOrderSavedRef.current?.(payload.workOrder)
        showSuccess("Work order fields saved")
        return toDraft(payload.workOrder)
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save work order")
      }
    },
  })

  const serviceSection = useRecordSectionController<EditableServiceItem[], EditableServiceItem[]>({
    serverValue: workOrder?.serviceItems ?? initialWorkOrderDetail.serviceItems,
    createLocalValue: cloneServiceItems,
    onSave: async (items) => {
      const nextErrors: RowFieldErrors<ServiceItemField> = {}

      for (const item of items) {
        const rowErrors = validateServiceItemFields({
          serviceId: item.serviceId,
          name: item.name,
          unitId: item.unitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
        if (Object.keys(rowErrors).length > 0) {
          nextErrors[item.id] = rowErrors
        }
      }

      setServiceItemErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        throw new Error("Fix the highlighted service item fields before saving.")
      }

      const currentWorkOrder = workOrder ?? initialWorkOrderDetail
      clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(
          `/api/flooring/work-orders/${currentWorkOrder.id}/service-items/section`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              withMutationMeta(
                {
                  items: items.map((item) => ({
                    id: isLocalOnlyRow(item.id) ? null : item.id,
                    expectedUpdatedAt: isLocalOnlyRow(item.id) ? null : item.updatedAt,
                    item: {
                      serviceId: item.serviceId || null,
                      name: item.name || null,
                      unitId: item.unitId,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      notes: item.notes || null,
                    },
                  })),
                },
                currentWorkOrder.updatedAt,
              ),
            ),
          },
        )
        setServiceItemErrors({})
        publishWorkOrder(payload.workOrder)
        showSuccess("Service section saved")
        return payload.workOrder.serviceItems
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save service section")
      }
    },
  })

  const salesRepSection = useRecordSectionController<WorkOrderDetail["salesReps"], WorkOrderDetail["salesReps"]>({
    serverValue: workOrder?.salesReps ?? initialWorkOrderDetail.salesReps,
    createLocalValue: cloneSalesRepItems,
    onSave: async (items) => {
      const nextErrors: RowFieldErrors<SalesRepField> = {}

      for (const item of items) {
        const rowErrors = validateSalesRepFields({
          contactId: item.contactId,
          percent: item.percent,
        })
        if (Object.keys(rowErrors).length > 0) {
          nextErrors[item.id] = rowErrors
        }
      }

      setSalesRepItemErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        throw new Error("Fix the highlighted sales rep fields before saving.")
      }

      const currentWorkOrder = workOrder ?? initialWorkOrderDetail
      clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(
          `/api/flooring/work-orders/${currentWorkOrder.id}/sales-reps/section`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              withMutationMeta(
                {
                  items: items.map((item) => ({
                    id: isLocalOnlyRow(item.id) ? null : item.id,
                    expectedUpdatedAt: isLocalOnlyRow(item.id) ? null : item.updatedAt,
                    item: {
                      contactId: item.contactId,
                      percent: item.percent,
                    },
                  })),
                },
                currentWorkOrder.updatedAt,
              ),
            ),
          },
        )
        setSalesRepItemErrors({})
        publishWorkOrder(payload.workOrder)
        showSuccess("Sales rep section saved")
        return payload.workOrder.salesReps
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save sales rep section")
      }
    },
  })

  const materialSection = useRecordSectionController<WorkOrderMaterialItem[], WorkOrderMaterialItem[]>({
    serverValue: workOrder?.items ?? initialWorkOrderDetail.items,
    createLocalValue: cloneMaterialItems,
    onSave: async (items) => {
      const nextItemErrors: RowFieldErrors<MaterialItemField> = {}
      const nextAllocationErrors: Record<string, RowFieldErrors<AllocationField>> = {}

      for (const item of items) {
        const rowErrors = validateMaterialItemFields({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
        if (Object.keys(rowErrors).length > 0) {
          nextItemErrors[item.id] = rowErrors
        }

        const allocationErrors: RowFieldErrors<AllocationField> = {}
        for (const allocation of item.allocations) {
          const rowAllocationErrors = validateAllocationFields({
            inventoryId: allocation.inventoryId,
            quantity: allocation.quantity,
          })
          if (Object.keys(rowAllocationErrors).length > 0) {
            allocationErrors[allocation.id] = rowAllocationErrors
          }
        }

        if (Object.keys(allocationErrors).length > 0) {
          nextAllocationErrors[item.id] = allocationErrors
        }
      }

      setMaterialItemErrors(nextItemErrors)
      setMaterialAllocationErrorsByItemId(nextAllocationErrors)

      if (Object.keys(nextItemErrors).length > 0 || Object.keys(nextAllocationErrors).length > 0) {
        throw new Error("Fix the highlighted material item and allocation fields before saving.")
      }

      const currentWorkOrder = workOrder ?? initialWorkOrderDetail
      clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(
          `/api/flooring/work-orders/${currentWorkOrder.id}/items/section`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              withMutationMeta(
                {
                  items: items.map((item) => ({
                    id: isLocalOnlyRow(item.id) ? null : item.id,
                    expectedUpdatedAt: isLocalOnlyRow(item.id) ? null : item.updatedAt,
                    item: {
                      productId: item.productId,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      notes: item.notes || null,
                    },
                    allocations: item.allocations.map((allocation) => ({
                      id: isLocalOnlyRow(allocation.id) ? null : allocation.id,
                      expectedUpdatedAt: isLocalOnlyRow(allocation.id) ? null : allocation.updatedAt,
                      input: {
                        inventoryId: allocation.inventoryId,
                        quantity: allocation.quantity,
                        cutSize: allocation.cutSize || null,
                        notes: allocation.notes || null,
                      },
                    })),
                  })),
                },
                currentWorkOrder.updatedAt,
              ),
            ),
          },
        )
        setMaterialItemErrors({})
        setMaterialAllocationErrorsByItemId({})
        publishWorkOrder(payload.workOrder)
        showSuccess("Material section saved")
        return payload.workOrder.items
      } catch (saveError) {
        applyConflictWorkOrderSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save material section")
      }
    },
  })

  const autoAllocationWorkflow = useRecordSectionWorkflow<WorkOrderAutoAllocationRun | null>({
    value: workOrder?.autoAllocationRun ?? initialWorkOrderDetail.autoAllocationRun ?? null,
    getSyncKey: (value) => (value ? `${value.id}:${value.status}:${value.sourceVersion}` : "none"),
    readStatus: (value) => value?.status,
    refresh: async () => {
      const payload = await requestJson<WorkOrderAutoAllocationStatusResponse>(
        `/api/flooring/work-orders/${workOrderId}/auto-allocation`,
        { cache: "no-store" },
      )
      return payload.run
    },
    getTerminalKey: (value) => (value ? `${value.id}:${value.status}` : null),
    onTerminal: async (value) => {
      if (!value) {
        return
      }

      if (value.status === "COMPLETED") {
        await refreshWorkOrderDetail()
        showSuccess("Auto allocation completed")
      }

      if (value.status === "FAILED") {
        showError(value.failureMessage || "Auto allocation failed")
      }

      if (value.status === "SUPERSEDED") {
        showError("Auto allocation was superseded by a newer work order version")
      }
    },
  })

  const sectionDraftKeys = useMemo(
    () => ({
      primary: buildRecordSectionDraftKey({ userId: currentUserId, recordId: workOrderId, section: "primary" }),
      material: buildRecordSectionDraftKey({ userId: currentUserId, recordId: workOrderId, section: "material" }),
      service: buildRecordSectionDraftKey({ userId: currentUserId, recordId: workOrderId, section: "service" }),
      sales: buildRecordSectionDraftKey({ userId: currentUserId, recordId: workOrderId, section: "sales" }),
    }),
    [currentUserId, workOrderId],
  )
  const hasRestoredSectionDraftsRef = useRef(false)

  useEffect(() => {
    if (hasRestoredSectionDraftsRef.current) {
      return
    }

    hasRestoredSectionDraftsRef.current = true

    const primaryDraft = readRecordSectionDraft<DraftWorkOrder>(sectionDraftKeys.primary)
    if (primaryDraft) {
      primarySection.setLocalValue(primaryDraft)
    }

    const materialDraftState = readRecordSectionDraft<MaterialSectionDraftState>(sectionDraftKeys.material)
    if (materialDraftState) {
      materialSection.setLocalValue(cloneMaterialItems(materialDraftState))
    }

    const serviceDraftState = readRecordSectionDraft<ServiceSectionDraftState>(sectionDraftKeys.service)
    if (serviceDraftState) {
      serviceSection.setLocalValue(cloneServiceItems(serviceDraftState))
    }

    const salesDraftState = readRecordSectionDraft<SalesRepSectionDraftState>(sectionDraftKeys.sales)
    if (salesDraftState) {
      salesRepSection.setLocalValue(cloneSalesRepItems(salesDraftState))
    }
  }, [materialSection, primarySection, salesRepSection, sectionDraftKeys, serviceSection])

  useEffect(() => {
    if (primarySection.isDirty) {
      writeRecordSectionDraft(sectionDraftKeys.primary, primarySection.localValue)
      return
    }

    clearRecordSectionDraft(sectionDraftKeys.primary)
  }, [primarySection.isDirty, primarySection.localValue, sectionDraftKeys.primary])

  useEffect(() => {
    if (materialSection.isDirty) {
      writeRecordSectionDraft(sectionDraftKeys.material, materialSection.localValue)
      return
    }

    clearRecordSectionDraft(sectionDraftKeys.material)
  }, [materialSection.isDirty, materialSection.localValue, sectionDraftKeys.material])

  useEffect(() => {
    if (serviceSection.isDirty) {
      writeRecordSectionDraft(sectionDraftKeys.service, serviceSection.localValue)
      return
    }

    clearRecordSectionDraft(sectionDraftKeys.service)
  }, [serviceSection.isDirty, serviceSection.localValue, sectionDraftKeys.service])

  useEffect(() => {
    if (salesRepSection.isDirty) {
      writeRecordSectionDraft(sectionDraftKeys.sales, salesRepSection.localValue)
      return
    }

    clearRecordSectionDraft(sectionDraftKeys.sales)
  }, [salesRepSection.isDirty, salesRepSection.localValue, sectionDraftKeys.sales])

  const dirtySections = useMemo(
    () =>
      [
        primarySection.isDirty ? "Work Order" : null,
        materialSection.isDirty ? "Material Items" : null,
        serviceSection.isDirty ? "Service Items" : null,
        salesRepSection.isDirty ? "Sales Reps" : null,
      ].filter(Boolean) as string[],
    [materialSection.isDirty, primarySection.isDirty, salesRepSection.isDirty, serviceSection.isDirty],
  )

  useEffect(() => {
    onDirtyChange?.(dirtySections.length > 0)
    onDirtySectionsChange?.(dirtySections)
  }, [dirtySections, onDirtyChange, onDirtySectionsChange])

  useEffect(() => {
    let cancelled = false

    async function refreshReconciliation() {
      try {
        const payload = await requestJson<{ workOrder: WorkOrderReconciliationStatus }>(
          `/api/flooring/work-orders/${workOrderId}/reconciliation`,
          { cache: "no-store" },
        )
        if (cancelled) {
          return
        }

        const nextReconciliation = payload.workOrder
        const currentKey = buildWorkOrderReconciliationKey({
          updatedAt: workOrder?.updatedAt ?? initialWorkOrderDetail.updatedAt,
          autoAllocationRun: workOrder?.autoAllocationRun ?? initialWorkOrderDetail.autoAllocationRun,
          invoiceStatus: workOrder?.invoiceStatus ?? invoice,
        })
        const nextKey = buildWorkOrderReconciliationKey(nextReconciliation)

        if (currentKey === nextKey) {
          setRemoteReconciliation(null)
          return
        }

        if (dirtySections.length === 0) {
          setRemoteReconciliation(null)
          await refreshWorkOrderDetail()
          return
        }

        setRemoteReconciliation(nextReconciliation)
      } catch {
        // Reconciliation polling is advisory.
      }
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return
      }

      void refreshReconciliation()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [
    dirtySections.length,
    initialWorkOrderDetail.autoAllocationRun,
    initialWorkOrderDetail.updatedAt,
    invoice,
    refreshWorkOrderDetail,
    workOrder?.autoAllocationRun,
    workOrder?.invoiceStatus,
    workOrder?.updatedAt,
    workOrderId,
  ])

  const currentExpenseSummary = useMemo(
    () =>
      normalizeWorkOrderExpenseSummary({
        items: materialSection.localValue,
        serviceItems: serviceSection.localValue,
        salesReps: salesRepSection.localValue,
      }),
    [materialSection.localValue, salesRepSection.localValue, serviceSection.localValue],
  )

  useEffect(() => {
    onExpenseSummaryChangeRef.current?.(currentExpenseSummary)
  }, [currentExpenseSummary])

  const currentCalculationRows = useMemo<WorkOrderCalculationRow[]>(
    () => buildWorkOrderCalculationRowsFromSummary(currentExpenseSummary),
    [currentExpenseSummary],
  )

  const currentSummary = useMemo(
    () =>
      buildRecordSummary({
        materialItems: materialSection.localValue,
        serviceItems: serviceSection.localValue,
      }),
    [materialSection.localValue, serviceSection.localValue],
  )

  const loadAllocationOptions = useCallback(
    async (itemId: string, productId: string) => {
      if (!productId) {
        setAllocationOptionsByItemId((previous) => ({ ...previous, [itemId]: [] }))
        return []
      }

      setLoadingAllocationOptionsByItemId((previous) => ({ ...previous, [itemId]: true }))
      try {
        const payload = await requestJson<{ options: InventoryAllocationOption[] }>(
          `/api/flooring/work-orders/${workOrderId}/allocation-options?productId=${productId}`,
          { cache: "no-store" },
        )
        setAllocationOptionsByItemId((previous) => ({ ...previous, [itemId]: payload.options }))
        return payload.options
      } finally {
        setLoadingAllocationOptionsByItemId((previous) => ({ ...previous, [itemId]: false }))
      }
    },
    [workOrderId],
  )

  const handleToggleExpandedMaterialItem = useCallback(
    (itemId: string) => {
      setExpandedMaterialItemIds((previous) => {
        const isExpanded = previous.includes(itemId)
        if (isExpanded) {
          return previous.filter((value) => value !== itemId)
        }

        const item = materialSection.localValue.find((value) => value.id === itemId)
        if (item?.productId) {
          void loadAllocationOptions(itemId, item.productId)
        }

        return [...previous, itemId]
      })
    },
    [loadAllocationOptions, materialSection.localValue],
  )

  function handleAddServiceItem() {
    serviceSection.setLocalValue((previous) => [...previous, createEmptyServiceItem()])
  }

  function handleAddSalesRepItem() {
    salesRepSection.setLocalValue((previous) => [...previous, createEmptySalesRepItem()])
  }

  function handleAddMaterialItem() {
    const nextItem = createEmptyMaterialItem()
    materialSection.setLocalValue((previous) => [...previous, nextItem])
    setExpandedMaterialItemIds((previous) => (previous.includes(nextItem.id) ? previous : [...previous, nextItem.id]))
  }

  function handleServiceItemFieldChange(itemId: string, field: keyof EditableServiceItem, value: string) {
    serviceSection.setLocalValue((previous) =>
      previous.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    )

    if (field === "name" || field === "unitId" || field === "quantity" || field === "unitPrice") {
      setServiceItemErrors((previous) => clearRowFieldError(previous, itemId, field))
    }
  }

  function handleSalesRepFieldChange(itemId: string, field: keyof EditableSalesRepItem, value: string) {
    salesRepSection.setLocalValue((previous) =>
      previous.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    )

    if (field === "contactId" || field === "percent") {
      setSalesRepItemErrors((previous) => clearRowFieldError(previous, itemId, field))
    }
  }

  function handleMaterialItemFieldChange(itemId: string, field: keyof EditableMaterialItem, value: string) {
    materialSection.setLocalValue((previous) =>
      previous.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        if (field === "productId") {
          const selectedProduct = productOptions.find((product) => product.id === value)
          setAllocationOptionsByItemId((current) => ({ ...current, [itemId]: [] }))
          setMaterialAllocationErrorsByItemId((current) => {
            const next = { ...current }
            delete next[itemId]
            return next
          })
          return reconcileMaterialItemDraft({
            ...item,
            productId: value,
            productName: selectedProduct?.label ?? "",
            sendUnit: selectedProduct?.sendUnit ?? "",
            allocations: [],
          })
        }

        return reconcileMaterialItemDraft({
          ...item,
          [field]: value,
        })
      }),
    )

    if (field === "productId" || field === "quantity" || field === "unitPrice") {
      setMaterialItemErrors((previous) => clearRowFieldError(previous, itemId, field))
    }
  }

  async function handleAddAllocation(itemId: string) {
    const item = materialSection.localValue.find((value) => value.id === itemId)
    if (!item) {
      return
    }

    if (!item.productId) {
      showError("Select a product before adding allocations.")
      return
    }

    await loadAllocationOptions(item.id, item.productId)
    materialSection.setLocalValue((previous) =>
      previous.map((value) =>
        value.id === itemId
          ? reconcileMaterialItemDraft({
              ...value,
              allocations: [...value.allocations, createEmptyAllocationRow(itemId)],
            })
          : value,
      ),
    )
  }

  function handleAllocationFieldChange(itemId: string, allocationId: string, field: keyof WorkOrderItemAllocationRow, value: string) {
    const options = allocationOptionsByItemId[itemId] ?? []

    materialSection.setLocalValue((previous) =>
      previous.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        const allocations = item.allocations.map((allocation) => {
          if (allocation.id !== allocationId) {
            return allocation
          }

          if (field === "inventoryId") {
            const selectedOption = options.find((option) => option.id === value)
            return {
              ...allocation,
              inventoryId: value,
              unitCost: String(selectedOption?.pricePerUnit ?? allocation.unitCost),
              inventory: {
                itemNumber: selectedOption?.itemNumber ?? "",
                dyeLot: selectedOption?.dyeLot ?? "",
                locationCode: selectedOption?.locationCode ?? "",
                warehouseName: selectedOption?.warehouseName ?? "",
                stockUnit: selectedOption?.stockUnit ?? "",
              },
            }
          }

          return {
            ...allocation,
            [field]: value,
          }
        })

        return reconcileMaterialItemDraft({
          ...item,
          allocations,
        })
      }),
    )

    if (field === "inventoryId" || field === "quantity") {
      setMaterialAllocationErrorsByItemId((previous) => ({
        ...previous,
        [itemId]: clearRowFieldError(previous[itemId] ?? {}, allocationId, field),
      }))
    }
  }

  function handleDeleteServiceItem(itemId: string) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("service item"))) {
      return
    }

    serviceSection.setLocalValue((previous) => previous.filter((item) => item.id !== itemId))
    setServiceItemErrors((previous) => {
      const next = { ...previous }
      delete next[itemId]
      return next
    })
  }

  function handleDeleteSalesRepItem(itemId: string) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("sales rep"))) {
      return
    }

    salesRepSection.setLocalValue((previous) => previous.filter((item) => item.id !== itemId))
    setSalesRepItemErrors((previous) => {
      const next = { ...previous }
      delete next[itemId]
      return next
    })
  }

  function handleDeleteMaterialItem(itemId: string) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage("material item"))) {
      return
    }

    materialSection.setLocalValue((previous) => previous.filter((item) => item.id !== itemId))
    setMaterialItemErrors((previous) => {
      const next = { ...previous }
      delete next[itemId]
      return next
    })
    setMaterialAllocationErrorsByItemId((previous) => {
      const next = { ...previous }
      delete next[itemId]
      return next
    })
    setAllocationOptionsByItemId((previous) => {
      const next = { ...previous }
      delete next[itemId]
      return next
    })
    setExpandedMaterialItemIds((previous) => previous.filter((value) => value !== itemId))
  }

  function handleDeleteAllocation(itemId: string, allocationId: string) {
    materialSection.setLocalValue((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? reconcileMaterialItemDraft({
              ...item,
              allocations: item.allocations.filter((allocation) => allocation.id !== allocationId),
            })
          : item,
      ),
    )

    setMaterialAllocationErrorsByItemId((previous) => ({
      ...previous,
      [itemId]: setRowFieldErrors(previous[itemId] ?? {}, allocationId, {}),
    }))
  }

  async function requestAutoAllocation() {
    const currentWorkOrder = workOrder ?? initialWorkOrderDetail
    clearNotices()

    try {
      const payload = await requestJson<WorkOrderAutoAllocationStatusResponse>(
        `/api/flooring/work-orders/${currentWorkOrder.id}/auto-allocation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta({}, currentWorkOrder.updatedAt)),
        },
      )
      autoAllocationWorkflow.setValue(payload.run)
      showSuccess("Auto allocation requested")
    } catch (allocationError) {
      applyConflictWorkOrderSnapshot(allocationError)
      showError(allocationError instanceof Error ? allocationError.message : "Failed to request auto allocation")
    }
  }

  async function deleteWorkOrder() {
    const currentWorkOrder = workOrder ?? initialWorkOrderDetail
    setError("")
    clearNotices()

    try {
      await requestJson(`/api/flooring/work-orders/${currentWorkOrder.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, currentWorkOrder.updatedAt)),
      })
      clearRecordCache()
      onWorkOrderDeleted?.(currentWorkOrder.id)
      onClose()
    } catch (deleteError) {
      showError(deleteError instanceof Error ? deleteError.message : "Failed to delete work order")
    }
  }

  if (loading && !workOrder) {
    return <CenteredLoadingState label="Loading work order..." />
  }

  if (error && !workOrder) {
    return <CenteredErrorState title="Error" message={error} onDismiss={onClose} />
  }

  if (!workOrder) {
    return <CenteredErrorState title="Error" message="Work order could not be loaded." onDismiss={onClose} />
  }

  return (
    <div className="space-y-6">
      <FormStatusNotices message={message} error={noticeError} loadingMessage="" />

      {remoteReconciliation ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="font-medium text-amber-800">This work order changed on the server while you were editing it.</div>
          <div className="mt-1 text-amber-900/80">
            Reload the latest server snapshot before saving, or keep editing and save manually after reconciling the differences.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setRemoteReconciliation(null)
                void refreshWorkOrderDetail()
              }}
              className="rounded-md border border-amber-600/40 px-3 py-2 font-medium hover:bg-amber-500/10"
            >
              Reload Latest
            </button>
            <button
              type="button"
              onClick={() => setRemoteReconciliation(null)}
              className="rounded-md border border-[var(--panel-border)] px-3 py-2 font-medium hover:bg-[var(--panel-hover)]"
            >
              Keep Editing
            </button>
          </div>
        </div>
      ) : null}

      <RecordSectionStack>
        {showPrimaryFields ? (
          <WorkOrderPrimaryFieldsSection
            draft={primarySection.localValue}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            selectedAddressValue={selectedAddress(propertyOptions, primarySection.localValue, workOrder.propertyAddress)}
            unitType={workOrder.unitType}
            setDraft={(value) => {
              primarySection.setLocalValue((previous) => {
                const nextValue =
                  typeof value === "function"
                    ? (value as (previous: DraftWorkOrder | null) => DraftWorkOrder | null)(previous)
                    : value
                return nextValue ?? previous
              })
            }}
            actionPanel={
              <RecordSectionActionPanel
                summary="Primary work order fields are section-owned. Save or discard this section independently."
                status={buildPrimarySectionStatus({
                  isDirty: primarySection.isDirty,
                  isSaving: primarySection.isSaving,
                  hasConflict: primarySection.hasConflict,
                })}
                error={primarySection.error}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => primarySection.discard()}
                      disabled={!primarySection.isDirty || primarySection.isSaving}
                      className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => void primarySection.save()}
                      disabled={!primarySection.isDirty || primarySection.isSaving}
                      className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      {primarySection.isSaving ? "Saving..." : "Save"}
                    </button>
                  </>
                }
              />
            }
          />
        ) : null}

        <div className={showPrimaryFields ? "pt-2" : undefined}>
          <WorkOrderMaterialItemsSection
            title="Material Items"
            items={materialSection.localValue}
            productOptions={productOptions}
            loading={loading}
            actionPanel={
              <RecordSectionActionPanel
                summary={`Edit material items and their nested allocations locally. Save the full section to replace server state. ${currentSummary.materialItemsCount} items, ${currentSummary.materialTotal.toFixed(2)} material total.`}
                status={buildSectionStatus({
                  isDirty: materialSection.isDirty,
                  isSaving: materialSection.isSaving,
                  hasConflict: materialSection.hasConflict,
                  workflow: (
                    <RecordSectionStatusBadge
                      tone={
                        autoAllocationWorkflow.phase === "completed"
                          ? "success"
                          : autoAllocationWorkflow.phase === "failed" || autoAllocationWorkflow.phase === "superseded"
                            ? "error"
                            : autoAllocationWorkflow.isPending
                              ? "processing"
                              : "neutral"
                      }
                    >
                      Auto Allocate: {formatRecordSectionWorkflowPhase(autoAllocationWorkflow.phase)}
                    </RecordSectionStatusBadge>
                  ),
                })}
                error={materialSection.error ?? autoAllocationWorkflow.error}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={handleAddMaterialItem}
                      className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)]"
                    >
                      Add Material Item
                    </button>
                    <button
                      type="button"
                      onClick={() => void requestAutoAllocation()}
                      disabled={autoAllocationWorkflow.isPending || materialSection.localValue.length === 0}
                      className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      {autoAllocationWorkflow.isPending ? "Auto Allocating..." : "Run Auto Allocation"}
                    </button>
                    <button
                      type="button"
                      onClick={() => materialSection.discard()}
                      disabled={!materialSection.isDirty || materialSection.isSaving}
                      className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => void materialSection.save()}
                      disabled={!materialSection.isDirty || materialSection.isSaving}
                      className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      {materialSection.isSaving ? "Saving..." : "Save"}
                    </button>
                  </>
                }
              />
            }
            itemErrors={materialItemErrors}
            expandedItemIds={expandedMaterialItemIds}
            onToggleExpandedItem={handleToggleExpandedMaterialItem}
            onItemFieldChange={handleMaterialItemFieldChange}
            onDeleteItem={handleDeleteMaterialItem}
            renderAllocationSection={(item) => (
              <MaterialAllocationsEditor
                allocations={item.allocations}
                allocationOptions={allocationOptionsByItemId[item.id] ?? []}
                loadingOptions={loadingAllocationOptionsByItemId[item.id] ?? false}
                onAddAllocation={() => void handleAddAllocation(item.id)}
                itemErrors={materialAllocationErrorsByItemId[item.id] ?? {}}
                onAllocationFieldChange={(allocationId, field, value) =>
                  handleAllocationFieldChange(item.id, allocationId, field, value)
                }
                onDeleteAllocation={(allocationId) => handleDeleteAllocation(item.id, allocationId)}
              />
            )}
          />
        </div>

        <WorkOrderServiceItemsSection
          title="Service Items"
          items={serviceSection.localValue}
          serviceOptions={serviceOptions}
          unitOptions={unitOptions}
          totalAmount={currentSummary.serviceTotal}
          loading={loading}
          actionPanel={
            <RecordSectionActionPanel
              summary="Service items are edited locally and saved as one authoritative section."
              status={buildSectionStatus({
                isDirty: serviceSection.isDirty,
                isSaving: serviceSection.isSaving,
                hasConflict: serviceSection.hasConflict,
              })}
              error={serviceSection.error}
              actions={
                <>
                  <button
                    type="button"
                    onClick={handleAddServiceItem}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)]"
                  >
                    Add Service Item
                  </button>
                  <button
                    type="button"
                    onClick={() => serviceSection.discard()}
                    disabled={!serviceSection.isDirty || serviceSection.isSaving}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void serviceSection.save()}
                    disabled={!serviceSection.isDirty || serviceSection.isSaving}
                    className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    {serviceSection.isSaving ? "Saving..." : "Save"}
                  </button>
                </>
              }
            />
          }
          itemErrors={serviceItemErrors}
          onItemFieldChange={handleServiceItemFieldChange}
          onDeleteItem={handleDeleteServiceItem}
        />

        <WorkOrderSalesRepsSection
          title="Sales Reps"
          items={salesRepSection.localValue}
          salesRepOptions={salesRepOptions as SalesRepOption[]}
          customerCost={currentExpenseSummary.customerCost}
          totalAmount={currentExpenseSummary.salesRepExpense}
          loading={loading}
          actionPanel={
            <RecordSectionActionPanel
              summary="Sales reps are edited locally and saved as one authoritative section."
              status={buildSectionStatus({
                isDirty: salesRepSection.isDirty,
                isSaving: salesRepSection.isSaving,
                hasConflict: salesRepSection.hasConflict,
              })}
              error={salesRepSection.error}
              actions={
                <>
                  <button
                    type="button"
                    onClick={handleAddSalesRepItem}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)]"
                  >
                    Add Sales Rep
                  </button>
                  <button
                    type="button"
                    onClick={() => salesRepSection.discard()}
                    disabled={!salesRepSection.isDirty || salesRepSection.isSaving}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void salesRepSection.save()}
                    disabled={!salesRepSection.isDirty || salesRepSection.isSaving}
                    className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    {salesRepSection.isSaving ? "Saving..." : "Save"}
                  </button>
                </>
              }
            />
          }
          itemErrors={salesRepItemErrors}
          onItemFieldChange={handleSalesRepFieldChange}
          onDeleteItem={handleDeleteSalesRepItem}
        />

        <WorkOrderCalculationsSection title="Calculations" items={currentCalculationRows} loading={false} />

        <WorkOrderInvoiceSection
          invoice={invoice}
          error={invoiceError}
          isLoading={invoiceLoading}
          workflowPhase={invoiceWorkflowPhase}
          onQueueInvoice={onQueueInvoice}
          onOpenInvoice={onOpenInvoice}
          onOpenChange={onInvoiceSectionOpenChange}
        />
      </RecordSectionStack>

      <RecordPanelFooter
        deleteLabel="Delete Work Order"
        deleteConfirmMessage="Delete this work order? This cannot be undone."
        onDelete={() => void deleteWorkOrder()}
        onClose={onClose}
        saveLabel="Save Primary Fields"
        savingLabel="Saving..."
        onSave={() => void primarySection.save()}
        isSaving={primarySection.isSaving}
      />
    </div>
  )
}
