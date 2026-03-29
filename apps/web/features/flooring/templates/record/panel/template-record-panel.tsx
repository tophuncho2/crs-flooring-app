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
  RecordSectionActionPanel,
  RecordSectionStack,
  RecordSectionStatusBadge,
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

function buildSectionStatus(input: {
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
}) {
  return (
    <>
      <RecordSectionStatusBadge tone={input.isSaving ? "processing" : input.isDirty ? "warning" : "success"}>
        {input.isSaving ? "Saving" : input.isDirty ? "Dirty" : "Saved"}
      </RecordSectionStatusBadge>
      {input.hasConflict ? <RecordSectionStatusBadge tone="error">Conflict</RecordSectionStatusBadge> : null}
    </>
  )
}

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
            setDraft={(value) => {
              primarySection.setLocalValue((previous) =>
                typeof value === "function" ? value(previous) : value,
              )
            }}
            actionPanel={
              <RecordSectionActionPanel
                status={buildSectionStatus({
                  isDirty: primarySection.isDirty,
                  isSaving: primarySection.isSaving,
                  hasConflict: primarySection.hasConflict,
                })}
                error={primarySection.error}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => primarySection.discard()}
                      disabled={!primarySection.isDirty || primarySection.isSaving}
                      className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => void primarySection.save()}
                      disabled={!primarySection.isDirty || primarySection.isSaving}
                      className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      {primarySection.isSaving ? "Saving..." : "Save"}
                    </button>
                  </>
                }
              />
            }
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
            <RecordSectionActionPanel
              status={buildSectionStatus({
                isDirty: materialSection.isDirty,
                isSaving: materialSection.isSaving,
                hasConflict: materialSection.hasConflict,
              })}
              error={materialSection.error}
              actions={
                <>
                  <button
                    type="button"
                    onClick={materialSection.addItem}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)]"
                  >
                    Add Material Item
                  </button>
                  <button
                    type="button"
                    onClick={() => materialSection.discard()}
                    disabled={!materialSection.isDirty || materialSection.isSaving}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void materialSection.save()}
                    disabled={!materialSection.isDirty || materialSection.isSaving}
                    className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    {materialSection.isSaving ? "Saving..." : "Save"}
                  </button>
                </>
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
            <RecordSectionActionPanel
              status={buildSectionStatus({
                isDirty: serviceSection.isDirty,
                isSaving: serviceSection.isSaving,
                hasConflict: serviceSection.hasConflict,
              })}
              error={serviceSection.error}
              actions={
                <>
                  <button
                    type="button"
                    onClick={serviceSection.addItem}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)]"
                  >
                    Add Service Item
                  </button>
                  <button
                    type="button"
                    onClick={() => serviceSection.discard()}
                    disabled={!serviceSection.isDirty || serviceSection.isSaving}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void serviceSection.save()}
                    disabled={!serviceSection.isDirty || serviceSection.isSaving}
                    className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    {serviceSection.isSaving ? "Saving..." : "Save"}
                  </button>
                </>
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
            <RecordSectionActionPanel
              status={buildSectionStatus({
                isDirty: salesRepSection.isDirty,
                isSaving: salesRepSection.isSaving,
                hasConflict: salesRepSection.hasConflict,
              })}
              error={salesRepSection.error}
              actions={
                <>
                  <button
                    type="button"
                    onClick={salesRepSection.addItem}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)]"
                  >
                    Add Sales Rep
                  </button>
                  <button
                    type="button"
                    onClick={() => salesRepSection.discard()}
                    disabled={!salesRepSection.isDirty || salesRepSection.isSaving}
                    className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void salesRepSection.save()}
                    disabled={!salesRepSection.isDirty || salesRepSection.isSaving}
                    className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    {salesRepSection.isSaving ? "Saving..." : "Save"}
                  </button>
                </>
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
