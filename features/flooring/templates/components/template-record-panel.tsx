"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/http"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/feedback-states"
import { FormStatusNotices } from "@/features/flooring/shared/notices"
import { RecordPanelFooter } from "@/features/flooring/shared/record-panel-footer"
import { buildRecordSummary, emptyRecordSummary } from "@/features/flooring/shared/record-summary"
import { RecordFormField } from "@/features/flooring/shared/record-form"
import { MaterialItemsEditor, type EditableMaterialItem, type MaterialItemDraft, type MaterialItemField, type MaterialItemFieldErrors, type MaterialItemOption, validateMaterialItemFields } from "@/features/flooring/shared/material-items-editor"
import { ServiceItemsEditor, type EditableServiceItem, type ServiceItemDraft, type ServiceItemField, type ServiceItemFieldErrors, type ServiceOption, type UnitOption, validateServiceItemFields } from "@/features/flooring/shared/service-items-editor"
import { clearFieldError, clearRowFieldError, getRequestFieldError, setFieldError, setRowFieldErrors, type RowFieldErrors } from "@/features/flooring/shared/record-field-errors"
import { PrimaryRecordFieldsGrid } from "@/features/flooring/shared/record-primary-fields"
import { useChildCollection } from "@/features/flooring/shared/use-child-collection"
import { useRecordDetailController } from "@/features/flooring/shared/use-record-detail-controller"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"

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
type TemplateDetail = TemplatePanelRow & {
  items: TemplateMaterialItem[]
  serviceItems: TemplateServiceItem[]
  summary: ReturnType<typeof buildRecordSummary>
}

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
  initialTemplate,
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
  onDirtyChange,
}: {
  templateId: string
  initialTemplate: TemplatePanelRow
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
  onDirtyChange?: (value: boolean) => void
}) {
  const initialTemplateDetail = useMemo<TemplateDetail>(
    () => ({
      ...initialTemplate,
      items: [],
      serviceItems: [],
      summary: emptyRecordSummary(),
    }),
    [initialTemplate],
  )
  const [materialDraft, setMaterialDraft] = useState<MaterialItemDraft>({ productId: "", quantity: "", unitPrice: "", notes: "" })
  const [serviceDraft, setServiceDraft] = useState<ServiceItemDraft>({ serviceId: "", name: "", unitId: "", quantity: "", unitPrice: "", notes: "" })
  const [materialDraftErrors, setMaterialDraftErrors] = useState<MaterialItemFieldErrors>({})
  const [materialItemErrors, setMaterialItemErrors] = useState<RowFieldErrors<MaterialItemField>>({})
  const [serviceDraftErrors, setServiceDraftErrors] = useState<ServiceItemFieldErrors>({})
  const [serviceItemErrors, setServiceItemErrors] = useState<RowFieldErrors<ServiceItemField>>({})
  const [savingTemplate, setSavingTemplate] = useState(false)
  const notices = useRecordNotices()
  const {
    record: template,
    draft,
    setDraft,
    loading,
    error,
    setError,
    syncRecord,
    clearRecordCache,
    isDirty,
  } = useRecordDetailController<TemplateDetail, TemplatePanelDraft>({
    scope: "template",
    id: templateId,
    initialRecord: initialTemplateDetail,
    toDraft: toTemplateDraft,
    url: `/api/flooring/templates/${templateId}`,
    payloadKey: "template",
  })

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
  const onSummaryChangeRef = useRef(onSummaryChange)
  const onTemplateSavedRef = useRef(onTemplateSaved)

  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange
  }, [onSummaryChange])

  useEffect(() => {
    onTemplateSavedRef.current = onTemplateSaved
  }, [onTemplateSaved])

  useEffect(() => {
    onSummaryChangeRef.current?.({ materialItems, serviceItems })
  }, [materialItems, serviceItems])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (!template) {
      return
    }

    setMaterialItems(template.items ?? [])
    setServiceItems(template.serviceItems ?? [])
  }, [setMaterialItems, setServiceItems, template])

  async function saveTemplate() {
    if (!template || !draft) return
    setSavingTemplate(true)
    setError("")
    notices.clearNotices()

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

      syncRecord({
        ...payload.template,
        items: materialItems,
        serviceItems,
        summary: buildRecordSummary({
          materialItems,
          serviceItems,
        }),
      })
      notices.showSuccess("Template saved")
      onTemplateSavedRef.current?.(payload.template, previousPropertyId, itemCount)
    } catch (saveError) {
      notices.showError(saveError instanceof Error ? saveError.message : "Failed to save template")
    } finally {
      setSavingTemplate(false)
    }
  }

  async function deleteTemplate() {
    if (!template) return
    setError("")
    notices.clearNotices()

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/templates/${template.id}`, { method: "DELETE" })
      clearRecordCache()
      onTemplateDeleted?.(template.id, template.propertyId)
      onClose()
    } catch (deleteError) {
      notices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete template")
    }
  }

  async function addMaterialItem(): Promise<boolean> {
    if (!template) return false
    setError("")
    notices.clearNotices()
    const validationErrors = validateMaterialItemFields(materialDraft)
    if (Object.keys(validationErrors).length > 0) {
      setMaterialDraftErrors(validationErrors)
      notices.showError("Fix the highlighted material item fields before adding.")
      return false
    }

    try {
      const nextMaterialItems = await materialCollection.createItem(materialDraft)
      setMaterialDraft({ productId: "", quantity: "", unitPrice: "", notes: "" })
      setMaterialDraftErrors({})
      syncRecord({
        ...template,
        items: nextMaterialItems,
        serviceItems,
        summary: buildRecordSummary({
          materialItems: nextMaterialItems,
          serviceItems,
        }),
      }, { syncDraft: false })
      notices.showSuccess("Material item added")
      onTemplateSavedRef.current?.(template, template.propertyId, nextMaterialItems.length + serviceItems.length)
      return true
    } catch (saveError) {
      const fieldError = getRequestFieldError(saveError)
      if (fieldError.field === "productId" || fieldError.field === "quantity") {
        const field = fieldError.field
        setMaterialDraftErrors(setFieldError(field, fieldError.message))
      }
      notices.showError(fieldError.message || "Failed to add template item")
      return false
    }
  }

  async function saveMaterialItem(item: EditableMaterialItem) {
    if (!template) return
    setError("")
    notices.clearNotices()
    const validationErrors = validateMaterialItemFields(item)
    if (Object.keys(validationErrors).length > 0) {
      setMaterialItemErrors((previous) => setRowFieldErrors(previous, item.id, validationErrors))
      notices.showError("Fix the highlighted material item fields before saving.")
      return
    }

    try {
      const nextMaterialItems = await materialCollection.updateItem(item.id, item)
      setMaterialItemErrors((previous) => setRowFieldErrors(previous, item.id, {}))
      syncRecord({
        ...template,
        items: nextMaterialItems,
        serviceItems,
        summary: buildRecordSummary({
          materialItems: nextMaterialItems,
          serviceItems,
        }),
      }, { syncDraft: false })
      notices.showSuccess("Material item saved")
    } catch (saveError) {
      const fieldError = getRequestFieldError(saveError)
      if (fieldError.field === "productId" || fieldError.field === "quantity") {
        const field = fieldError.field
        setMaterialItemErrors((previous) => setRowFieldErrors(previous, item.id, setFieldError(field, fieldError.message)))
      }
      notices.showError(fieldError.message || "Failed to save template item")
    }
  }

  async function deleteMaterialItem(itemId: string) {
    if (!template) return
    setError("")
    notices.clearNotices()
    try {
      const nextMaterialItems = await materialCollection.deleteItem(itemId)
      setMaterialItemErrors((previous) => setRowFieldErrors(previous, itemId, {}))
      syncRecord({
        ...template,
        items: nextMaterialItems,
        serviceItems,
        summary: buildRecordSummary({
          materialItems: nextMaterialItems,
          serviceItems,
        }),
      }, { syncDraft: false })
      notices.showSuccess("Material item deleted")
      onTemplateSavedRef.current?.(template, template.propertyId, nextMaterialItems.length + serviceItems.length)
    } catch (deleteError) {
      notices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete template item")
    }
  }

  async function addServiceItem(): Promise<boolean> {
    if (!template) return false
    setError("")
    notices.clearNotices()
    const validationErrors = validateServiceItemFields(serviceDraft)
    if (Object.keys(validationErrors).length > 0) {
      setServiceDraftErrors(validationErrors)
      notices.showError("Fix the highlighted service item fields before adding.")
      return false
    }

    try {
      const nextServiceItems = await serviceCollection.createItem(serviceDraft)
      setServiceDraft({ serviceId: "", name: "", unitId: "", quantity: "", unitPrice: "", notes: "" })
      setServiceDraftErrors({})
      syncRecord({
        ...template,
        items: materialItems,
        serviceItems: nextServiceItems,
        summary: buildRecordSummary({
          materialItems,
          serviceItems: nextServiceItems,
        }),
      }, { syncDraft: false })
      notices.showSuccess("Service item added")
      onTemplateSavedRef.current?.(template, template.propertyId, materialItems.length + nextServiceItems.length)
      return true
    } catch (saveError) {
      const fieldError = getRequestFieldError(saveError)
      if (fieldError.field === "name" || fieldError.field === "unitId" || fieldError.field === "quantity") {
        const field = fieldError.field
        setServiceDraftErrors(setFieldError(field, fieldError.message))
      }
      notices.showError(fieldError.message || "Failed to add template service item")
      return false
    }
  }

  async function saveServiceItem(item: EditableServiceItem) {
    if (!template) return
    setError("")
    notices.clearNotices()
    const validationErrors = validateServiceItemFields(item)
    if (Object.keys(validationErrors).length > 0) {
      setServiceItemErrors((previous) => setRowFieldErrors(previous, item.id, validationErrors))
      notices.showError("Fix the highlighted service item fields before saving.")
      return
    }

    try {
      const nextServiceItems = await serviceCollection.updateItem(item.id, item)
      setServiceItemErrors((previous) => setRowFieldErrors(previous, item.id, {}))
      syncRecord({
        ...template,
        items: materialItems,
        serviceItems: nextServiceItems,
        summary: buildRecordSummary({
          materialItems,
          serviceItems: nextServiceItems,
        }),
      }, { syncDraft: false })
      notices.showSuccess("Service item saved")
    } catch (saveError) {
      const fieldError = getRequestFieldError(saveError)
      if (fieldError.field === "name" || fieldError.field === "unitId" || fieldError.field === "quantity") {
        const field = fieldError.field
        setServiceItemErrors((previous) => setRowFieldErrors(previous, item.id, setFieldError(field, fieldError.message)))
      }
      notices.showError(fieldError.message || "Failed to save template service item")
    }
  }

  async function deleteServiceItem(itemId: string) {
    if (!template) return
    setError("")
    notices.clearNotices()
    try {
      const nextServiceItems = await serviceCollection.deleteItem(itemId)
      setServiceItemErrors((previous) => setRowFieldErrors(previous, itemId, {}))
      syncRecord({
        ...template,
        items: materialItems,
        serviceItems: nextServiceItems,
        summary: buildRecordSummary({
          materialItems,
          serviceItems: nextServiceItems,
        }),
      }, { syncDraft: false })
      notices.showSuccess("Service item deleted")
      onTemplateSavedRef.current?.(template, template.propertyId, materialItems.length + nextServiceItems.length)
    } catch (deleteError) {
      notices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete template service item")
    }
  }

  if (loading && !template) {
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
      <FormStatusNotices message={notices.message} error={notices.error} loadingMessage={savingTemplate ? "Saving template..." : ""} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        <PrimaryRecordFieldsGrid className="xl:grid-cols-2">
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
        </PrimaryRecordFieldsGrid>

        <PrimaryRecordFieldsGrid className="md:grid-cols-1 xl:grid-cols-1">
          <RecordFormField label="Instructions">
            <textarea value={draft.instructions} onChange={(event) => setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Template Notes">
            <textarea value={draft.templateNotes} onChange={(event) => setDraft((prev) => (prev ? { ...prev, templateNotes: event.target.value } : prev))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
        </PrimaryRecordFieldsGrid>
      </div>

      <MaterialItemsEditor
        title="Material Items"
        description="Products and quantities included in this template."
        items={materialItems}
        draft={materialDraft}
        productOptions={productOptions}
        loading={loading || materialCollection.loading}
        adding={materialCollection.adding}
        savingItemId={materialCollection.savingItemId}
        deletingItemId={materialCollection.deletingItemId}
        draftErrors={materialDraftErrors}
        itemErrors={materialItemErrors}
        onDraftChange={(field, value) => {
          setMaterialDraft((prev) => ({ ...prev, [field]: value }))
          if (field === "productId" || field === "quantity") {
            setMaterialDraftErrors((previous) => clearFieldError(previous, field))
          }
        }}
        onAdd={() => addMaterialItem()}
        onItemFieldChange={(itemId, field, value) => {
          setMaterialItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
          if (field === "productId" || field === "quantity") {
            setMaterialItemErrors((previous) => clearRowFieldError(previous, itemId, field))
          }
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
        loading={loading || serviceCollection.loading}
        adding={serviceCollection.adding}
        savingItemId={serviceCollection.savingItemId}
        deletingItemId={serviceCollection.deletingItemId}
        draftErrors={serviceDraftErrors}
        itemErrors={serviceItemErrors}
        onDraftChange={(field, value) => {
          setServiceDraft((prev) => ({ ...prev, [field]: value }))
          if (field === "name" || field === "unitId" || field === "quantity") {
            setServiceDraftErrors((previous) => clearFieldError(previous, field))
          }
        }}
        onAdd={() => addServiceItem()}
        onItemFieldChange={(itemId, field, value) => {
          setServiceItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
          if (field === "name" || field === "unitId" || field === "quantity") {
            setServiceItemErrors((previous) => clearRowFieldError(previous, itemId, field))
          }
        }}
        onSaveItem={(item) => void saveServiceItem(item)}
        onDeleteItem={(itemId) => void deleteServiceItem(itemId)}
      />

      <RecordPanelFooter
        deleteLabel="Delete Template"
        deleteConfirmMessage="Delete this template? This cannot be undone."
        onDelete={() => void deleteTemplate()}
        onClose={onClose}
        saveLabel="Save Template"
        savingLabel="Saving..."
        onSave={() => void saveTemplate()}
        isSaving={savingTemplate}
      />
    </div>
  )
}
