"use client"

import { useCallback, useMemo } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { getConflictSnapshot, withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { CenteredErrorState, CenteredLoadingState } from "@/features/dashboard/shared/feedback/feedback-states"
import { RecordMultiSectionPanel, RecordPrimarySectionInstance, useRecordDetailController, type RecordDetailClientScaffoldContext } from "@/features/shared/engines/record-view"
import { buildRecordCalculationRowsFromSummary } from "@/features/flooring/shared/domain/record-calculation-rows"
import { formatCurrencyValue } from "@/features/flooring/shared/domain/line-totals"
import { normalizeTemplateExpenseSummary } from "@/features/flooring/templates/domain/expense-summary"
import { buildDeleteConfirmationMessage, confirmRecordDelete } from "@/features/flooring/shared/ui/table/confirm-delete"
import { TemplateCalculationsSection } from "./sections/template-calculations-section"
import { TemplateMaterialItemsSection } from "./sections/template-material-items-section"
import { TemplatePrimaryFieldsSection } from "./sections/template-primary-fields-section"
import { TemplateSalesRepsSection } from "./sections/template-sales-reps-section"
import { TemplateServiceItemsSection } from "./sections/template-service-items-section"
import { useTemplateMaterialSection } from "./controllers/use-template-material-section"
import { useTemplatePrimarySection } from "./controllers/use-template-primary-section"
import { useTemplateSalesRepsSection } from "./controllers/use-template-sales-reps-section"
import { useTemplateServiceSection } from "./controllers/use-template-service-section"
import type { MaterialItemOption } from "@/features/flooring/shared/line-items/material-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/line-items/service-items-editor"
import type { SalesRepContactOption, TemplateDetail } from "@/features/flooring/templates/types"

function buildSummaryMetrics(input: {
  materialRows: number
  serviceRows: number
  grandTotal: number
}) {
  return [
    { key: "material-items", label: "Material Rows", value: String(input.materialRows) },
    { key: "service-items", label: "Service Rows", value: String(input.serviceRows) },
    { key: "grand-total", label: "Total", value: formatCurrencyValue(input.grandTotal) },
  ]
}

export function TemplateRecordPanel({
  page,
  currentUserId,
  templateId,
  initialTemplate,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  onTemplateDeleted,
}: {
  page: RecordDetailClientScaffoldContext
  currentUserId: string
  templateId: string
  initialTemplate: TemplateDetail
  propertyOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  onTemplateDeleted?: (templateId: string, propertyId: string) => void
}) {
  const noticeController = page.notices
  const {
    record: template,
    loading,
    error,
    publishRecord,
    clearRecordCache,
  } = useRecordDetailController<TemplateDetail, never>({
    scope: "template",
    id: templateId,
    initialRecord: initialTemplate,
    url: `/api/flooring/templates/${templateId}`,
    payloadKey: "template",
    manageDraft: false,
  })

  const currentTemplate = template ?? initialTemplate

  const publishTemplate = useCallback(
    (nextTemplate: TemplateDetail) => {
      publishRecord(nextTemplate)
    },
    [publishRecord],
  )

  const applyConflictTemplateSnapshot = useCallback(
    (saveError: unknown) => {
      const conflictSnapshot = getConflictSnapshot<{ template?: TemplateDetail }>(saveError)
      if (conflictSnapshot?.template) {
        publishTemplate(conflictSnapshot.template)
        return conflictSnapshot.template
      }

      return null
    },
    [publishTemplate],
  )

  const confirmDelete = useCallback((entityLabel: string) => {
    return confirmRecordDelete(buildDeleteConfirmationMessage(entityLabel))
  }, [])

  const primarySection = useTemplatePrimarySection({
    currentUserId,
    templateId,
    template: currentTemplate,
    publishTemplate,
    applyConflictTemplateSnapshot,
  })

  const materialSection = useTemplateMaterialSection({
    currentUserId,
    templateId,
    template: currentTemplate,
    publishTemplate,
    applyConflictTemplateSnapshot,
    confirmDelete,
  })

  const serviceSection = useTemplateServiceSection({
    currentUserId,
    templateId,
    template: currentTemplate,
    publishTemplate,
    applyConflictTemplateSnapshot,
    confirmDelete,
  })

  const salesRepSection = useTemplateSalesRepsSection({
    currentUserId,
    templateId,
    template: currentTemplate,
    publishTemplate,
    applyConflictTemplateSnapshot,
    confirmDelete,
  })

  const currentExpenseSummary = useMemo(
    () =>
      normalizeTemplateExpenseSummary({
        items: materialSection.localValue,
        serviceItems: serviceSection.localValue,
        salesReps: salesRepSection.localValue,
      }),
    [materialSection.localValue, salesRepSection.localValue, serviceSection.localValue],
  )

  const currentCalculationRows = useMemo(
    () => buildRecordCalculationRowsFromSummary(currentExpenseSummary),
    [currentExpenseSummary],
  )

  const currentSummaryMetrics = useMemo(
    () => buildSummaryMetrics({
      materialRows: materialSection.localValue.length,
      serviceRows: serviceSection.localValue.length,
      grandTotal: currentExpenseSummary.customerCost,
    }),
    [currentExpenseSummary.customerCost, materialSection.localValue.length, serviceSection.localValue.length],
  )

  const deleteTemplate = useCallback(async () => {
    noticeController.clearNotices()

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/templates/${currentTemplate.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, currentTemplate.updatedAt)),
      })
      clearRecordCache()
      onTemplateDeleted?.(currentTemplate.id, currentTemplate.propertyId)
      page.redirectToBack()
    } catch (deleteError) {
      noticeController.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete template")
    }
  }, [clearRecordCache, currentTemplate.id, currentTemplate.propertyId, currentTemplate.updatedAt, noticeController, onTemplateDeleted, page])

  if (loading && !template) {
    return <CenteredLoadingState label="Loading template..." />
  }

  if (error && !template) {
    return <CenteredErrorState title="Error" message={error} onDismiss={page.closePage} />
  }

  if (!template) {
    return <CenteredErrorState title="Error" message="Template could not be loaded." onDismiss={page.closePage} />
  }

  return (
    <RecordMultiSectionPanel
      page={page}
      notices={noticeController}
      summary={{ metrics: currentSummaryMetrics, payload: currentExpenseSummary }}
      sections={[
        {
          key: "primary",
          type: "field",
          slot: "primary",
          order: 0,
          dirtyLabel: "Template",
          controller: primarySection,
          render: () => (
            <RecordPrimarySectionInstance
              title="Template Details"
              error={primarySection.error}
              noticeMessage={primarySection.noticeMessage}
              noticeError={primarySection.noticeError}
              isDirty={primarySection.isDirty}
              isSaving={primarySection.isSaving}
              hasConflict={primarySection.hasConflict}
              onSave={() => void primarySection.save()}
              onDiscard={primarySection.discard}
              saveLabel="Save Template"
              savingLabel="Saving Template..."
              showHeader={false}
            >
              <TemplatePrimaryFieldsSection
                showHeader={false}
                draft={primarySection.localValue}
                propertyOptions={propertyOptions}
                warehouseOptions={warehouseOptions}
                padProductOptions={padProductOptions}
                error={primarySection.error}
                noticeMessage={primarySection.noticeMessage}
                noticeError={primarySection.noticeError}
                isDirty={primarySection.isDirty}
                isSaving={primarySection.isSaving}
                hasConflict={primarySection.hasConflict}
                onSave={() => void primarySection.save()}
                onDiscard={() => primarySection.discard()}
                setDraft={(value) => {
                  primarySection.setLocalValue((previous) =>
                    typeof value === "function" ? value(previous) : value,
                  )
                }}
              />
            </RecordPrimarySectionInstance>
          ),
        },
        {
          key: "material-items",
          type: "item",
          order: 10,
          dirtyLabel: "Material Items",
          controller: materialSection,
          render: () => (
            <TemplateMaterialItemsSection
              title="Material Items"
              items={materialSection.localValue}
              productOptions={productOptions}
              loading={loading}
              noticeMessage={materialSection.noticeMessage}
              noticeError={materialSection.noticeError}
              totalAmount={currentExpenseSummary.materialTotal}
              itemErrors={materialSection.itemErrors}
              onItemFieldChange={materialSection.changeField}
              onDeleteItem={materialSection.deleteItem}
              subHeader={{
                isDirty: materialSection.isDirty,
                isSaving: materialSection.isSaving,
                hasConflict: materialSection.hasConflict,
                error: materialSection.error,
                onSave: () => void materialSection.save(),
                onDiscard: () => materialSection.discard(),
                actions: [{ key: "add-material-item", kind: "add-row", label: "Add Material Item", onClick: materialSection.addItem }],
              }}
            />
          ),
        },
        {
          key: "service-items",
          type: "item",
          order: 20,
          dirtyLabel: "Service Items",
          controller: serviceSection,
          render: () => (
            <TemplateServiceItemsSection
              title="Service Items"
              items={serviceSection.localValue}
              serviceOptions={serviceOptions}
              unitOptions={unitOptions}
              loading={loading}
              noticeMessage={serviceSection.noticeMessage}
              noticeError={serviceSection.noticeError}
              totalAmount={currentExpenseSummary.serviceTotal}
              itemErrors={serviceSection.itemErrors}
              onItemFieldChange={serviceSection.changeField}
              onDeleteItem={serviceSection.deleteItem}
              subHeader={{
                isDirty: serviceSection.isDirty,
                isSaving: serviceSection.isSaving,
                hasConflict: serviceSection.hasConflict,
                error: serviceSection.error,
                onSave: () => void serviceSection.save(),
                onDiscard: () => serviceSection.discard(),
                actions: [{ key: "add-service-item", kind: "add-row", label: "Add Service Item", onClick: serviceSection.addItem }],
              }}
            />
          ),
        },
        {
          key: "sales-reps",
          type: "item",
          order: 30,
          dirtyLabel: "Sales Reps",
          controller: salesRepSection,
          render: () => (
            <TemplateSalesRepsSection
              title="Sales Reps"
              items={salesRepSection.localValue}
              salesRepOptions={salesRepOptions}
              customerCost={currentExpenseSummary.customerCost}
              totalAmount={currentExpenseSummary.salesRepExpense}
              loading={loading}
              noticeMessage={salesRepSection.noticeMessage}
              noticeError={salesRepSection.noticeError}
              itemErrors={salesRepSection.itemErrors}
              onItemFieldChange={salesRepSection.changeField}
              onDeleteItem={salesRepSection.deleteItem}
              subHeader={{
                isDirty: salesRepSection.isDirty,
                isSaving: salesRepSection.isSaving,
                hasConflict: salesRepSection.hasConflict,
                error: salesRepSection.error,
                onSave: () => void salesRepSection.save(),
                onDiscard: () => salesRepSection.discard(),
                actions: [{ key: "add-sales-rep", kind: "add-row", label: "Add Sales Rep", onClick: salesRepSection.addItem }],
              }}
            />
          ),
        },
        {
          key: "calculations",
          type: "calculation",
          order: 40,
          render: () => (
            <TemplateCalculationsSection
              title="Calculations"
              items={currentCalculationRows}
              loading={loading}
            />
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Template",
        deleteConfirmMessage: buildDeleteConfirmationMessage("template"),
        onDelete: () => void deleteTemplate(),
      }}
    />
  )
}
