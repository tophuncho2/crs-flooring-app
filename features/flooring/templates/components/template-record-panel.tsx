"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/feedback-states"
import { FormStatusNotices } from "@/features/flooring/shared/notices"
import { RecordPanelFooter } from "@/features/flooring/shared/record-panel-footer"
import { buildRecordSummary, emptyRecordSummary } from "@/features/flooring/shared/record-summary"
import { RecordFormField } from "@/features/flooring/shared/record-form"
import {
  MaterialItemsEditor,
  type EditableMaterialItem,
  type MaterialItemDraft,
  type MaterialItemOption,
} from "@/features/flooring/shared/record-items/material-items-editor"
import {
  ServiceItemsEditor,
  type EditableServiceItem,
  type ServiceItemDraft,
  type ServiceOption,
  type UnitOption,
} from "@/features/flooring/shared/record-items/service-items-editor"
import { PrimaryRecordFieldsGrid } from "@/features/flooring/shared/record-items/record-primary-fields"
import { useChildCollection } from "@/features/flooring/shared/record-items/use-child-collection"
import { useRecordLineItemsController } from "@/features/flooring/shared/record-items/use-record-line-items-controller"
import { useRecordDetailController } from "@/features/flooring/shared/record-page/use-record-detail-controller"
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
    getItemId: (item) => item.id,
    pickCreatedItem: (payload) => payload.item as TemplateMaterialItem,
    pickUpdatedItem: (payload) => payload.item as TemplateMaterialItem,
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
    skipReloadAfterMutation: true,
  })
  const serviceCollection = useChildCollection<TemplateServiceItem, ServiceItemDraft, EditableServiceItem>({
    listUrl: `/api/flooring/templates/${templateId}/service-items`,
    createUrl: `/api/flooring/templates/${templateId}/service-items`,
    updateUrl: (itemId) => `/api/flooring/templates/${templateId}/service-items/${itemId}`,
    deleteUrl: (itemId) => `/api/flooring/templates/${templateId}/service-items/${itemId}`,
    mapItems: (payload) => (payload.items as TemplateServiceItem[] | undefined) ?? [],
    getItemId: (item) => item.id,
    pickCreatedItem: (payload) => payload.item as TemplateServiceItem,
    pickUpdatedItem: (payload) => payload.item as TemplateServiceItem,
    serializeCreate: (input) => input,
    serializeUpdate: (item) => item,
    skipReloadAfterMutation: true,
  })

  const onSummaryChangeRef = useRef(onSummaryChange)
  const onTemplateSavedRef = useRef(onTemplateSaved)

  const lineItems = useRecordLineItemsController<TemplateDetail, TemplateMaterialItem, TemplateServiceItem>({
    record: template,
    notices,
    clearParentError: () => setError(""),
    materialCollection,
    serviceCollection,
    initialMaterialDraft: defaultMaterialDraft,
    initialServiceDraft: defaultServiceDraft,
    getCollectionsFromRecord: (record) => ({
      materialItems: record.items ?? [],
      serviceItems: record.serviceItems ?? [],
    }),
    onCollectionsChanged: ({ record, materialItems, serviceItems, action }) => {
      syncRecord(
        {
          ...record,
          items: materialItems,
          serviceItems,
          summary: buildRecordSummary({
            materialItems,
            serviceItems,
          }),
        },
        { syncDraft: false },
      )

      if (action !== "save") {
        onTemplateSavedRef.current?.(record, record.propertyId, materialItems.length + serviceItems.length)
      }
    },
  })

  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange
  }, [onSummaryChange])

  useEffect(() => {
    onTemplateSavedRef.current = onTemplateSaved
  }, [onTemplateSaved])

  useEffect(() => {
    onSummaryChangeRef.current?.({ materialItems: lineItems.materialItems, serviceItems: lineItems.serviceItems })
  }, [lineItems.materialItems, lineItems.serviceItems])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const itemCount = lineItems.materialItems.length + lineItems.serviceItems.length

  const syncTemplateCollections = useCallback(
    (nextMaterialItems: TemplateMaterialItem[], nextServiceItems: TemplateServiceItem[]) => ({
      items: nextMaterialItems,
      serviceItems: nextServiceItems,
      summary: buildRecordSummary({
        materialItems: nextMaterialItems,
        serviceItems: nextServiceItems,
      }),
    }),
    [],
  )

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
        ...syncTemplateCollections(lineItems.materialItems, lineItems.serviceItems),
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
        description="Service rows included in this template."
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
