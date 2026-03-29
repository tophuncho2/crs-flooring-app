"use client"

import { useCallback, useEffect, useMemo } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { getConflictSnapshot, withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { CenteredErrorState, CenteredLoadingState } from "@/features/dashboard/shared/feedback/feedback-states"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { buildRecordSummary } from "@/features/flooring/shared/domain/record-summary"
import {
  RecordFooterDestructiveButton,
  RecordFooterNeutralButton,
  RecordManagedSectionActionPanel,
  RecordSectionStack,
  useRecordDetailController,
  useRecordNotices,
} from "@/features/shared/engines/record-view"
import { buildRecordCalculationRowsFromSummary } from "@/features/flooring/shared/domain/record-calculation-rows"
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

export function TemplateRecordPanel({
  currentUserId,
  templateId,
  initialTemplate,
  showPrimaryFields = true,
  usePageHeaderForPrimarySection = false,
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
  currentUserId: string
  templateId: string
  initialTemplate: TemplateDetail
  showPrimaryFields?: boolean
  usePageHeaderForPrimarySection?: boolean
  propertyOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  onClose: () => void
  onTemplateSaved?: (template: TemplateDetail, previousPropertyId: string, itemsCount: number) => void
  onTemplateDeleted?: (templateId: string, propertyId: string) => void
  onSummaryChange?: (summary: { materialItems: TemplateDetail["items"]; serviceItems: TemplateDetail["serviceItems"] }) => void
  onDirtyChange?: (value: boolean) => void
}) {
  const notices = useRecordNotices()
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
    onTemplateSaved,
    clearNotices: notices.clearNotices,
    showSuccess: notices.showSuccess,
    applyConflictTemplateSnapshot,
  })

  const materialSection = useTemplateMaterialSection({
    currentUserId,
    templateId,
    template: currentTemplate,
    publishTemplate,
    onTemplateSaved,
    clearNotices: notices.clearNotices,
    showSuccess: notices.showSuccess,
    applyConflictTemplateSnapshot,
    confirmDelete,
  })

  const serviceSection = useTemplateServiceSection({
    currentUserId,
    templateId,
    template: currentTemplate,
    publishTemplate,
    onTemplateSaved,
    clearNotices: notices.clearNotices,
    showSuccess: notices.showSuccess,
    applyConflictTemplateSnapshot,
    confirmDelete,
  })

  const salesRepSection = useTemplateSalesRepsSection({
    currentUserId,
    templateId,
    template: currentTemplate,
    publishTemplate,
    onTemplateSaved,
    clearNotices: notices.clearNotices,
    showSuccess: notices.showSuccess,
    applyConflictTemplateSnapshot,
    confirmDelete,
  })

  const dirtySections = useMemo(
    () =>
      [
        primarySection.isDirty ? "Template" : null,
        materialSection.isDirty ? "Material Items" : null,
        serviceSection.isDirty ? "Service Items" : null,
        salesRepSection.isDirty ? "Sales Reps" : null,
      ].filter(Boolean) as string[],
    [materialSection.isDirty, primarySection.isDirty, salesRepSection.isDirty, serviceSection.isDirty],
  )

  useEffect(() => {
    onDirtyChange?.(dirtySections.length > 0)
  }, [dirtySections.length, onDirtyChange])

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

  const currentSummary = useMemo(
    () =>
      buildRecordSummary({
        materialItems: materialSection.localValue,
        serviceItems: serviceSection.localValue,
      }),
    [materialSection.localValue, serviceSection.localValue],
  )

  useEffect(() => {
    onSummaryChange?.({
      materialItems: materialSection.localValue,
      serviceItems: serviceSection.localValue,
    })
  }, [materialSection.localValue, onSummaryChange, serviceSection.localValue])

  async function deleteTemplate() {
    if (!confirmDelete("template")) {
      return
    }

    notices.clearNotices()

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/templates/${currentTemplate.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, currentTemplate.updatedAt)),
      })
      clearRecordCache()
      onTemplateDeleted?.(currentTemplate.id, currentTemplate.propertyId)
      onClose()
    } catch (deleteError) {
      notices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete template")
    }
  }

  if (loading && !template) {
    return <CenteredLoadingState label="Loading template..." />
  }

  if (error && !template) {
    return <CenteredErrorState title="Error" message={error} onDismiss={onClose} />
  }

  if (!template) {
    return <CenteredErrorState title="Error" message="Template could not be loaded." onDismiss={onClose} />
  }

  return (
    <div className="space-y-6">
      <FormStatusNotices message={notices.message} error={notices.error} loadingMessage="" />

      <RecordSectionStack>
        {showPrimaryFields ? (
          <TemplatePrimaryFieldsSection
            showHeader={!usePageHeaderForPrimarySection}
            draft={primarySection.localValue}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            padProductOptions={padProductOptions}
            error={primarySection.error}
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
        ) : null}

        <div className={showPrimaryFields ? "pt-2" : undefined}>
          <TemplateMaterialItemsSection
          title="Material Items"
          items={materialSection.localValue}
          productOptions={productOptions}
          loading={loading}
          totalAmount={currentExpenseSummary.materialTotal}
          itemErrors={materialSection.itemErrors}
          onItemFieldChange={materialSection.changeField}
          onDeleteItem={materialSection.deleteItem}
          actionPanel={
            <RecordManagedSectionActionPanel
              isDirty={materialSection.isDirty}
              isSaving={materialSection.isSaving}
              hasConflict={materialSection.hasConflict}
              error={materialSection.error}
              onSave={() => void materialSection.save()}
              onDiscard={() => materialSection.discard()}
              extraActions={
                <RecordFooterNeutralButton onClick={materialSection.addItem}>
                  Add Material Item
                </RecordFooterNeutralButton>
              }
            />
          }
        />

        <TemplateServiceItemsSection
          title="Service Items"
          items={serviceSection.localValue}
          serviceOptions={serviceOptions}
          unitOptions={unitOptions}
          loading={loading}
          totalAmount={currentExpenseSummary.serviceTotal}
          itemErrors={serviceSection.itemErrors}
          onItemFieldChange={serviceSection.changeField}
          onDeleteItem={serviceSection.deleteItem}
          actionPanel={
            <RecordManagedSectionActionPanel
              isDirty={serviceSection.isDirty}
              isSaving={serviceSection.isSaving}
              hasConflict={serviceSection.hasConflict}
              error={serviceSection.error}
              onSave={() => void serviceSection.save()}
              onDiscard={() => serviceSection.discard()}
              extraActions={
                <RecordFooterNeutralButton onClick={serviceSection.addItem}>
                  Add Service Item
                </RecordFooterNeutralButton>
              }
            />
          }
        />

        <TemplateSalesRepsSection
          title="Sales Reps"
          items={salesRepSection.localValue}
          salesRepOptions={salesRepOptions}
          customerCost={currentExpenseSummary.customerCost}
          totalAmount={currentExpenseSummary.salesRepExpense}
          loading={loading}
          itemErrors={salesRepSection.itemErrors}
          onItemFieldChange={salesRepSection.changeField}
          onDeleteItem={salesRepSection.deleteItem}
          actionPanel={
            <RecordManagedSectionActionPanel
              isDirty={salesRepSection.isDirty}
              isSaving={salesRepSection.isSaving}
              hasConflict={salesRepSection.hasConflict}
              error={salesRepSection.error}
              onSave={() => void salesRepSection.save()}
              onDiscard={() => salesRepSection.discard()}
              extraActions={
                <RecordFooterNeutralButton onClick={salesRepSection.addItem}>
                  Add Sales Rep
                </RecordFooterNeutralButton>
              }
            />
          }
        />

          <TemplateCalculationsSection title="Calculations" items={currentCalculationRows} loading={loading} />
        </div>
      </RecordSectionStack>

      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <RecordFooterDestructiveButton onClick={() => void deleteTemplate()}>
            Delete Template
          </RecordFooterDestructiveButton>
        </div>
        <div className="flex gap-2">
          <RecordFooterNeutralButton onClick={onClose}>Close</RecordFooterNeutralButton>
        </div>
      </div>
    </div>
  )
}
