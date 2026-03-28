"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { CenteredErrorState, CenteredLoadingState } from "@/features/dashboard/shared/feedback/feedback-states"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import {
  type EditableMaterialItem,
  type MaterialItemDraft,
  type MaterialItemOption,
} from "@/features/flooring/shared/line-items/material-items-editor"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"
import { buildRecordSummary } from "@/features/flooring/shared/domain/record-summary"
import {
  type EditableServiceItem,
  type ServiceItemDraft,
  type ServiceOption,
  type UnitOption,
} from "@/features/flooring/shared/line-items/service-items-editor"
import { type DisplayCalculationRow } from "@/features/flooring/shared/line-items/calculation-rows-table"
import { type SalesRepDraft } from "@/features/flooring/shared/line-items/sales-rep-items-editor"
import { useChildCollection } from "@/features/flooring/shared/controllers/record-items/use-child-collection"
import { useRecordLineItemsController } from "@/features/flooring/shared/controllers/record-items/use-record-line-items-controller"
import { useRecordSalesRepsController } from "@/features/flooring/shared/controllers/record-items/use-record-sales-reps-controller"
import { useReadOnlyChildCollection } from "@/features/flooring/shared/controllers/record-items/use-read-only-child-collection"
import { useRecordDetailController } from "@/features/dashboard/shared/record-view/client/use-record-detail-controller"
import {
  buildRecordSectionDraftKey,
  clearRecordSectionDraft,
  readRecordSectionDraft,
  writeRecordSectionDraft,
} from "@/features/dashboard/shared/record-view/client/record-section-drafts"
import { useRecordNotices, type RecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"
import { RecordSectionStack } from "@/features/dashboard/shared/record-view/sections/record-section-stack"
import { buildWorkOrderCalculationRowsFromSummary, normalizeWorkOrderExpenseSummary, type WorkOrderCalculationRow } from "@/features/flooring/work-orders/domain/expense-summary"
import { MaterialAllocationsEditor } from "@/features/flooring/work-orders/components/material-allocations-editor"
import { useRecordAllocationsController } from "@/features/flooring/work-orders/use-record-allocations-controller"
import { WorkOrderMaterialItemsSection } from "@/features/flooring/work-orders/components/record/material-items-section"
import { WorkOrderCalculationsSection } from "@/features/flooring/work-orders/components/record/sections/work-order-calculations-section"
import { WorkOrderInvoiceSection } from "@/features/flooring/work-orders/components/record/sections/work-order-invoice-section"
import { WorkOrderPrimaryFieldsSection } from "@/features/flooring/work-orders/components/record/sections/work-order-primary-fields-section"
import { WorkOrderSalesRepsSection } from "@/features/flooring/work-orders/components/record/sections/work-order-sales-reps-section"
import { WorkOrderServiceItemsSection } from "@/features/flooring/work-orders/components/record/sections/work-order-service-items-section"
import type { WorkOrderInvoiceStatusResponse } from "@/features/flooring/work-orders/transport/invoice"
import type {
  DraftWorkOrder,
  PropertyOption,
  SalesRepContactOption,
  WarehouseOption,
  WorkOrderDetail,
  WorkOrderExpenseSummary,
  WorkOrderItemAllocationRow,
  WorkOrderMaterialItem,
} from "@/features/flooring/work-orders/types"
import type { AllocationDraft } from "@/features/flooring/work-orders/components/material-allocations-editor"

const defaultMaterialDraft: MaterialItemDraft = {
  productId: "",
  quantity: "",
  unitPrice: "",
  notes: "",
}

const defaultServiceDraft: ServiceItemDraft = {
  serviceId: "",
  name: "",
  unitId: "",
  quantity: "",
  unitPrice: "",
  notes: "",
}

const defaultSalesRepDraft: SalesRepDraft = {
  contactId: "",
  percent: "",
}

type MaterialSectionDraftState = {
  items: WorkOrderMaterialItem[]
  draft: MaterialItemDraft
  allocationDraftsByItemId: Record<string, AllocationDraft>
}

type ServiceSectionDraftState = {
  items: EditableServiceItem[]
  draft: ServiceItemDraft
}

type SalesRepSectionDraftState = {
  items: WorkOrderDetail["salesReps"]
  draft: SalesRepDraft
}

function hasAllocationDraftChanges(draft: AllocationDraft | undefined) {
  return Boolean(draft?.inventoryId || draft?.quantity || draft?.notes)
}

function hasMaterialItemSectionChanges(currentItem: EditableMaterialItem, serverItem: WorkOrderMaterialItem) {
  return (
    currentItem.productId !== serverItem.productId ||
    currentItem.quantity !== serverItem.quantity ||
    currentItem.unitPrice !== serverItem.unitPrice ||
    currentItem.notes !== serverItem.notes
  )
}

function hasAllocationRowChanges(currentAllocation: WorkOrderItemAllocationRow, serverAllocation: WorkOrderItemAllocationRow) {
  return (
    currentAllocation.inventoryId !== serverAllocation.inventoryId ||
    currentAllocation.quantity !== serverAllocation.quantity ||
    currentAllocation.cutSize !== serverAllocation.cutSize ||
    currentAllocation.notes !== serverAllocation.notes
  )
}

function buildMaterialSectionAllocationOperations(
  currentItem: WorkOrderMaterialItem,
  serverItem: WorkOrderMaterialItem,
) {
  const serverAllocationsById = new Map(serverItem.allocations.map((allocation) => [allocation.id, allocation]))
  const currentAllocationIds = new Set(currentItem.allocations.map((allocation) => allocation.id))

  const operations: Array<Record<string, unknown>> = []

  for (const allocation of currentItem.allocations) {
    const serverAllocation = serverAllocationsById.get(allocation.id)

    if (!serverAllocation) {
      operations.push({
        type: "create",
        input: {
          inventoryId: allocation.inventoryId,
          quantity: allocation.quantity,
          cutSize: allocation.cutSize,
          notes: allocation.notes,
        },
      })
      continue
    }

    if (!hasAllocationRowChanges(allocation, serverAllocation)) {
      continue
    }

    operations.push({
      type: "update",
      allocationId: allocation.id,
      expectedUpdatedAt: serverAllocation.updatedAt,
      input: {
        inventoryId: allocation.inventoryId,
        quantity: allocation.quantity,
        cutSize: allocation.cutSize,
        notes: allocation.notes,
      },
    })
  }

  for (const serverAllocation of serverItem.allocations) {
    if (currentAllocationIds.has(serverAllocation.id)) {
      continue
    }

    operations.push({
      type: "delete",
      allocationId: serverAllocation.id,
      expectedUpdatedAt: serverAllocation.updatedAt,
    })
  }

  return operations
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
  invoiceLoading = false,
  invoiceGenerating = false,
  onQueueInvoice,
  onOpenInvoice,
  onInvoiceSectionOpenChange,
  onAutoAllocateOptionsChange,
  onClose,
  refreshNonce = 0,
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
  invoiceLoading?: boolean
  invoiceGenerating?: boolean
  onQueueInvoice: () => void
  onOpenInvoice: () => void
  onInvoiceSectionOpenChange?: (open: boolean) => void
  onAutoAllocateOptionsChange?: (value: { label: string; disabled: boolean; onSelect: () => void } | null) => void
  onClose: () => void
  refreshNonce?: number
  onWorkOrderChange?: (workOrder: WorkOrderDetail) => void
  onWorkOrderSaved?: (workOrder: WorkOrderDetail) => void
  onWorkOrderDeleted?: (workOrderId: string) => void
  onExpenseSummaryChange?: (summary: WorkOrderExpenseSummary) => void
  onDirtyChange?: (value: boolean) => void
  onDirtySectionsChange?: (sections: string[]) => void
  notices?: RecordNotices
}) {
  const initialWorkOrderDetail = useMemo<WorkOrderDetail>(() => initialWorkOrder, [initialWorkOrder])
  const [savingWorkOrder, setSavingWorkOrder] = useState(false)
  const localNotices = useRecordNotices()
  const noticeController = notices ?? localNotices
  const {
    record: workOrder,
    draft,
    setDraft,
    loading,
    error,
    setError,
    isDirty,
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

  const materialCollection = useChildCollection<WorkOrderMaterialItem, MaterialItemDraft, WorkOrderMaterialItem | EditableMaterialItem>({
    listUrl: `/api/flooring/work-orders/${workOrderId}/items`,
    createUrl: `/api/flooring/work-orders/${workOrderId}/items`,
    updateUrl: (itemId) => `/api/flooring/work-orders/${workOrderId}/items/${itemId}`,
    deleteUrl: (itemId) => `/api/flooring/work-orders/${workOrderId}/items/${itemId}`,
    mapItems: (payload) => (payload.items as WorkOrderMaterialItem[] | undefined) ?? [],
    getItemId: (item) => item.id,
    pickCreatedItem: (payload) => payload.item as WorkOrderMaterialItem,
    pickUpdatedItem: (payload) => payload.item as WorkOrderMaterialItem,
    serializeCreate: (input) => input,
    serializeUpdate: (item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
    }),
    skipReloadAfterMutation: true,
    mutationMode: "envelope",
    getItemUpdatedAt: (item) => item.updatedAt,
  })
  const serviceCollection = useChildCollection<EditableServiceItem, ServiceItemDraft, EditableServiceItem>({
    listUrl: `/api/flooring/work-orders/${workOrderId}/service-items`,
    createUrl: `/api/flooring/work-orders/${workOrderId}/service-items`,
    updateUrl: (itemId) => `/api/flooring/work-orders/${workOrderId}/service-items/${itemId}`,
    deleteUrl: (itemId) => `/api/flooring/work-orders/${workOrderId}/service-items/${itemId}`,
    mapItems: (payload) => (payload.items as EditableServiceItem[] | undefined) ?? [],
    getItemId: (item) => item.id,
    pickCreatedItem: (payload) => payload.item as EditableServiceItem,
    pickUpdatedItem: (payload) => payload.item as EditableServiceItem,
    serializeCreate: (input) => input,
    serializeUpdate: (item) => item,
    skipReloadAfterMutation: true,
    mutationMode: "envelope",
    getItemUpdatedAt: (item) => item.updatedAt,
  })
  const salesRepCollection = useChildCollection({
    listUrl: `/api/flooring/work-orders/${workOrderId}/sales-reps`,
    createUrl: `/api/flooring/work-orders/${workOrderId}/sales-reps`,
    updateUrl: (repId: string) => `/api/flooring/work-orders/${workOrderId}/sales-reps/${repId}`,
    deleteUrl: (repId: string) => `/api/flooring/work-orders/${workOrderId}/sales-reps/${repId}`,
    mapItems: (payload) => (payload.items as WorkOrderDetail["salesReps"] | undefined) ?? [],
    getItemId: (item) => item.id,
    pickCreatedItem: (payload) => payload.item as WorkOrderDetail["salesReps"][number],
    pickUpdatedItem: (payload) => payload.item as WorkOrderDetail["salesReps"][number],
    serializeCreate: (input: SalesRepDraft) => input,
    serializeUpdate: (item: WorkOrderDetail["salesReps"][number]) => ({
      contactId: item.contactId,
      percent: item.percent,
    }),
    skipReloadAfterMutation: true,
    mutationMode: "envelope",
    getItemUpdatedAt: (item: WorkOrderDetail["salesReps"][number]) => item.updatedAt,
  })
  const initialCalculationRows = useMemo(
    () => buildWorkOrderCalculationRowsFromSummary(initialWorkOrderDetail.financialSummary),
    [initialWorkOrderDetail.financialSummary],
  )
  const calculationRowsCollection = useReadOnlyChildCollection<WorkOrderCalculationRow>({
    listUrl: `/api/flooring/work-orders/${workOrderId}/calculations`,
    mapItems: (payload) => (payload.items as WorkOrderCalculationRow[] | undefined) ?? [],
    initialItems: initialCalculationRows,
  })
  const {
    items: calculationRows,
    loading: loadingCalculationRows,
    setItems: setCalculationRows,
  } = calculationRowsCollection

  const onExpenseSummaryChangeRef = useRef(onExpenseSummaryChange)
  const onWorkOrderChangeRef = useRef(onWorkOrderChange)
  const onWorkOrderSavedRef = useRef(onWorkOrderSaved)
  const hasMountedRefreshRef = useRef(false)
  const { message, error: noticeError, showSuccess, showError, clearNotices } = noticeController

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
    try {
      const nextWorkOrder = await refreshRecord()
      publishWorkOrder(nextWorkOrder)
      onExpenseSummaryChangeRef.current?.(nextWorkOrder.financialSummary)
      return nextWorkOrder
    } finally {
    }
  }, [publishWorkOrder, refreshRecord])

  const salesRepLines = useRecordSalesRepsController({
    record: workOrder,
    notices: noticeController,
    clearParentError: () => setError(""),
    salesRepCollection,
    initialDraft: defaultSalesRepDraft,
    getItemsFromRecord: (record: WorkOrderDetail) => record.salesReps ?? [],
    onItemsChanged: ({ record, salesReps }) => {
      const nextWorkOrder = {
        ...record,
        salesReps,
        financialSummary: normalizeWorkOrderExpenseSummary({
          items: materialCollection.items,
          serviceItems: serviceCollection.items,
          salesReps,
        }),
      } as WorkOrderDetail

      publishWorkOrder(nextWorkOrder)
    },
    onMutationResult: ({ payload }) => {
      if (payload.workOrder) {
        publishWorkOrder(payload.workOrder as WorkOrderDetail)
        return true
      }

      return false
    },
  })

  const lineItems = useRecordLineItemsController<WorkOrderDetail, WorkOrderMaterialItem, EditableServiceItem>({
    record: workOrder,
    notices: noticeController,
    clearParentError: () => setError(""),
    materialCollection,
    serviceCollection,
    initialMaterialDraft: defaultMaterialDraft,
    initialServiceDraft: defaultServiceDraft,
    getCollectionsFromRecord: (record) => ({
      materialItems: record.items ?? [],
      serviceItems: record.serviceItems ?? [],
    }),
    onCollectionsChanged: ({ record, materialItems, serviceItems }) => {
      const nextWorkOrder = {
        ...record,
        hasShortage: materialItems.some((item) => item.hasAllocationShortage),
        items: materialItems,
        serviceItems,
        salesReps: salesRepCollection.items,
        summary: buildRecordSummary({
          materialItems,
          serviceItems,
        }),
        financialSummary: normalizeWorkOrderExpenseSummary({
          items: materialItems,
          serviceItems,
          salesReps: salesRepCollection.items,
        }),
      } as WorkOrderDetail

      publishWorkOrder(nextWorkOrder)
    },
    onMutationResult: ({ payload }) => {
      if (payload.workOrder) {
        publishWorkOrder(payload.workOrder as WorkOrderDetail)
        return true
      }

      return false
    },
  })

  const allocations = useRecordAllocationsController({
    workOrderId,
    workOrderUpdatedAt: workOrder?.updatedAt ?? initialWorkOrderDetail.updatedAt,
    materialItems: lineItems.materialItems,
    setMaterialItems: materialCollection.setItems,
    notices: noticeController,
    onMaterialItemsChanged: (materialItems) => {
      const nextWorkOrder = {
        ...workOrder,
        hasShortage: materialItems.some((item) => item.hasAllocationShortage),
        items: materialItems,
        serviceItems: lineItems.serviceItems,
        salesReps: salesRepLines.salesReps,
        summary: buildRecordSummary({
          materialItems,
          serviceItems: lineItems.serviceItems,
        }),
        financialSummary: normalizeWorkOrderExpenseSummary({
          items: materialItems,
          serviceItems: lineItems.serviceItems,
          salesReps: salesRepLines.salesReps,
        }),
      } as WorkOrderDetail

      publishWorkOrder(nextWorkOrder)
    },
    onAutoAllocationCompleted: async () => {
      await refreshWorkOrderDetail()
    },
    onWorkOrderChange: publishWorkOrder,
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
      setDraft(primaryDraft)
    }

    const materialDraftState = readRecordSectionDraft<MaterialSectionDraftState>(sectionDraftKeys.material)
    if (materialDraftState) {
      lineItems.setMaterialItems(materialDraftState.items)
      lineItems.setMaterialDraft(materialDraftState.draft)
      allocations.setDraftsByItemId(materialDraftState.allocationDraftsByItemId ?? {})
    }

    const serviceDraftState = readRecordSectionDraft<ServiceSectionDraftState>(sectionDraftKeys.service)
    if (serviceDraftState) {
      lineItems.setServiceItems(serviceDraftState.items)
      lineItems.setServiceDraft(serviceDraftState.draft)
    }

    const salesDraftState = readRecordSectionDraft<SalesRepSectionDraftState>(sectionDraftKeys.sales)
    if (salesDraftState) {
      salesRepLines.salesRepCollection.setItems(salesDraftState.items)
      salesRepLines.setDraft(salesDraftState.draft)
    }
  }, [
    allocations,
    lineItems,
    salesRepLines,
    sectionDraftKeys.material,
    sectionDraftKeys.primary,
    sectionDraftKeys.sales,
    sectionDraftKeys.service,
    setDraft,
  ])

  const primarySectionDirty = isDirty
  const materialSectionDirty =
    JSON.stringify(lineItems.materialItems) !== JSON.stringify(workOrder?.items ?? []) ||
    JSON.stringify(lineItems.materialDraft) !== JSON.stringify(defaultMaterialDraft) ||
    Object.values(allocations.draftsByItemId).some((draft) => hasAllocationDraftChanges(draft))
  const serviceSectionDirty =
    JSON.stringify(lineItems.serviceItems) !== JSON.stringify(workOrder?.serviceItems ?? []) ||
    JSON.stringify(lineItems.serviceDraft) !== JSON.stringify(defaultServiceDraft)
  const salesSectionDirty =
    JSON.stringify(salesRepLines.salesReps) !== JSON.stringify(workOrder?.salesReps ?? []) ||
    JSON.stringify(salesRepLines.draft) !== JSON.stringify(defaultSalesRepDraft)
  const dirtySections = useMemo(
    () =>
      [
        primarySectionDirty ? "Work Order" : null,
        materialSectionDirty ? "Material Items" : null,
        serviceSectionDirty ? "Service Items" : null,
        salesSectionDirty ? "Sales Reps" : null,
      ].filter(Boolean) as string[],
    [materialSectionDirty, primarySectionDirty, salesSectionDirty, serviceSectionDirty],
  )

  useEffect(() => {
    onDirtyChange?.(dirtySections.length > 0)
    onDirtySectionsChange?.(dirtySections)
  }, [dirtySections, onDirtyChange, onDirtySectionsChange])

  useEffect(() => {
    if (primarySectionDirty && draft) {
      writeRecordSectionDraft(sectionDraftKeys.primary, draft)
      return
    }

    clearRecordSectionDraft(sectionDraftKeys.primary)
  }, [draft, primarySectionDirty, sectionDraftKeys.primary])

  useEffect(() => {
    if (materialSectionDirty) {
      writeRecordSectionDraft(sectionDraftKeys.material, {
        items: lineItems.materialItems,
        draft: lineItems.materialDraft,
        allocationDraftsByItemId: allocations.draftsByItemId,
      } satisfies MaterialSectionDraftState)
      return
    }

    clearRecordSectionDraft(sectionDraftKeys.material)
  }, [
    allocations.draftsByItemId,
    lineItems.materialDraft,
    lineItems.materialItems,
    materialSectionDirty,
    sectionDraftKeys.material,
  ])

  useEffect(() => {
    if (serviceSectionDirty) {
      writeRecordSectionDraft(sectionDraftKeys.service, {
        items: lineItems.serviceItems,
        draft: lineItems.serviceDraft,
      } satisfies ServiceSectionDraftState)
      return
    }

    clearRecordSectionDraft(sectionDraftKeys.service)
  }, [lineItems.serviceDraft, lineItems.serviceItems, sectionDraftKeys.service, serviceSectionDirty])

  useEffect(() => {
    if (salesSectionDirty) {
      writeRecordSectionDraft(sectionDraftKeys.sales, {
        items: salesRepLines.salesReps,
        draft: salesRepLines.draft,
      } satisfies SalesRepSectionDraftState)
      return
    }

    clearRecordSectionDraft(sectionDraftKeys.sales)
  }, [salesRepLines.draft, salesRepLines.salesReps, salesSectionDirty, sectionDraftKeys.sales])

  const requestAutoAllocationRef = useRef(allocations.requestAutoAllocation)

  useEffect(() => {
    requestAutoAllocationRef.current = allocations.requestAutoAllocation
  }, [allocations.requestAutoAllocation])

  const handleAutoAllocateFromMenu = useCallback(() => {
    void requestAutoAllocationRef.current()
  }, [])

  useEffect(() => {
    onAutoAllocateOptionsChange?.({
      label: allocations.isAutoAllocating ? "Auto Allocating..." : "Auto Allocate",
      disabled: allocations.isAutoAllocating || lineItems.materialItems.length === 0,
      onSelect: handleAutoAllocateFromMenu,
    })

    return () => {
      onAutoAllocateOptionsChange?.(null)
    }
  }, [
    allocations.isAutoAllocating,
    handleAutoAllocateFromMenu,
    lineItems.materialItems.length,
    onAutoAllocateOptionsChange,
  ])

  const handleSaveMaterialItemSection = useCallback(
    async (item: EditableMaterialItem) => {
      if (!workOrder) {
        return false
      }

      const currentItem = lineItems.materialItems.find((current) => current.id === item.id)
      const serverItem = workOrder.items.find((current) => current.id === item.id)

      if (!currentItem || !serverItem) {
        const didSaveItem = await lineItems.saveMaterialItem(item, { suppressSuccess: true })
        if (!didSaveItem) {
          return false
        }

        const didSaveAllocations = await allocations.saveAllocationsForItem(item.id, {
          suppressClear: true,
          suppressSuccess: true,
        })
        if (!didSaveAllocations) {
          return false
        }

        noticeController.clearNotices()
        noticeController.showSuccess("Material item and allocations saved")
        return true
      }

      const allocationOperations = buildMaterialSectionAllocationOperations(currentItem, serverItem)
      const allocationDraft = allocations.draftsByItemId[item.id]
      if (hasAllocationDraftChanges(allocationDraft)) {
        allocationOperations.push({
          type: "create",
          input: {
            inventoryId: allocationDraft?.inventoryId ?? "",
            quantity: allocationDraft?.quantity ?? "",
            notes: allocationDraft?.notes ?? "",
          },
        })
      }
      const itemChanged = hasMaterialItemSectionChanges(currentItem, serverItem)

      if (!itemChanged && allocationOperations.length === 0) {
        noticeController.clearNotices()
        noticeController.showSuccess("Material item and allocations are already up to date")
        return true
      }

      noticeController.clearNotices()

      try {
        const payload = await requestJson<{ workOrder: WorkOrderDetail }>(
          `/api/flooring/work-orders/${workOrder.id}/items/${item.id}/section`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              withMutationMeta(
                {
                  item: {
                    productId: currentItem.productId,
                    quantity: currentItem.quantity,
                    unitPrice: currentItem.unitPrice,
                    notes: currentItem.notes,
                  },
                  itemExpectedUpdatedAt: serverItem.updatedAt,
                  allocationOperations,
                },
                workOrder.updatedAt,
              ),
            ),
          },
        )

        lineItems.clearMaterialItemErrors(item.id)
        allocations.clearAllocationErrors(item.id)
        allocations.clearAllocationDraft(item.id)
        publishWorkOrder(payload.workOrder)
        noticeController.showSuccess("Material item and allocations saved")
        return true
      } catch (error) {
        noticeController.showError(error instanceof Error ? error.message : "Failed to save material item and allocations")
        return false
      }
    },
    [allocations, lineItems, noticeController, publishWorkOrder, workOrder],
  )

  useEffect(() => {
    onExpenseSummaryChangeRef.current?.(
      normalizeWorkOrderExpenseSummary({
        items: lineItems.materialItems,
        serviceItems: lineItems.serviceItems,
        salesReps: salesRepLines.salesReps,
      }),
    )
  }, [lineItems.materialItems, lineItems.serviceItems, salesRepLines.salesReps])

  const currentExpenseSummary = useMemo(
    () =>
      normalizeWorkOrderExpenseSummary({
        items: lineItems.materialItems,
        serviceItems: lineItems.serviceItems,
        salesReps: salesRepLines.salesReps,
      }),
    [lineItems.materialItems, lineItems.serviceItems, salesRepLines.salesReps],
  )
  const currentCalculationRows = useMemo(
    () => buildWorkOrderCalculationRowsFromSummary(currentExpenseSummary),
    [currentExpenseSummary],
  )

  useEffect(() => {
    setCalculationRows(currentCalculationRows)
  }, [currentCalculationRows, setCalculationRows])

  useEffect(() => {
    if (!hasMountedRefreshRef.current) {
      hasMountedRefreshRef.current = true
      return
    }

    void refreshWorkOrderDetail()
  }, [refreshNonce, refreshWorkOrderDetail])

  async function saveWorkOrder() {
    if (!draft || !workOrder) return
    setSavingWorkOrder(true)
    setError("")
    clearNotices()

    try {
      const payload = await requestJson<{ workOrder: WorkOrderDetail }>(`/api/flooring/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta(draft, workOrder.updatedAt)),
      })
      if (!payload.workOrder) {
        throw new Error("Failed to save work order")
      }
      publishWorkOrder(payload.workOrder)
      onWorkOrderSavedRef.current?.(payload.workOrder)
      showSuccess("Work order saved")
    } catch (saveError) {
      showError(saveError instanceof Error ? saveError.message : "Failed to save work order")
    } finally {
      setSavingWorkOrder(false)
    }
  }

  async function deleteWorkOrder() {
    if (!workOrder) return
    setError("")
    clearNotices()
    try {
      await requestJson(`/api/flooring/work-orders/${workOrder.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, workOrder.updatedAt)),
      })
      clearRecordCache()
      onWorkOrderDeleted?.(workOrder.id)
      onClose()
    } catch (deleteError) {
      showError(deleteError instanceof Error ? deleteError.message : "Failed to delete work order")
    }
  }

  if (loading && !workOrder) {
    return <CenteredLoadingState label="Loading work order..." />
  }

  if (error && (!workOrder || !draft)) {
    return <CenteredErrorState title="Error" message={error} onDismiss={onClose} />
  }

  if (!workOrder || !draft) {
    return <CenteredErrorState title="Error" message="Work order could not be loaded." onDismiss={onClose} />
  }

  return (
    <div className="space-y-6">
      <FormStatusNotices message={message} error={noticeError} loadingMessage={savingWorkOrder ? "Saving work order..." : ""} />

      <RecordSectionStack>
        {showPrimaryFields ? (
          <WorkOrderPrimaryFieldsSection
            draft={draft}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            selectedAddressValue={selectedAddress(propertyOptions, draft, workOrder.propertyAddress)}
            unitType={workOrder.unitType}
            setDraft={setDraft}
          />
        ) : null}

        <div className={showPrimaryFields ? "pt-2" : undefined}>
        <WorkOrderMaterialItemsSection
          title="Material Items"
          items={lineItems.materialItems}
            draft={lineItems.materialDraft}
            productOptions={productOptions}
            loading={loading || lineItems.materialCollection.loading}
            adding={lineItems.materialCollection.adding}
            savingItemId={lineItems.materialCollection.savingItemId}
            deletingItemId={lineItems.materialCollection.deletingItemId}
            draftErrors={lineItems.materialDraftErrors}
            itemErrors={lineItems.materialItemErrors}
            expandedItemIds={allocations.expandedItemIds}
            onToggleExpandedItem={allocations.toggleExpandedItem}
          onDraftChange={lineItems.handleMaterialDraftChange}
          onAdd={() => lineItems.addMaterialItem()}
          onItemFieldChange={lineItems.handleMaterialItemFieldChange}
          onSaveItem={handleSaveMaterialItemSection}
          onDeleteItem={(itemId) => void lineItems.deleteMaterialItem(itemId)}
          renderAllocationSection={(item: WorkOrderMaterialItem) => (
            <MaterialAllocationsEditor
                allocations={item.allocations}
                draft={
                  allocations.draftsByItemId[item.id] ?? {
                    inventoryId: "",
                    quantity: "",
                    notes: "",
                  }
                }
                allocationOptions={allocations.optionsByItemId[item.id] ?? []}
                loadingOptions={allocations.loadingOptionsByItemId[item.id] ?? false}
                adding={allocations.addingItemId === item.id}
                deletingAllocationId={allocations.deletingAllocationId}
                draftErrors={allocations.draftErrorsByItemId[item.id] ?? {}}
                itemErrors={allocations.itemErrorsByItemId[item.id] ?? {}}
                onDraftChange={(field, value) => allocations.handleDraftChange(item.id, field, value)}
                onAdd={() => allocations.addAllocation(item.id)}
                onAllocationFieldChange={(allocationId, field, value) =>
                  allocations.handleAllocationFieldChange(item.id, allocationId, field, value)
                }
                onSaveAllocation={(allocation) => allocations.saveAllocation(item.id, allocation)}
                onDeleteAllocation={(allocationId) => void allocations.deleteAllocation(item.id, allocationId)}
              />
            )}
          />
        </div>

        <WorkOrderServiceItemsSection
          title="Service Items"
          items={lineItems.serviceItems}
          draft={lineItems.serviceDraft}
          serviceOptions={serviceOptions}
          unitOptions={unitOptions}
          totalAmount={workOrder.summary.serviceTotal}
          loading={loading || lineItems.serviceCollection.loading}
          adding={lineItems.serviceCollection.adding}
          savingItemId={lineItems.serviceCollection.savingItemId}
          deletingItemId={lineItems.serviceCollection.deletingItemId}
          draftErrors={lineItems.serviceDraftErrors}
          itemErrors={lineItems.serviceItemErrors}
          onDraftChange={lineItems.handleServiceDraftChange}
          onAdd={() => lineItems.addServiceItem()}
          onItemFieldChange={lineItems.handleServiceItemFieldChange}
          onSaveItem={(item) => void lineItems.saveServiceItem(item)}
          onDeleteItem={(itemId) => void lineItems.deleteServiceItem(itemId)}
        />

        <WorkOrderSalesRepsSection
          title="Sales Reps"
          items={salesRepLines.salesReps}
          draft={salesRepLines.draft}
          salesRepOptions={salesRepOptions}
          customerCost={currentExpenseSummary.customerCost}
          totalAmount={currentExpenseSummary.salesRepExpense}
          loading={loading || salesRepLines.salesRepCollection.loading}
          adding={salesRepLines.salesRepCollection.adding}
          savingItemId={salesRepLines.salesRepCollection.savingItemId}
          deletingItemId={salesRepLines.salesRepCollection.deletingItemId}
          draftErrors={salesRepLines.draftErrors}
          itemErrors={salesRepLines.itemErrors}
          onDraftChange={salesRepLines.handleDraftChange}
          onAdd={() => salesRepLines.addItem()}
          onItemFieldChange={salesRepLines.handleItemFieldChange}
          onSaveItem={(item) => void salesRepLines.saveItem(item)}
          onDeleteItem={(itemId) => void salesRepLines.deleteItem(itemId)}
        />

        <WorkOrderCalculationsSection
          title="Calculations"
          items={calculationRows as DisplayCalculationRow[]}
          loading={loadingCalculationRows}
        />

        <WorkOrderInvoiceSection
          invoice={invoice}
          isLoading={invoiceLoading}
          isGenerating={invoiceGenerating}
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
        saveLabel="Save Work Order"
        savingLabel="Saving..."
        onSave={() => void saveWorkOrder()}
        isSaving={savingWorkOrder}
      />
    </div>
  )
}
