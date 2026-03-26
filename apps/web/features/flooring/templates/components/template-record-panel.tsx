"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/ui/feedback/feedback-states"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordPanelFooter } from "@/features/flooring/shared/ui/forms/record-panel-footer"
import { buildRecordSummary } from "@/features/flooring/shared/domain/record-summary"
import { AutoGrowTextarea } from "@/features/flooring/shared/ui/forms/auto-grow-textarea"
import { RecordFormField } from "@/features/flooring/shared/ui/forms/record-form"
import {
  MaterialItemsEditor,
  type EditableMaterialItem,
  type MaterialItemDraft,
  type MaterialItemOption,
} from "@/features/flooring/shared/ui/record-items/material-items-editor"
import {
  ServiceItemsEditor,
  type EditableServiceItem,
  type ServiceItemDraft,
  type ServiceOption,
  type UnitOption,
} from "@/features/flooring/shared/ui/record-items/service-items-editor"
import { SalesRepItemsEditor, type SalesRepDraft } from "@/features/flooring/shared/ui/record-items/sales-rep-items-editor"
import { CalculationRowsTable } from "@/features/flooring/shared/ui/record-items/calculation-rows-table"
import { PrimaryRecordFieldsGrid } from "@/features/flooring/shared/ui/record-items/record-primary-fields"
import { useChildCollection } from "@/features/flooring/shared/controllers/record-items/use-child-collection"
import { useRecordLineItemsController } from "@/features/flooring/shared/controllers/record-items/use-record-line-items-controller"
import { useRecordSalesRepsController } from "@/features/flooring/shared/controllers/record-items/use-record-sales-reps-controller"
import { useReadOnlyChildCollection } from "@/features/flooring/shared/controllers/record-items/use-read-only-child-collection"
import { buildRecordCalculationRowsFromSummary, type CalculationRow } from "@/features/flooring/shared/domain/record-calculation-rows"
import { useRecordDetailController } from "@/features/flooring/shared/controllers/record-page/use-record-detail-controller"
import { useRecordNotices } from "@/features/flooring/shared/controllers/record-page/use-record-notices"
import { normalizeTemplateExpenseSummary } from "@/features/flooring/templates/domain/expense-summary"
import type { EditableTemplateSalesRep } from "@/features/flooring/templates/domain/sales-reps"
import type { DraftTemplate, SalesRepContactOption, TemplateDetail, TemplateRow } from "@/features/flooring/templates/types"

type TemplateMaterialItem = EditableMaterialItem
type TemplateServiceItem = EditableServiceItem

