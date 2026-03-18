"use client"

import { useEffect, useMemo, useState } from "react"
import { requestJson } from "@/features/flooring/shared/http"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/feedback-states"
import { ErrorNotice, SuccessNotice } from "@/features/flooring/shared/notices"
import { RecordLineSummary } from "@/features/flooring/shared/record-line-summary"
import { RecordFormField } from "@/features/flooring/shared/record-form"
import { MaterialItemsEditor, type EditableMaterialItem, type MaterialItemDraft, type MaterialItemOption } from "@/features/flooring/shared/material-items-editor"
import { ServiceItemsEditor, type EditableServiceItem, type ServiceItemDraft, type ServiceOption, type UnitOption } from "@/features/flooring/shared/service-items-editor"
import { useChildCollection } from "@/features/flooring/shared/use-child-collection"

export type TemplatePanelRow = {
  id: string
  templateNumber: string
  templateTag: string
  propertyId: string
  propertyName: string
  warehouseId: string
  warehouseName: string
  instructions: string
  templateNotes: string
  padProductId: string
  padTypeLabel: string
  createdAt: string
  updatedAt: string
}

export type TemplatePanelDraft = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
}

type TemplateMaterialItem = EditableMaterialItem
type TemplateServiceItem = EditableServiceItem

function toTemplateDraft(template: TemplatePanelRow): TemplatePanelDraft {
  return {
    templateTag: template.templateTag,
    propertyId: template.propertyId,
    warehouseId: template.warehouseId,
    instructions: template.instructions,
    templateNotes: template.templateNotes,
    padProductId: template.padProductId,
  }
}

