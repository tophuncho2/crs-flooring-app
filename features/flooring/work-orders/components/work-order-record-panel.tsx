"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/http"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/feedback-states"
import { ErrorNotice, SuccessNotice } from "@/features/flooring/shared/notices"
import { MaterialItemsEditor, type EditableMaterialItem, type MaterialItemDraft, type MaterialItemOption } from "@/features/flooring/shared/material-items-editor"
import { RecordPanelFooter } from "@/features/flooring/shared/record-panel-footer"
import { buildRecordSummary, emptyRecordSummary } from "@/features/flooring/shared/record-summary"
import { RecordFormField } from "@/features/flooring/shared/record-form"
import { ServiceItemsEditor, type EditableServiceItem, type ServiceItemDraft, type ServiceOption, type UnitOption } from "@/features/flooring/shared/service-items-editor"
import { useChildCollection } from "@/features/flooring/shared/use-child-collection"
import { useRecordDetailController } from "@/features/flooring/shared/use-record-detail-controller"
import { WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusLabel } from "@/features/flooring/work-orders/contracts"

type PropertyOption = {
  id: string
  name: string
  address: string
}

type WarehouseOption = {
  id: string
  name: string
}

type WorkOrderDetail = {
  id: string
  workOrderNumber: string
  propertyId: string
  templateId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  createdAt: string
  updatedAt: string
  hasShortage?: boolean
  items: EditableMaterialItem[]
  serviceItems: EditableServiceItem[]
  summary: ReturnType<typeof buildRecordSummary>
}

type WorkOrderDraft = {
  propertyId: string
  templateId: string
  warehouseId: string
  status: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | ""
  date: string
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
}

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

const vacancyOptions: Array<"VACANT" | "OCCUPIED"> = ["VACANT", "OCCUPIED"]