function toTemplateDraft(template: TemplateDetail): DraftTemplate {
  return {
    templateTag: template.templateTag,
    propertyId: template.propertyId,
    unitType: template.unitType,
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

const defaultSalesRepDraft: SalesRepDraft = {
  contactId: "",
  percent: "",
}

export function TemplateRecordPanel({
  templateId,
  initialTemplate,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  onClose,
  onTemplateSaved,
  onTemplateDeleted,
  onSummaryChange,
  onDirtyChange,
}: {
  templateId: string
  initialTemplate: TemplateDetail
  propertyOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  onClose: () => void
  onTemplateSaved?: (template: TemplateRow, previousPropertyId: string, itemsCount: number) => void
  onTemplateDeleted?: (templateId: string, propertyId: string) => void
  onSummaryChange?: (summary: { materialItems: EditableMaterialItem[]; serviceItems: EditableServiceItem[] }) => void
  onDirtyChange?: (value: boolean) => void
}) {
  const initialTemplateDetail = useMemo<TemplateDetail>(() => initialTemplate, [initialTemplate])
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
  } = useRecordDetailController<TemplateDetail, DraftTemplate>({
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
  const salesRepCollection = useChildCollection<EditableTemplateSalesRep, SalesRepDraft, EditableTemplateSalesRep>({
    listUrl: `/api/flooring/templates/${templateId}/sales-reps`,
    createUrl: `/api/flooring/templates/${templateId}/sales-reps`,
    updateUrl: (repId) => `/api/flooring/templates/${templateId}/sales-reps/${repId}`,
    deleteUrl: (repId) => `/api/flooring/templates/${templateId}/sales-reps/${repId}`,
    mapItems: (payload) => (payload.items as EditableTemplateSalesRep[] | undefined) ?? [],
    getItemId: (item) => item.id,
    pickCreatedItem: (payload) => payload.item as EditableTemplateSalesRep,
    pickUpdatedItem: (payload) => payload.item as EditableTemplateSalesRep,
    serializeCreate: (input) => input,
    serializeUpdate: (item) => ({
      contactId: item.contactId,
      percent: item.percent,
    }),
    skipReloadAfterMutation: true,
  })
  const initialCalculationRows = buildRecordCalculationRowsFromSummary(initialTemplateDetail.expenseSummary)
  const calculationRowsCollection = useReadOnlyChildCollection<CalculationRow>({
    listUrl: `/api/flooring/templates/${templateId}/calculations`,
    mapItems: (payload) => (payload.items as CalculationRow[] | undefined) ?? [],
    initialItems: initialCalculationRows,
  })
  const {
    items: calculationRows,
    loading: loadingCalculationRows,
    setItems: setCalculationRows,
  } = calculationRowsCollection

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
          salesReps: salesRepCollection.items,
          summary: buildRecordSummary({
            materialItems,
            serviceItems,
          }),
          expenseSummary: normalizeTemplateExpenseSummary({
            items: materialItems,
            serviceItems,
            salesReps: salesRepCollection.items,
          }),
        },
        { syncDraft: false },
      )

      if (action !== "save") {
        onTemplateSavedRef.current?.(record, record.propertyId, materialItems.length + serviceItems.length)
      }
    },
  })

  const salesRepLines = useRecordSalesRepsController({
    record: template,
    notices,
    clearParentError: () => setError(""),
    salesRepCollection,
    initialDraft: defaultSalesRepDraft,
    getItemsFromRecord: (record: TemplateDetail) => record.salesReps ?? [],
    onItemsChanged: ({ record, salesReps }) => {
      syncRecord(
        {
          ...record,
          salesReps,
          summary: buildRecordSummary({
            materialItems: lineItems.materialItems,
            serviceItems: lineItems.serviceItems,
          }),
          expenseSummary: normalizeTemplateExpenseSummary({
            items: lineItems.materialItems,
            serviceItems: lineItems.serviceItems,
            salesReps,
          }),
        },
        { syncDraft: false },
      )
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
  const currentExpenseSummary = normalizeTemplateExpenseSummary({
    items: lineItems.materialItems,
    serviceItems: lineItems.serviceItems,
    salesReps: salesRepLines.salesReps,
  })
  const currentCalculationRows = buildRecordCalculationRowsFromSummary(currentExpenseSummary)

  useEffect(() => {
    setCalculationRows(currentCalculationRows)
  }, [currentCalculationRows, setCalculationRows])

  const syncTemplateCollections = useCallback(
    (
      nextMaterialItems: TemplateMaterialItem[],
      nextServiceItems: TemplateServiceItem[],
      nextSalesReps: EditableTemplateSalesRep[],
    ) => ({
      items: nextMaterialItems,
      serviceItems: nextServiceItems,
      salesReps: nextSalesReps,
      summary: buildRecordSummary({
        materialItems: nextMaterialItems,
        serviceItems: nextServiceItems,
      }),
      expenseSummary: normalizeTemplateExpenseSummary({
        items: nextMaterialItems,
        serviceItems: nextServiceItems,
        salesReps: nextSalesReps,
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
      const payload = await requestJson<{ template: TemplateRow }>(`/api/flooring/templates/${template.id}`, {
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
        ...syncTemplateCollections(lineItems.materialItems, lineItems.serviceItems, salesRepLines.salesReps),
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
          <RecordFormField label="Unit Type">
            <input value={draft.unitType} onChange={(event) => setDraft((prev) => (prev ? { ...prev, unitType: event.target.value } : prev))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
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
            <AutoGrowTextarea
              value={draft.instructions}
              onChange={(event) => setDraft((prev) => (prev ? { ...prev, instructions: event.target.value } : prev))}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Template Notes">
            <AutoGrowTextarea
              value={draft.templateNotes}
              onChange={(event) => setDraft((prev) => (prev ? { ...prev, templateNotes: event.target.value } : prev))}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
        </PrimaryRecordFieldsGrid>
      </div>

      <MaterialItemsEditor
        title="Material Items"
        items={lineItems.materialItems}
        draft={lineItems.materialDraft}
        productOptions={productOptions}
        totalAmount={currentExpenseSummary.materialTotal}
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
        items={lineItems.serviceItems}
        draft={lineItems.serviceDraft}
        serviceOptions={serviceOptions}
        unitOptions={unitOptions}
        totalAmount={currentExpenseSummary.serviceTotal}
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

      <CalculationRowsTable
        title="Calculations"
        items={calculationRows}
        loading={loadingCalculationRows}
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
