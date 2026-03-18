"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { requestJson } from "@/features/flooring/shared/http"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/feedback-states"
import { ErrorNotice, SuccessNotice } from "@/features/flooring/shared/notices"
import { MaterialItemsEditor, type EditableMaterialItem, type MaterialItemDraft, type MaterialItemOption } from "@/features/flooring/shared/material-items-editor"
import { RecordLineSummary } from "@/features/flooring/shared/record-line-summary"
import { RecordFormField } from "@/features/flooring/shared/record-form"
import { ServiceItemsEditor, type EditableServiceItem, type ServiceItemDraft, type ServiceOption, type UnitOption } from "@/features/flooring/shared/service-items-editor"
import { useChildCollection } from "@/features/flooring/shared/use-child-collection"

type PropertyOption = {
  id: string
  name: string
  address: string
}

type WarehouseOption = {
  id: string
  name: string
}

type TemplateOption = {
  id: string
  propertyId: string
  label: string
}

type WorkOrderDetail = {
  id: string
  workOrderNumber: string
  propertyId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  totalMaterialCost: string
  totalServiceCost: string
  totalCost: string
  createdAt: string
  updatedAt: string
  items: EditableMaterialItem[]
  serviceItems: EditableServiceItem[]
}

type WorkOrderDraft = {
  propertyId: string
  warehouseId: string
  status: string
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

type SyncMode = "overwrite" | "append"

type SyncPreview = {
  rowsToCreate: {
    materialItems: number
    serviceItems: number
  }
  rowsToDelete: {
    materialItems: number
    serviceItems: number
  }
  counts: {
    materialItems: number
    serviceItems: number
  }
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

const statusOptions = [
  "DRAFT",
  "BUILDING_ORDER",
  "PENDING_EXPORT",
  "CARPET_CLEANING",
  "SENT_OUT",
  "COMPLETE",
]

const vacancyOptions: Array<"VACANT" | "OCCUPIED"> = ["VACANT", "OCCUPIED"]

function toDraft(workOrder: WorkOrderDetail): WorkOrderDraft {
  return {
    propertyId: workOrder.propertyId,
    warehouseId: workOrder.warehouseId,
    status: workOrder.status,
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
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function selectedAddress(propertyOptions: PropertyOption[], draft: WorkOrderDraft, fallbackAddress: string) {
  if (draft.customAddress.trim()) {
    return draft.customAddress
  }

  return propertyOptions.find((property) => property.id === draft.propertyId)?.address ?? fallbackAddress
}

export function WorkOrderRecordPanel({
  workOrderId,
  propertyOptions,
  warehouseOptions,
  productOptions,
  serviceOptions,
  unitOptions,
  templateOptions,
  onClose,
  onWorkOrderSaved,
  onWorkOrderDeleted,
  onSummaryChange,
}: {
  workOrderId: string
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  templateOptions: TemplateOption[]
  onClose: () => void
  onWorkOrderSaved?: (workOrder: Omit<WorkOrderDetail, "items" | "serviceItems"> & { itemsCount: number }) => void
  onWorkOrderDeleted?: (workOrderId: string) => void
  onSummaryChange?: (summary: { materialItems: EditableMaterialItem[]; serviceItems: EditableServiceItem[] }) => void
}) {
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null)
  const [draft, setDraft] = useState<WorkOrderDraft | null>(null)
  const [materialDraft, setMaterialDraft] = useState<MaterialItemDraft>(defaultMaterialDraft)
  const [serviceDraft, setServiceDraft] = useState<ServiceItemDraft>(defaultServiceDraft)
  const [loading, setLoading] = useState(true)
  const [savingWorkOrder, setSavingWorkOrder] = useState(false)
  const [syncSearch, setSyncSearch] = useState("")
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [syncMode, setSyncMode] = useState<SyncMode>("overwrite")
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null)
  const [syncingTemplate, setSyncingTemplate] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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

  const filteredTemplates = useMemo(() => {
    const activePropertyId = draft?.propertyId ?? ""
    const normalizedSearch = syncSearch.trim().toLowerCase()
    return templateOptions.filter((template) => {
      if (!activePropertyId || template.propertyId !== activePropertyId) {
        return false
      }

      return !normalizedSearch || template.label.toLowerCase().includes(normalizedSearch)
    })
  }, [draft?.propertyId, syncSearch, templateOptions])

  const itemCount = materialItems.length + serviceItems.length

  useEffect(() => {
    onSummaryChange?.({ materialItems, serviceItems })
  }, [materialItems, onSummaryChange, serviceItems])

  const publishWorkOrder = useCallback((nextWorkOrder: WorkOrderDetail) => {
    setWorkOrder(nextWorkOrder)
    setDraft(toDraft(nextWorkOrder))
    onWorkOrderSaved?.({
      ...nextWorkOrder,
      itemsCount: nextWorkOrder.items.length + nextWorkOrder.serviceItems.length,
    })
  }, [onWorkOrderSaved])

  const fetchWorkOrderDetail = useCallback(async () => {
    const payload = await requestJson<{ workOrder: WorkOrderDetail }>(`/api/flooring/work-orders/${workOrderId}`)
    return payload.workOrder
  }, [workOrderId])

  async function refreshWorkOrderDetail() {
    try {
      const nextWorkOrder = await fetchWorkOrderDetail()
      publishWorkOrder(nextWorkOrder)
      setMaterialItems(nextWorkOrder.items ?? [])
      setServiceItems(nextWorkOrder.serviceItems ?? [])
      return nextWorkOrder
    } finally {
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")

      try {
        const nextWorkOrder = await fetchWorkOrderDetail()
        if (cancelled) return
        publishWorkOrder(nextWorkOrder)
        setMaterialItems(nextWorkOrder.items ?? [])
        setServiceItems(nextWorkOrder.serviceItems ?? [])
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load work order")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [fetchWorkOrderDetail, publishWorkOrder, setMaterialItems, setServiceItems])

  useEffect(() => {
    setSyncPreview(null)
  }, [selectedTemplateId, syncMode])

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

  async function previewTemplateSync() {
    if (!workOrder || !selectedTemplateId) return
    setSyncingTemplate(true)
    setError("")

    try {
      const payload = await requestJson<SyncPreview>(`/api/flooring/work-orders/${workOrder.id}/sync-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          mode: syncMode,
          dryRun: true,
          expectedUpdatedAt: workOrder.updatedAt,
        }),
      })
      setSyncPreview(payload)
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Failed to preview template sync")
    } finally {
      setSyncingTemplate(false)
    }
  }

  async function syncTemplate() {
    if (!workOrder || !selectedTemplateId) return
    setSyncingTemplate(true)
    setError("")

    try {
      const payload = await requestJson<{ workOrder: WorkOrderDetail } & SyncPreview>(`/api/flooring/work-orders/${workOrder.id}/sync-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          mode: syncMode,
          dryRun: false,
          expectedUpdatedAt: workOrder.updatedAt,
        }),
      })

      if (!payload.workOrder) {
        throw new Error("Template sync did not return a work order")
      }

      publishWorkOrder(payload.workOrder)
      setMaterialItems(payload.workOrder.items ?? [])
      setServiceItems(payload.workOrder.serviceItems ?? [])
      setSyncPreview({
        rowsToCreate: payload.rowsToCreate,
        rowsToDelete: payload.rowsToDelete,
        counts: payload.counts,
      })
      setIsSyncModalOpen(false)
      setSelectedTemplateId("")
      setSyncSearch("")
      setSyncMode("overwrite")
      setMessage("Template synced into work order")
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Failed to sync template")
    } finally {
      setSyncingTemplate(false)
    }
  }

  if (loading) {
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
            {statusOptions.map((status) => (
              <option key={status} value={status}>{statusLabel(status)}</option>
            ))}
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
        <RecordFormField label="Image URL">
          <input value={draft.workOrderImageUrl} onChange={(event) => setDraft((prev) => (prev ? { ...prev, workOrderImageUrl: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
        </RecordFormField>
        <RecordFormField label="Instructions">
          <textarea value={draft.instructions} onChange={(event) => setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
        </RecordFormField>
        <RecordFormField label="Notes">
          <textarea value={draft.notes} onChange={(event) => setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
        </RecordFormField>
      </div>

      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsSyncModalOpen(true)}
          disabled={!draft.propertyId || draft.status !== "DRAFT"}
          className="rounded border border-blue-500/40 px-4 py-2 text-sm text-blue-500 hover:bg-blue-500/10 disabled:opacity-60"
        >
          Sync Template
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => void deleteWorkOrder()} className="rounded border border-rose-500/40 px-4 py-2 text-sm text-rose-500 hover:bg-rose-500/10">
            Delete Work Order
          </button>
          <button type="button" onClick={onClose} disabled={savingWorkOrder} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
            Close
          </button>
          <button type="button" onClick={() => void saveWorkOrder()} disabled={savingWorkOrder} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {savingWorkOrder ? "Saving..." : "Save Work Order"}
          </button>
        </div>
      </div>

      <MaterialItemsEditor
        title="Material Items"
        description="Editable material lines for this work order."
        items={materialItems}
        draft={materialDraft}
        productOptions={productOptions}
        loading={materialCollection.loading}
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
        loading={serviceCollection.loading}
        adding={serviceCollection.adding}
        savingItemId={serviceCollection.savingItemId}
        deletingItemId={serviceCollection.deletingItemId}
        onDraftChange={(field, value) => setServiceDraft((prev) => ({ ...prev, [field]: value }))}
        onAdd={() => void addServiceItem()}
        onItemFieldChange={(itemId, field, value) => setServiceItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))}
        onSaveItem={(item) => void saveServiceItem(item)}
        onDeleteItem={(itemId) => void deleteServiceItem(itemId)}
      />

      {isSyncModalOpen ? (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--subpanel-background)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Sync Template</h3>
              <p className="text-sm text-[var(--foreground)]/70">Choose a template for this property and copy its material and service rows into the work order.</p>
            </div>
            <button type="button" onClick={() => setIsSyncModalOpen(false)} className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm">
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr),320px]">
            <div className="space-y-3">
              <RecordFormField label="Search Templates">
                <input value={syncSearch} onChange={(event) => setSyncSearch(event.target.value)} placeholder="Search template tag" className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </RecordFormField>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--panel-border)]">
                {filteredTemplates.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--foreground)]/70">No templates available for the selected property.</p>
                ) : (
                  filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`flex w-full items-center justify-between border-t border-[var(--panel-border)] px-4 py-3 text-left first:border-t-0 ${selectedTemplateId === template.id ? "bg-blue-500/10 text-blue-500" : "hover:bg-[var(--panel-hover)]"}`}
                    >
                      <span>{template.label}</span>
                      <span className="text-xs uppercase tracking-[0.18em]">{selectedTemplateId === template.id ? "Selected" : "Open"}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <RecordFormField label="Sync Mode">
                <select value={syncMode} onChange={(event) => setSyncMode(event.target.value as SyncMode)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="overwrite">Overwrite existing rows</option>
                  <option value="append">Append only missing rows</option>
                </select>
              </RecordFormField>
              <p className="rounded-lg border border-[var(--panel-border)] px-3 py-3 text-sm text-[var(--foreground)]/70">
                Sync copies template material and service rows into this draft work order. No pad rows or derived quantity adjustments are applied during sync.
              </p>
              {syncPreview ? (
                <div className="rounded-lg border border-[var(--panel-border)] px-3 py-3 text-sm text-[var(--foreground)]/80">
                  <p>Create: {syncPreview.rowsToCreate.materialItems} material, {syncPreview.rowsToCreate.serviceItems} service</p>
                  <p>Delete: {syncPreview.rowsToDelete.materialItems} material, {syncPreview.rowsToDelete.serviceItems} service</p>
                  <p>Result: {syncPreview.counts.materialItems} material, {syncPreview.counts.serviceItems} service</p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <button type="button" onClick={() => void previewTemplateSync()} disabled={!selectedTemplateId || syncingTemplate} className="flex-1 rounded border border-[var(--panel-border)] px-4 py-2 text-sm disabled:opacity-60">
                  {syncingTemplate ? "Checking..." : "Preview"}
                </button>
                <button type="button" onClick={() => void syncTemplate()} disabled={!selectedTemplateId || syncingTemplate} className="flex-1 rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                  {syncingTemplate ? "Syncing..." : "Apply Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