function toDraft(workOrder: WorkOrderDetail): WorkOrderDraft {
  return {
    propertyId: workOrder.propertyId,
    templateId: workOrder.templateId,
    warehouseId: workOrder.warehouseId,
    status: workOrder.status,
    isComplete: workOrder.isComplete,
    vacancy: workOrder.vacancy ?? "",
    date: workOrder.date ? workOrder.date.split("T")[0] : "",
    unitText: workOrder.unitText,
    unitNumber: workOrder.unitNumber,
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

function selectedAddress(propertyOptions: PropertyOption[], draft: WorkOrderDraft, fallbackAddress: string) {
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
  unitOptions,
  onClose,
  refreshNonce = 0,
  onWorkOrderSaved,
  onWorkOrderDeleted,
  onSummaryChange,
}: {
  workOrderId: string
  initialWorkOrder: Omit<WorkOrderDetail, "items" | "serviceItems" | "summary">
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  onClose: () => void
  refreshNonce?: number
  onWorkOrderSaved?: (workOrder: Omit<WorkOrderDetail, "items" | "serviceItems" | "summary"> & { itemsCount: number }) => void
  onWorkOrderDeleted?: (workOrderId: string) => void
  onSummaryChange?: (summary: { materialItems: EditableMaterialItem[]; serviceItems: EditableServiceItem[] }) => void
}) {
  const initialWorkOrderDetail = useMemo<WorkOrderDetail>(
    () => ({
      ...initialWorkOrder,
      templateId: initialWorkOrder.templateId ?? "",
      items: [],
      serviceItems: [],
      summary: emptyRecordSummary(),
    }),
    [initialWorkOrder],
  )
  const [materialDraft, setMaterialDraft] = useState<MaterialItemDraft>(defaultMaterialDraft)
  const [serviceDraft, setServiceDraft] = useState<ServiceItemDraft>(defaultServiceDraft)
  const [savingWorkOrder, setSavingWorkOrder] = useState(false)
  const [message, setMessage] = useState("")
  const {
    record: workOrder,
    draft,
    setDraft,
    loading,
    error,
    setError,
    publishRecord,
    refreshRecord,
    clearRecordCache,
  } = useRecordDetailController<WorkOrderDetail, WorkOrderDraft>({
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
    serializeCreate: (input) => input,
    serializeUpdate: (item) => item,
    skipReloadAfterMutation: true,
  })

  const setMaterialItems = materialCollection.setItems
  const setServiceItems = serviceCollection.setItems
  const materialItems = materialCollection.items
  const serviceItems = serviceCollection.items

  const onSummaryChangeRef = useRef(onSummaryChange)
  const onWorkOrderSavedRef = useRef(onWorkOrderSaved)
  const hasMountedRefreshRef = useRef(false)

  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange
  }, [onSummaryChange])

  useEffect(() => {
    onWorkOrderSavedRef.current = onWorkOrderSaved
  }, [onWorkOrderSaved])

  useEffect(() => {
    onSummaryChangeRef.current?.({ materialItems, serviceItems })
  }, [materialItems, serviceItems])

  const publishWorkOrder = useCallback((nextWorkOrder: WorkOrderDetail) => {
    publishRecord(nextWorkOrder)
    onWorkOrderSavedRef.current?.({
      ...nextWorkOrder,
      itemsCount: nextWorkOrder.items.length + nextWorkOrder.serviceItems.length,
    })
  }, [publishRecord])

  const refreshWorkOrderDetail = useCallback(async () => {
    try {
      const nextWorkOrder = await refreshRecord()
      publishWorkOrder(nextWorkOrder)
      setMaterialItems(nextWorkOrder.items ?? [])
      setServiceItems(nextWorkOrder.serviceItems ?? [])
      return nextWorkOrder
    } finally {
    }
  }, [publishWorkOrder, refreshRecord, setMaterialItems, setServiceItems])

  useEffect(() => {
    if (!workOrder) {
      return
    }

    setMaterialItems(workOrder.items ?? [])
    setServiceItems(workOrder.serviceItems ?? [])
  }, [setMaterialItems, setServiceItems, workOrder])

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

    try {
      await requestJson<{ workOrder: Omit<WorkOrderDetail, "items" | "serviceItems"> }>(`/api/flooring/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      await refreshWorkOrderDetail()
      setMessage("Work order saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save work order")
    } finally {
      setSavingWorkOrder(false)
    }
  }

  async function deleteWorkOrder() {
    if (!workOrder) return
    setError("")
    try {
      await requestJson(`/api/flooring/work-orders/${workOrder.id}`, { method: "DELETE" })
      clearRecordCache()
      onWorkOrderDeleted?.(workOrder.id)
      onClose()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete work order")
    }
  }

  async function addMaterialItem() {
    if (!workOrder) return
    setError("")
    try {
      await materialCollection.createItem(materialDraft)
      setMaterialDraft(defaultMaterialDraft)
      await refreshWorkOrderDetail()
      setMessage("Material item added")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add material item")
    }
  }

  async function saveMaterialItem(item: EditableMaterialItem) {
    if (!workOrder) return
    setError("")
    try {
      await materialCollection.updateItem(item.id, item)
      await refreshWorkOrderDetail()
      setMessage("Material item saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save material item")
    }
  }

  async function deleteMaterialItem(itemId: string) {
    if (!workOrder) return
    setError("")
    try {
      await materialCollection.deleteItem(itemId)
      await refreshWorkOrderDetail()
      setMessage("Material item deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete material item")
    }
  }

  async function addServiceItem() {
    if (!workOrder) return
    setError("")
    try {
      await serviceCollection.createItem(serviceDraft)
      setServiceDraft(defaultServiceDraft)
      await refreshWorkOrderDetail()
      setMessage("Service item added")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add service item")
    }
  }

  async function saveServiceItem(item: EditableServiceItem) {
    if (!workOrder) return
    setError("")
    try {
      await serviceCollection.updateItem(item.id, item)
      await refreshWorkOrderDetail()
      setMessage("Service item saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save service item")
    }
  }

  async function deleteServiceItem(itemId: string) {
    if (!workOrder) return
    setError("")
    try {
      await serviceCollection.deleteItem(itemId)
      await refreshWorkOrderDetail()
      setMessage("Service item deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete service item")
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
      {message ? <SuccessNotice>{message}</SuccessNotice> : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <select value={draft.vacancy} onChange={(event) => setDraft((prev) => (prev ? { ...prev, vacancy: event.target.value as WorkOrderDraft["vacancy"] } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
            <option value="">Select vacancy</option>
            {vacancyOptions.map((vacancy) => (
              <option key={vacancy} value={vacancy}>{vacancy}</option>
            ))}
          </select>
        </RecordFormField>
        <RecordFormField label="Address">
          <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
            {selectedAddress(propertyOptions, draft, workOrder.propertyAddress) || "Select a property or enter a custom address"}
          </div>
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
        <RecordFormField label="Unit Number">
          <input value={draft.unitNumber} onChange={(event) => setDraft((prev) => (prev ? { ...prev, unitNumber: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
        </RecordFormField>
        <RecordFormField label="Instructions">
          <textarea value={draft.instructions} onChange={(event) => setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
        </RecordFormField>
        <RecordFormField label="Notes">
          <textarea value={draft.notes} onChange={(event) => setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
        </RecordFormField>
      </div>

      <MaterialItemsEditor
        title="Material Items"
        description="Editable material lines for this work order."
        items={materialItems}
        draft={materialDraft}
        productOptions={productOptions}
        loading={loading || materialCollection.loading}
        adding={materialCollection.adding}
        savingItemId={materialCollection.savingItemId}
        deletingItemId={materialCollection.deletingItemId}
        onDraftChange={(field, value) => setMaterialDraft((prev) => ({ ...prev, [field]: value }))}
        onAdd={() => void addMaterialItem()}
        onItemFieldChange={(itemId, field, value) => setMaterialItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))}
        onSaveItem={(item) => void saveMaterialItem(item)}
        onDeleteItem={(itemId) => void deleteMaterialItem(itemId)}
      />

      <ServiceItemsEditor
        title="Service Items"
        description="Editable service lines for this work order."
        items={serviceItems}
        draft={serviceDraft}
        serviceOptions={serviceOptions}
        unitOptions={unitOptions}
        loading={loading || serviceCollection.loading}
        adding={serviceCollection.adding}
        savingItemId={serviceCollection.savingItemId}
        deletingItemId={serviceCollection.deletingItemId}
        onDraftChange={(field, value) => setServiceDraft((prev) => ({ ...prev, [field]: value }))}
        onAdd={() => void addServiceItem()}
        onItemFieldChange={(itemId, field, value) => setServiceItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))}
        onSaveItem={(item) => void saveServiceItem(item)}
        onDeleteItem={(itemId) => void deleteServiceItem(itemId)}
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
