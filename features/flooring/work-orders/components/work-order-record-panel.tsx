"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/feedback-states"
import { FormStatusNotices } from "@/features/flooring/shared/notices"
import {
  MaterialItemsEditor,
  type EditableMaterialItem,
  type MaterialItemDraft,
  type MaterialItemOption,
} from "@/features/flooring/shared/record-items/material-items-editor"
import { RecordPanelFooter } from "@/features/flooring/shared/record-panel-footer"
import { buildRecordSummary } from "@/features/flooring/shared/record-summary"
import { RecordFormField } from "@/features/flooring/shared/record-form"
import { AutoGrowTextarea } from "@/features/flooring/shared/ui/forms/auto-grow-textarea"
import {
  ServiceItemsEditor,
  type EditableServiceItem,
  type ServiceItemDraft,
  type ServiceOption,
  type UnitOption,
} from "@/features/flooring/shared/record-items/service-items-editor"
import { SalesRepItemsEditor, type SalesRepDraft } from "@/features/flooring/shared/ui/record-items/sales-rep-items-editor"
import { PrimaryRecordFieldsGrid, RecordStaticFieldValue } from "@/features/flooring/shared/record-items/record-primary-fields"
import { useChildCollection } from "@/features/flooring/shared/record-items/use-child-collection"
import { useRecordLineItemsController } from "@/features/flooring/shared/record-items/use-record-line-items-controller"
import { useRecordSalesRepsController } from "@/features/flooring/shared/controllers/record-items/use-record-sales-reps-controller"
import { useRecordDetailController } from "@/features/flooring/shared/record-page/use-record-detail-controller"
import { useRecordNotices, type RecordNotices } from "@/features/flooring/shared/use-record-notices"
import { WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusLabel } from "@/features/flooring/work-orders/contracts"
import { normalizeWorkOrderExpenseSummary } from "@/features/flooring/work-orders/domain/expense-summary"
import type { DraftWorkOrder, PropertyOption, SalesRepContactOption, WorkOrderDetail, WorkOrderExpenseSummary, WarehouseOption } from "@/features/flooring/work-orders/types"

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

const vacancyOptions: Array<"VACANT" | "OCCUPIED"> = ["VACANT", "OCCUPIED"]

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
    unitType: workOrder.unitType,
    customAddress: workOrder.customAddress,
    instructions: workOrder.instructions,
    notes: workOrder.notes,
    workOrderImageUrl: workOrder.workOrderImageUrl,
  }
}

function statusLabel(value: string) {
  return getWorkOrderStatusLabel({ status: value, isComplete: false })
}

function selectedAddress(propertyOptions: PropertyOption[], draft: DraftWorkOrder, fallbackAddress: string) {
  if (draft.customAddress.trim()) {
    return draft.customAddress
  }

  return propertyOptions.find((property) => property.id === draft.propertyId)?.address ?? fallbackAddress
}