export function TemplateRecordPanel({
  templateId,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  unitOptions,
  onClose,
  onTemplateSaved,
  onTemplateDeleted,
  onSummaryChange,
}: {
  templateId: string
  propertyOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  onClose: () => void
  onTemplateSaved?: (template: TemplatePanelRow, previousPropertyId: string, itemsCount: number) => void
  onTemplateDeleted?: (templateId: string, propertyId: string) => void
  onSummaryChange?: (summary: { materialItems: EditableMaterialItem[]; serviceItems: EditableServiceItem[] }) => void
}) {
  const [template, setTemplate] = useState<TemplatePanelRow | null>(null)
  const [draft, setDraft] = useState<TemplatePanelDraft | null>(null)
  const [materialDraft, setMaterialDraft] = useState<MaterialItemDraft>({ productId: "", quantity: "", unitPrice: "", notes: "" })
  const [serviceDraft, setServiceDraft] = useState<ServiceItemDraft>({ serviceId: "", name: "", unitId: "", quantity: "", unitPrice: "", notes: "" })
  const [loading, setLoading] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const materialCollection = useChildCollection<TemplateMaterialItem, MaterialItemDraft, EditableMaterialItem>({
    listUrl: `/api/flooring/templates/${templateId}/items`,
    createUrl: `/api/flooring/templates/${templateId}/items`,
    updateUrl: (itemId) => `/api/flooring/templates/${templateId}/items/${itemId}`,
    deleteUrl: (itemId) => `/api/flooring/templates/${templateId}/items/${itemId}`,
    mapItems: (payload) =>
      ((payload.items as Array<{ id: string; productId: string; productName: string; sendUnit: string; quantity: string; unitPrice: string; notes: string }> | undefined) ?? []),
    serializeCreate: (input) => ({
      productId: input.productId,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      notes: input.notes,
    }),
    serializeUpdate: (item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
    }),
  })
  const serviceCollection = useChildCollection<TemplateServiceItem, ServiceItemDraft, EditableServiceItem>({
    listUrl: `/api/flooring/templates/${templateId}/service-items`,
    createUrl: `/api/flooring/templates/${templateId}/service-items`,
    updateUrl: (itemId) => `/api/flooring/templates/${templateId}/service-items/${itemId}`,
    deleteUrl: (itemId) => `/api/flooring/templates/${templateId}/service-items/${itemId}`,
    mapItems: (payload) => (payload.items as TemplateServiceItem[] | undefined) ?? [],
    serializeCreate: (input) => input,
    serializeUpdate: (item) => item,
  })

  const setMaterialItems = materialCollection.setItems
  const setServiceItems = serviceCollection.setItems
  const materialItems = materialCollection.items
  const serviceItems = serviceCollection.items

  const itemCount = useMemo(() => materialItems.length + serviceItems.length, [materialItems.length, serviceItems.length])

  useEffect(() => {
    onSummaryChange?.({ materialItems, serviceItems })
  }, [materialItems, onSummaryChange, serviceItems])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")

      try {
        const [templatePayload, materialPayload, servicePayload] = await Promise.all([
          requestJson<{ template: TemplatePanelRow }>(`/api/flooring/templates/${templateId}`),
          requestJson<{ items?: Array<{ id: string; productId: string; productName: string; sendUnit: string; quantity: string; unitPrice: string; notes: string }> }>(
            `/api/flooring/templates/${templateId}/items`,
          ),
          requestJson<{ items?: Array<{ id: string; serviceId: string; name: string; unitId: string; unitName: string; quantity: string; unitPrice: string; notes: string }> }>(
            `/api/flooring/templates/${templateId}/service-items`,
          ),
        ])

        if (cancelled) return

        setTemplate(templatePayload.template)
        setDraft(toTemplateDraft(templatePayload.template))
        setMaterialItems(materialPayload.items ?? [])
        setServiceItems(servicePayload.items ?? [])
      } catch (loadError) {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load template")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [setMaterialItems, setServiceItems, templateId])

  async function saveTemplate() {
    if (!template || !draft) return
    setSavingTemplate(true)
    setError("")

    try {
      const previousPropertyId = template.propertyId
      const payload = await requestJson<{ template: TemplatePanelRow }>(`/api/flooring/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          warehouseId: draft.warehouseId || null,
          padProductId: draft.padProductId || null,
        }),
      })

      setTemplate(payload.template)
      setDraft(toTemplateDraft(payload.template))
      setMessage("Template saved")
      onTemplateSaved?.(payload.template, previousPropertyId, itemCount)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template")
    } finally {
      setSavingTemplate(false)
    }
  }

  async function deleteTemplate() {
    if (!template) return
    setError("")

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/templates/${template.id}`, { method: "DELETE" })
      onTemplateDeleted?.(template.id, template.propertyId)
      onClose()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template")
    }
  }

  async function addMaterialItem() {
    if (!template) return
    setError("")
    try {
      const nextMaterialItems = await materialCollection.createItem(materialDraft)
      setMaterialDraft({ productId: "", quantity: "", unitPrice: "", notes: "" })
      setMessage("Template item added")
      onTemplateSaved?.(template, template.propertyId, nextMaterialItems.length + serviceItems.length)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add template item")
    }
  }

  async function saveMaterialItem(item: EditableMaterialItem) {
    if (!template) return
    setError("")
    try {
      await materialCollection.updateItem(item.id, item)
      setMessage("Template item saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template item")
    }
  }

  async function deleteMaterialItem(itemId: string) {
    if (!template) return
    setError("")
    try {
      const nextMaterialItems = await materialCollection.deleteItem(itemId)
      setMessage("Template item deleted")
      onTemplateSaved?.(template, template.propertyId, nextMaterialItems.length + serviceItems.length)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template item")
    }
  }

  async function addServiceItem() {
    if (!template) return
    setError("")
    try {
      const nextServiceItems = await serviceCollection.createItem(serviceDraft)
      setServiceDraft({ serviceId: "", name: "", unitId: "", quantity: "", unitPrice: "", notes: "" })
      setMessage("Template service item added")
      onTemplateSaved?.(template, template.propertyId, materialItems.length + nextServiceItems.length)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add template service item")
    }
  }

  async function saveServiceItem(item: EditableServiceItem) {
    if (!template) return
    setError("")
    try {
      await serviceCollection.updateItem(item.id, item)
      setMessage("Template service item saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template service item")
    }
  }

  async function deleteServiceItem(itemId: string) {
    if (!template) return
    setError("")
    try {
      const nextServiceItems = await serviceCollection.deleteItem(itemId)
      setMessage("Template service item deleted")
      onTemplateSaved?.(template, template.propertyId, materialItems.length + nextServiceItems.length)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template service item")
    }
  }

  if (loading) {
    return <CenteredLoadingState label="Loading template..." />
  }

  if (error && (!template || !draft)) {
    return <CenteredErrorState title="Error" message={error} onDismiss={onClose} />
  }

  if (!template || !draft) {
    return <CenteredErrorState title="Error" message="Template could not be loaded." onDismiss={onClose} />
  }

  return (
    <div className="space-y-6">
      {message ? <SuccessNotice>{message}</SuccessNotice> : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFormField label="Property">
            <select value={draft.propertyId} onChange={(event) => setDraft((prev) => (prev ? { ...prev, propertyId: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2">
              <option value="">Select property</option>
              {propertyOptions.map((property) => (
                <option key={property.id} value={property.id}>{property.name}</option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Template Tag">
            <input value={draft.templateTag} onChange={(event) => setDraft((prev) => (prev ? { ...prev, templateTag: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Warehouse">
            <select value={draft.warehouseId} onChange={(event) => setDraft((prev) => (prev ? { ...prev, warehouseId: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
              <option value="">No warehouse</option>
              {warehouseOptions.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Pad Type">
            <select value={draft.padProductId} onChange={(event) => setDraft((prev) => (prev ? { ...prev, padProductId: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2">
              <option value="">No pad type</option>
              {padProductOptions.map((product) => (
                <option key={product.id} value={product.id}>{product.label}</option>
              ))}
            </select>
          </RecordFormField>
        </div>

        <div className="grid gap-4">
          <RecordFormField label="Instructions">
            <textarea value={draft.instructions} onChange={(event) => setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Template Notes">
            <textarea value={draft.templateNotes} onChange={(event) => setDraft((prev) => (prev ? { ...prev, templateNotes: event.target.value } : prev))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
        </div>
      </div>

      <MaterialItemsEditor
        title="Material Items"
        description="Products and quantities included in this template."
        items={materialItems}
        draft={materialDraft}
        productOptions={productOptions}
        loading={materialCollection.loading}
        adding={materialCollection.adding}
        savingItemId={materialCollection.savingItemId}
        deletingItemId={materialCollection.deletingItemId}
        onDraftChange={(field, value) => setMaterialDraft((prev) => ({ ...prev, [field]: value }))}
        onAdd={() => void addMaterialItem()}
        onItemFieldChange={(itemId, field, value) => {
          setMaterialItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
        }}
        onSaveItem={(item) => void saveMaterialItem(item)}
        onDeleteItem={(itemId) => void deleteMaterialItem(itemId)}
      />

      <ServiceItemsEditor
        title="Service Items"
        description="Service rows included in this template."
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
        onItemFieldChange={(itemId, field, value) => {
          setServiceItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
        }}
        onSaveItem={(item) => void saveServiceItem(item)}
        onDeleteItem={(itemId) => void deleteServiceItem(itemId)}
      />

      <div className="flex justify-between gap-2">
        <button type="button" onClick={() => void deleteTemplate()} className="rounded border border-rose-500/40 px-4 py-2 text-sm text-rose-500 hover:bg-rose-500/10">
          Delete Template
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={savingTemplate} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
            Close
          </button>
          <button type="button" onClick={() => void saveTemplate()} disabled={savingTemplate} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {savingTemplate ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  )
}