export function WorkOrderRecordPanel({
  workOrderId,
  initialWorkOrder,
  propertyOptions,
  warehouseOptions,
  productOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  onClose,
  refreshNonce = 0,
  onWorkOrderSaved,
  onWorkOrderDeleted,
  onExpenseSummaryChange,
  onDirtyChange,
  notices,
}: {
  workOrderId: string
  initialWorkOrder: WorkOrderDetail
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  onClose: () => void
  refreshNonce?: number
  onWorkOrderSaved?: (workOrder: WorkOrderDetail) => void
  onWorkOrderDeleted?: (workOrderId: string) => void
  onExpenseSummaryChange?: (summary: WorkOrderExpenseSummary) => void
  onDirtyChange?: (value: boolean) => void
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

  const materialCollection = useChildCollection<EditableMaterialItem, MaterialItemDraft, EditableMaterialItem>({
    listUrl: `/api/flooring/work-orders/${workOrderId}/items`,
    createUrl: `/api/flooring/work-orders/${workOrderId}/items`,
    updateUrl: (itemId) => `/api/flooring/work-orders/${workOrderId}/items/${itemId}`,
    deleteUrl: (itemId) => `/api/flooring/work-orders/${workOrderId}/items/${itemId}`,
    mapItems: (payload) => (payload.items as EditableMaterialItem[] | undefined) ?? [],
    getItemId: (item) => item.id,
    pickCreatedItem: (payload) => payload.item as EditableMaterialItem,
    pickUpdatedItem: (payload) => payload.item as EditableMaterialItem,
    serializeCreate: (input) => input,
    serializeUpdate: (item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
    }),
    skipReloadAfterMutation: true,
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
  })

  const onExpenseSummaryChangeRef = useRef(onExpenseSummaryChange)
  const onWorkOrderSavedRef = useRef(onWorkOrderSaved)
  const hasMountedRefreshRef = useRef(false)
  const { message, error: noticeError, showSuccess, showError, clearNotices } = noticeController

  useEffect(() => {
    onExpenseSummaryChangeRef.current = onExpenseSummaryChange
  }, [onExpenseSummaryChange])

  useEffect(() => {
    onWorkOrderSavedRef.current = onWorkOrderSaved
  }, [onWorkOrderSaved])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const publishWorkOrder = useCallback(
    (nextWorkOrder: WorkOrderDetail) => {
      publishRecord(nextWorkOrder)
      onWorkOrderSavedRef.current?.(nextWorkOrder)
    },
    [publishRecord],
  )

  const refreshWorkOrderDetail = useCallback(async () => {
    try {
      const nextWorkOrder = await refreshRecord()
      publishWorkOrder(nextWorkOrder)
      onExpenseSummaryChangeRef.current?.(nextWorkOrder.expenseSummary)
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
      const nextWorkOrder: WorkOrderDetail = {
        ...record,
        salesReps,
        expenseSummary: normalizeWorkOrderExpenseSummary({
          items: materialCollection.items,
          serviceItems: serviceCollection.items,
          salesReps,
        }),
      }

      publishWorkOrder(nextWorkOrder)
    },
  })

  const lineItems = useRecordLineItemsController<WorkOrderDetail, EditableMaterialItem, EditableServiceItem>({
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
      const nextWorkOrder: WorkOrderDetail = {
        ...record,
        hasShortage: record.hasShortage,
        items: materialItems,
        serviceItems,
        salesReps: salesRepCollection.items,
        summary: buildRecordSummary({
          materialItems,
          serviceItems,
        }),
        expenseSummary: normalizeWorkOrderExpenseSummary({
          items: materialItems,
          serviceItems,
          salesReps: salesRepCollection.items,
        }),
      }

      publishWorkOrder(nextWorkOrder)
    },
  })

  useEffect(() => {
    onExpenseSummaryChangeRef.current?.(
      normalizeWorkOrderExpenseSummary({
        items: lineItems.materialItems,
        serviceItems: lineItems.serviceItems,
        salesReps: salesRepLines.salesReps,
      }),
    )
  }, [lineItems.materialItems, lineItems.serviceItems, salesRepLines.salesReps])

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
      await requestJson<{ workOrder: Omit<WorkOrderDetail, "items" | "serviceItems" | "salesReps" | "summary" | "expenseSummary"> }>(`/api/flooring/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      await refreshWorkOrderDetail()
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
      await requestJson(`/api/flooring/work-orders/${workOrder.id}`, { method: "DELETE" })
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

  const currentExpenseSummary = normalizeWorkOrderExpenseSummary({
    items: lineItems.materialItems,
    serviceItems: lineItems.serviceItems,
    salesReps: salesRepLines.salesReps,
  })

  return (
    <div className="space-y-6">
      <FormStatusNotices message={message} error={noticeError} loadingMessage={savingWorkOrder ? "Saving work order..." : ""} />

      <PrimaryRecordFieldsGrid>
        <RecordFormField label="Property">
          <select value={draft.propertyId} onChange={(event) => setDraft((prev) => (prev ? { ...prev, propertyId: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
            <option value="">Select property</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
        </RecordFormField>
        <RecordFormField label="Warehouse">
          <select value={draft.warehouseId} onChange={(event) => setDraft((prev) => (prev ? { ...prev, warehouseId: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
            <option value="">No warehouse</option>
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
        </RecordFormField>
        <RecordFormField label="Status">
          <select value={draft.status} onChange={(event) => setDraft((prev) => (prev ? { ...prev, status: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
              {WORK_ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
          </select>
        </RecordFormField>
        <RecordFormField label="Completion">
          <select value={draft.isComplete ? "COMPLETE" : "OPEN"} onChange={(event) => setDraft((prev) => (prev ? { ...prev, isComplete: event.target.value === "COMPLETE" } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
            <option value="OPEN">Open</option>
            <option value="COMPLETE">Complete</option>
          </select>
        </RecordFormField>
        <RecordFormField label="Vacancy">
          <select value={draft.vacancy} onChange={(event) => setDraft((prev) => (prev ? { ...prev, vacancy: event.target.value as DraftWorkOrder["vacancy"] } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
            <option value="">Select vacancy</option>
            {vacancyOptions.map((vacancy) => (
              <option key={vacancy} value={vacancy}>{vacancy}</option>
            ))}
          </select>
        </RecordFormField>
        <RecordFormField label="Address">
          <RecordStaticFieldValue>
            {selectedAddress(propertyOptions, draft, workOrder.propertyAddress) || "Select a property or enter a custom address"}
          </RecordStaticFieldValue>
        </RecordFormField>
        <RecordFormField label="Custom Address">
          <input value={draft.customAddress} onChange={(event) => setDraft((prev) => (prev ? { ...prev, customAddress: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
        </RecordFormField>
        <RecordFormField label="Date">
          <input type="date" value={draft.date} onChange={(event) => setDraft((prev) => (prev ? { ...prev, date: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
        </RecordFormField>
        <RecordFormField label="Unit Type">
          <input value={draft.unitType} onChange={(event) => setDraft((prev) => (prev ? { ...prev, unitType: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
        </RecordFormField>
        <RecordFormField label="Unit Label">
          <input value={draft.unitText} onChange={(event) => setDraft((prev) => (prev ? { ...prev, unitText: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
        </RecordFormField>
        <RecordFormField label="Notes">
          <AutoGrowTextarea value={draft.notes} onChange={(event) => setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
        </RecordFormField>
        <div className="md:col-span-2 xl:col-span-4">
          <RecordFormField label="Instructions">
            <AutoGrowTextarea value={draft.instructions} onChange={(event) => setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
        </div>
      </PrimaryRecordFieldsGrid>

      <MaterialItemsEditor
        title="Material Items"
        description="Editable material lines for this work order."
        items={lineItems.materialItems}
        draft={lineItems.materialDraft}
        productOptions={productOptions}
        loading={loading || lineItems.materialCollection.loading}
        adding={lineItems.materialCollection.adding}
        savingItemId={lineItems.materialCollection.savingItemId}
        deletingItemId={lineItems.materialCollection.deletingItemId}
        draftErrors={lineItems.materialDraftErrors}
        itemErrors={lineItems.materialItemErrors}
        onDraftChange={lineItems.handleMaterialDraftChange}
        onAdd={() => lineItems.addMaterialItem()}
        onItemFieldChange={lineItems.handleMaterialItemFieldChange}
        onSaveItem={(item) => void lineItems.saveMaterialItem(item)}
        onDeleteItem={(itemId) => void lineItems.deleteMaterialItem(itemId)}
      />

      <ServiceItemsEditor
        title="Service Items"
        description="Editable service lines for this work order."
        items={lineItems.serviceItems}
        draft={lineItems.serviceDraft}
        serviceOptions={serviceOptions}
        unitOptions={unitOptions}
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

      <SalesRepItemsEditor
        title="Sales Reps"
        description="Sales rep assignments and payout percentages for this work order."
        items={salesRepLines.salesReps}
        draft={salesRepLines.draft}
        salesRepOptions={salesRepOptions}
        customerCost={currentExpenseSummary.customerCost}
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
