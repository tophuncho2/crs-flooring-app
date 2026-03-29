"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { getConflictSnapshot, withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { CenteredErrorState, CenteredLoadingState } from "@/features/dashboard/shared/feedback/feedback-states"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import {
  buildRecordActionConfirmationMessage,
  confirmRecordAction,
  RecordSectionSubHeader,
  RecordSectionStatusBadge,
  RecordPanelFooter,
  RecordSectionStack,
  formatRecordSectionWorkflowPhase,
  type RecordNotices,
  useRecordDetailController,
  useRecordNotices,
} from "@/features/shared/engines/record-view"
import {
  buildWorkOrderCalculationRowsFromSummary,
  normalizeWorkOrderExpenseSummary,
  type WorkOrderCalculationRow,
} from "@/features/flooring/work-orders/domain/expense-summary"
import {
  buildDeleteConfirmationMessage,
  confirmRecordDelete,
} from "@/features/flooring/shared/ui/table/confirm-delete"
import { buildRecordSummary } from "@/features/flooring/shared/domain/record-summary"
import { MaterialAllocationsEditor } from "./sections/material-allocations-editor"
import { WorkOrderMaterialItemsSection } from "./sections/work-order-material-items-section"
import { WorkOrderCalculationsSection } from "./sections/work-order-calculations-section"
import { WorkOrderInvoiceSection } from "./sections/work-order-invoice-section"
import { WorkOrderPrimaryFieldsSection } from "./sections/work-order-primary-fields-section"
import { WorkOrderSalesRepsSection } from "./sections/work-order-sales-reps-section"
import { WorkOrderServiceItemsSection } from "./sections/work-order-service-items-section"
import {
  buildWorkflowActionLabel,
  isAutoAllocationRequestBlocked,
  selectedAddress,
} from "./shared"
import { useWorkOrderAutoAllocationWorkflow } from "./workflows/use-work-order-auto-allocation-workflow"
import { useWorkOrderInvoiceWorkflow } from "./workflows/use-work-order-invoice-workflow"
import { useWorkOrderMaterialSection } from "./controllers/use-work-order-material-section"
import { useWorkOrderPrimarySection } from "./controllers/use-work-order-primary-section"
import { useWorkOrderSalesRepsSection } from "./controllers/use-work-order-sales-reps-section"
import { useWorkOrderServiceSection } from "./controllers/use-work-order-service-section"
import type { WorkOrderInvoiceStatusResponse } from "@/features/flooring/work-orders/transport/invoice"
import type {
  DraftWorkOrder,
  PropertyOption,
  SalesRepContactOption,
  WarehouseOption,
  WorkOrderDetail,
  WorkOrderExpenseSummary,
  WorkOrderReconciliationStatus,
} from "@/features/flooring/work-orders/types"
import type { MaterialItemOption } from "@/features/flooring/shared/line-items/material-items-editor"
import type { SalesRepOption } from "@/features/flooring/shared/line-items/sales-rep-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/line-items/service-items-editor"

function buildWorkOrderReconciliationKey(input: {
  updatedAt: string
  autoAllocationRun?: WorkOrderDetail["autoAllocationRun"] | WorkOrderReconciliationStatus["autoAllocationRun"]
  invoiceStatus?: WorkOrderDetail["invoiceStatus"] | WorkOrderReconciliationStatus["invoiceStatus"] | WorkOrderInvoiceStatusResponse
}) {
  return [
    input.updatedAt,
    input.autoAllocationRun?.id ?? "",
    input.autoAllocationRun?.sourceVersion ?? "",
    input.autoAllocationRun?.status ?? "",
    input.invoiceStatus?.sourceVersion ?? "",
    input.invoiceStatus?.generation?.id ?? "",
    input.invoiceStatus?.generation?.status ?? "",
    input.invoiceStatus?.artifact?.id ?? "",
  ].join(":")
}

function buildUnsavedWorkflowWarning(dirtySections: string[]) {
  if (dirtySections.length === 0) {
    return undefined
  }

  return `Unsaved changes in ${dirtySections.join(", ")} will not be included. Save those sections first if they must be part of this request.`
}

export function WorkOrderRecordPanel({
  currentUserId,
  workOrderId,
  initialWorkOrder,
  showPrimaryFields = true,
  usePageHeaderForPrimarySection = false,
  propertyOptions,
  warehouseOptions,
  productOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  onClose,
  onWorkOrderChange,
  onWorkOrderSaved,
  onWorkOrderDeleted,
  onExpenseSummaryChange,
  onDirtyChange,
  onDirtySectionsChange,
  notices,
}: {
  currentUserId: string
  workOrderId: string
  initialWorkOrder: WorkOrderDetail
  showPrimaryFields?: boolean
  usePageHeaderForPrimarySection?: boolean
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  onClose: () => void
  onWorkOrderChange?: (workOrder: WorkOrderDetail) => void
  onWorkOrderSaved?: (workOrder: WorkOrderDetail) => void
  onWorkOrderDeleted?: (workOrderId: string) => void
  onExpenseSummaryChange?: (summary: WorkOrderExpenseSummary) => void
  onDirtyChange?: (value: boolean) => void
  onDirtySectionsChange?: (sections: string[]) => void
  notices?: RecordNotices
}) {
  const initialWorkOrderDetail = useMemo<WorkOrderDetail>(() => initialWorkOrder, [initialWorkOrder])
  const localNotices = useRecordNotices()
  const noticeController = notices ?? localNotices
  const { message, error: noticeError, showSuccess, showError, clearNotices } = noticeController
  const [remoteReconciliationKey, setRemoteReconciliationKey] = useState<string | null>(null)
  const [isInvoiceSectionOpen, setIsInvoiceSectionOpen] = useState(false)

  const {
    record: workOrder,
    loading,
    error,
    publishRecord,
    refreshRecord,
    clearRecordCache,
  } = useRecordDetailController<WorkOrderDetail, DraftWorkOrder>({
    scope: "workOrder",
    id: workOrderId,
    initialRecord: initialWorkOrderDetail,
    url: `/api/flooring/work-orders/${workOrderId}`,
    payloadKey: "workOrder",
    manageDraft: false,
  })

  const currentWorkOrder = workOrder ?? initialWorkOrderDetail

  const publishWorkOrder = useCallback(
    (nextWorkOrder: WorkOrderDetail) => {
      publishRecord(nextWorkOrder)
      onWorkOrderChange?.(nextWorkOrder)
    },
    [onWorkOrderChange, publishRecord],
  )

  const refreshWorkOrderDetail = useCallback(async () => {
    const nextWorkOrder = await refreshRecord()
    setRemoteReconciliationKey(null)
    publishWorkOrder(nextWorkOrder)
    onExpenseSummaryChange?.(nextWorkOrder.financialSummary)
    return nextWorkOrder
  }, [onExpenseSummaryChange, publishWorkOrder, refreshRecord])

  const applyConflictWorkOrderSnapshot = useCallback(
    (saveError: unknown) => {
      const conflictSnapshot = getConflictSnapshot<{ workOrder?: WorkOrderDetail }>(saveError)
      if (conflictSnapshot?.workOrder) {
        publishWorkOrder(conflictSnapshot.workOrder)
        return conflictSnapshot.workOrder
      }

      return null
    },
    [publishWorkOrder],
  )

  const confirmDelete = useCallback((entityLabel: string) => {
    return confirmRecordDelete(buildDeleteConfirmationMessage(entityLabel))
  }, [])

  const primarySection = useWorkOrderPrimarySection({
    currentUserId,
    workOrderId,
    workOrder: currentWorkOrder,
    publishWorkOrder,
    onWorkOrderSaved,
    clearNotices,
    showSuccess,
    applyConflictWorkOrderSnapshot,
  })

  const serviceSection = useWorkOrderServiceSection({
    currentUserId,
    workOrderId,
    workOrder: currentWorkOrder,
    publishWorkOrder,
    clearNotices,
    showSuccess,
    applyConflictWorkOrderSnapshot,
    confirmDelete,
  })

  const salesRepSection = useWorkOrderSalesRepsSection({
    currentUserId,
    workOrderId,
    workOrder: currentWorkOrder,
    publishWorkOrder,
    clearNotices,
    showSuccess,
    applyConflictWorkOrderSnapshot,
    confirmDelete,
  })

  const materialSection = useWorkOrderMaterialSection({
    currentUserId,
    workOrderId,
    workOrder: currentWorkOrder,
    productOptions,
    publishWorkOrder,
    clearNotices,
    showSuccess,
    showError,
    applyConflictWorkOrderSnapshot,
    confirmDelete,
  })

  const autoAllocationWorkflow = useWorkOrderAutoAllocationWorkflow({
    workOrder: currentWorkOrder,
    refreshWorkOrderDetail,
    clearNotices,
    showSuccess,
    showError,
    applyConflictWorkOrderSnapshot,
  })

  const invoiceWorkflow = useWorkOrderInvoiceWorkflow({
    workOrder: currentWorkOrder,
    enabled: isInvoiceSectionOpen,
    clearNotices,
    showSuccess,
    showError,
    applyConflictWorkOrderSnapshot,
  })

  const dirtySections = useMemo(
    () =>
      [
        primarySection.isDirty ? "Work Order" : null,
        materialSection.isDirty ? "Material Items" : null,
        serviceSection.isDirty ? "Service Items" : null,
        salesRepSection.isDirty ? "Sales Reps" : null,
      ].filter(Boolean) as string[],
    [materialSection.isDirty, primarySection.isDirty, salesRepSection.isDirty, serviceSection.isDirty],
  )
  const unsavedWorkflowWarning = useMemo(() => buildUnsavedWorkflowWarning(dirtySections), [dirtySections])
  const hasStalePendingAutoAllocation = useMemo(() => {
    const run = autoAllocationWorkflow.value
    if (!run) {
      return false
    }

    return (
      run.sourceVersion !== currentWorkOrder.updatedAt &&
      (run.status === "REQUESTED" || run.status === "QUEUED")
    )
  }, [autoAllocationWorkflow.value, currentWorkOrder.updatedAt])
  const autoAllocationRequestBlocked = useMemo(
    () => isAutoAllocationRequestBlocked(autoAllocationWorkflow.value, currentWorkOrder.updatedAt),
    [autoAllocationWorkflow.value, currentWorkOrder.updatedAt],
  )
  const autoAllocationButtonLabel = useMemo(() => {
    if (!autoAllocationRequestBlocked) {
      return "Run Auto Allocation"
    }

    return buildWorkflowActionLabel({
      phase: autoAllocationWorkflow.phase,
      isStalled: autoAllocationWorkflow.isStalled,
      idleLabel: "Run Auto Allocation",
      requestedLabel: "Requesting...",
      queuedLabel: "Queued...",
      processingLabel: "Auto Allocating...",
      stalledLabel: "Awaiting Worker...",
    })
  }, [autoAllocationRequestBlocked, autoAllocationWorkflow.isStalled, autoAllocationWorkflow.phase])
  const invoiceButtonLabel = useMemo(
    () =>
      buildWorkflowActionLabel({
        phase: invoiceWorkflow.phase,
        isStalled: invoiceWorkflow.isStalled,
        idleLabel: "Generate Invoice",
        requestedLabel: "Requesting...",
        queuedLabel: "Queued...",
        processingLabel: "Generating Invoice...",
        stalledLabel: "Awaiting Worker...",
      }),
    [invoiceWorkflow.isStalled, invoiceWorkflow.phase],
  )

  useEffect(() => {
    onDirtyChange?.(dirtySections.length > 0)
    onDirtySectionsChange?.(dirtySections)
  }, [dirtySections, onDirtyChange, onDirtySectionsChange])

  useEffect(() => {
    let cancelled = false

    async function refreshReconciliation() {
      try {
        const payload = await requestJson<{ workOrder: WorkOrderReconciliationStatus }>(
          `/api/flooring/work-orders/${workOrderId}/reconciliation`,
          { cache: "no-store" },
        )
        if (cancelled) {
          return
        }

        const nextReconciliation = payload.workOrder
        const currentKey = buildWorkOrderReconciliationKey({
          updatedAt: currentWorkOrder.updatedAt,
          autoAllocationRun: autoAllocationWorkflow.value ?? currentWorkOrder.autoAllocationRun,
          invoiceStatus: invoiceWorkflow.invoice ?? currentWorkOrder.invoiceStatus,
        })
        const nextKey = buildWorkOrderReconciliationKey(nextReconciliation)

        if (currentKey === nextKey) {
          setRemoteReconciliationKey(null)
          return
        }

        if (dirtySections.length === 0) {
          setRemoteReconciliationKey(null)
          await refreshWorkOrderDetail()
          return
        }

        setRemoteReconciliationKey(nextKey)
      } catch {
        // Reconciliation polling is advisory.
      }
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return
      }

      void refreshReconciliation()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [autoAllocationWorkflow.value, currentWorkOrder.autoAllocationRun, currentWorkOrder.updatedAt, dirtySections.length, invoiceWorkflow.invoice, refreshWorkOrderDetail, workOrderId])

  const currentExpenseSummary = useMemo(
    () =>
      normalizeWorkOrderExpenseSummary({
        items: materialSection.localValue,
        serviceItems: serviceSection.localValue,
        salesReps: salesRepSection.localValue,
      }),
    [materialSection.localValue, salesRepSection.localValue, serviceSection.localValue],
  )

  useEffect(() => {
    onExpenseSummaryChange?.(currentExpenseSummary)
  }, [currentExpenseSummary, onExpenseSummaryChange])

  const currentCalculationRows = useMemo<WorkOrderCalculationRow[]>(
    () => buildWorkOrderCalculationRowsFromSummary(currentExpenseSummary),
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

  const deleteWorkOrder = useCallback(async () => {
    clearNotices()

    try {
      await requestJson(`/api/flooring/work-orders/${currentWorkOrder.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, currentWorkOrder.updatedAt)),
      })
      clearRecordCache()
      onWorkOrderDeleted?.(currentWorkOrder.id)
      onClose()
    } catch (deleteError) {
      showError(deleteError instanceof Error ? deleteError.message : "Failed to delete work order")
    }
  }, [clearNotices, clearRecordCache, currentWorkOrder.id, currentWorkOrder.updatedAt, onClose, onWorkOrderDeleted, showError])

  const requestAutoAllocation = useCallback(() => {
    const warning = [
      hasStalePendingAutoAllocation
        ? "A previous auto-allocation request is still pending for an older saved version. Confirming will supersede that older pending request."
        : null,
      unsavedWorkflowWarning,
    ]
      .filter(Boolean)
      .join("\n\n")

    const didConfirm = confirmRecordAction(
      buildRecordActionConfirmationMessage({
        title: "Run auto allocation for this work order?",
        summary: "This queues a background allocation run from the current saved work order snapshot.",
        warning: warning || undefined,
      }),
    )

    if (!didConfirm) {
      return
    }

    void autoAllocationWorkflow.requestAutoAllocation()
  }, [autoAllocationWorkflow, hasStalePendingAutoAllocation, unsavedWorkflowWarning])

  const queueInvoice = useCallback(() => {
    const didConfirm = confirmRecordAction(
      buildRecordActionConfirmationMessage({
        title: "Generate an invoice for this work order?",
        summary: "This queues background invoice generation from the current saved work order snapshot.",
        warning: unsavedWorkflowWarning,
      }),
    )

    if (!didConfirm) {
      return
    }

    void invoiceWorkflow.queueInvoice()
  }, [invoiceWorkflow, unsavedWorkflowWarning])

  if (loading && !workOrder) {
    return <CenteredLoadingState label="Loading work order..." />
  }

  if (error && !workOrder) {
    return <CenteredErrorState title="Error" message={error} onDismiss={onClose} />
  }

  if (!workOrder) {
    return <CenteredErrorState title="Error" message="Work order could not be loaded." onDismiss={onClose} />
  }

  return (
    <div className="space-y-6">
      <FormStatusNotices message={message} error={noticeError} loadingMessage="" />

      {remoteReconciliationKey ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="font-medium text-amber-800">This work order changed on the server while you were editing it.</div>
          <div className="mt-1 text-amber-900/80">
            Reload the latest server snapshot before saving, or keep editing and save manually after reconciling the differences.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setRemoteReconciliationKey(null)
                void refreshWorkOrderDetail()
              }}
              className="rounded-md border border-amber-600/40 px-3 py-2 font-medium hover:bg-amber-500/10"
            >
              Reload Latest
            </button>
            <button
              type="button"
              onClick={() => setRemoteReconciliationKey(null)}
              className="rounded-md border border-[var(--panel-border)] px-3 py-2 font-medium hover:bg-[var(--panel-hover)]"
            >
              Keep Editing
            </button>
          </div>
        </div>
      ) : null}

      <RecordSectionStack>
        {showPrimaryFields ? (
          <WorkOrderPrimaryFieldsSection
            showHeader={!usePageHeaderForPrimarySection}
            draft={primarySection.localValue}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            selectedAddressValue={selectedAddress(propertyOptions, primarySection.localValue, currentWorkOrder.propertyAddress)}
            unitType={currentWorkOrder.unitType}
            error={primarySection.error}
            isDirty={primarySection.isDirty}
            isSaving={primarySection.isSaving}
            hasConflict={primarySection.hasConflict}
            onSave={() => void primarySection.save()}
            onDiscard={() => primarySection.discard()}
            setDraft={(value) => {
              primarySection.setLocalValue((previous) => {
                const nextValue =
                  typeof value === "function"
                    ? (value as (previous: DraftWorkOrder | null) => DraftWorkOrder | null)(previous)
                    : value
                return nextValue ?? previous
              })
            }}
          />
        ) : null}

        <div className={showPrimaryFields ? "pt-2" : undefined}>
          <WorkOrderMaterialItemsSection
            title="Material Items"
            items={materialSection.localValue}
            productOptions={productOptions}
            loading={loading}
            actionPanel={
              <RecordSectionSubHeader
                isDirty={materialSection.isDirty}
                isSaving={materialSection.isSaving}
                hasConflict={materialSection.hasConflict}
                error={materialSection.error ?? autoAllocationWorkflow.error}
                onSave={() => void materialSection.save()}
                onDiscard={() => materialSection.discard()}
                statusExtra={
                  <>
                    <RecordSectionStatusBadge
                      tone={
                        autoAllocationWorkflow.phase === "completed"
                          ? "success"
                          : autoAllocationWorkflow.phase === "failed" || autoAllocationWorkflow.phase === "superseded"
                            ? "error"
                            : autoAllocationWorkflow.isPending
                              ? "processing"
                              : "neutral"
                      }
                    >
                      Auto Allocate: {formatRecordSectionWorkflowPhase(autoAllocationWorkflow.phase)}
                    </RecordSectionStatusBadge>
                    {autoAllocationWorkflow.isStalled ? (
                      <RecordSectionStatusBadge tone="warning">Polling Slowed</RecordSectionStatusBadge>
                    ) : null}
                  </>
                }
                actions={[
                  { key: "add-material-item", label: "Add Material Item", onClick: materialSection.addItem },
                  {
                    key: "run-auto-allocation",
                    label: autoAllocationButtonLabel,
                    onClick: requestAutoAllocation,
                    disabled: autoAllocationRequestBlocked || materialSection.localValue.length === 0,
                  },
                  ...(autoAllocationWorkflow.isPending
                    ? [
                        {
                          key: "refresh-auto-allocation",
                          label: "Refresh Status",
                          onClick: () => void autoAllocationWorkflow.refresh(),
                        },
                      ]
                    : []),
                ]}
              />
            }
            itemErrors={materialSection.itemErrors}
            expandedItemIds={materialSection.expandedItemIds}
            onToggleExpandedItem={materialSection.toggleExpandedItem}
            onItemFieldChange={materialSection.changeItemField}
            onDeleteItem={materialSection.deleteItem}
            renderAllocationSection={(item) => (
              <MaterialAllocationsEditor
                allocations={item.allocations}
                allocationOptions={materialSection.allocationOptionsByItemId[item.id] ?? []}
                loadingOptions={materialSection.loadingAllocationOptionsByItemId[item.id] ?? false}
                onAddAllocation={() => void materialSection.addAllocation(item.id)}
                itemErrors={materialSection.allocationErrorsByItemId[item.id] ?? {}}
                onAllocationFieldChange={(allocationId, field, value) =>
                  materialSection.changeAllocationField(item.id, allocationId, field, value)
                }
                onDeleteAllocation={(allocationId) => materialSection.deleteAllocation(item.id, allocationId)}
              />
            )}
          />
        </div>

        <WorkOrderServiceItemsSection
          title="Service Items"
          items={serviceSection.localValue}
          serviceOptions={serviceOptions}
          unitOptions={unitOptions}
          totalAmount={currentSummary.serviceTotal}
          loading={loading}
          actionPanel={
            <RecordSectionSubHeader
              isDirty={serviceSection.isDirty}
              isSaving={serviceSection.isSaving}
              hasConflict={serviceSection.hasConflict}
              error={serviceSection.error}
              onSave={() => void serviceSection.save()}
              onDiscard={() => serviceSection.discard()}
              actions={[{ key: "add-service-item", label: "Add Service Item", onClick: serviceSection.addItem }]}
            />
          }
          itemErrors={serviceSection.itemErrors}
          onItemFieldChange={serviceSection.changeField}
          onDeleteItem={serviceSection.deleteItem}
        />

        <WorkOrderSalesRepsSection
          title="Sales Reps"
          items={salesRepSection.localValue}
          salesRepOptions={salesRepOptions as SalesRepOption[]}
          customerCost={currentExpenseSummary.customerCost}
          totalAmount={currentExpenseSummary.salesRepExpense}
          loading={loading}
          actionPanel={
            <RecordSectionSubHeader
              isDirty={salesRepSection.isDirty}
              isSaving={salesRepSection.isSaving}
              hasConflict={salesRepSection.hasConflict}
              error={salesRepSection.error}
              onSave={() => void salesRepSection.save()}
              onDiscard={() => salesRepSection.discard()}
              actions={[{ key: "add-sales-rep", label: "Add Sales Rep", onClick: salesRepSection.addItem }]}
            />
          }
          itemErrors={salesRepSection.itemErrors}
          onItemFieldChange={salesRepSection.changeField}
          onDeleteItem={salesRepSection.deleteItem}
        />

        <WorkOrderCalculationsSection title="Calculations" items={currentCalculationRows} loading={false} />

        <WorkOrderInvoiceSection
          invoice={invoiceWorkflow.invoice}
          error={invoiceWorkflow.error}
          isLoading={invoiceWorkflow.isLoading}
          workflowPhase={invoiceWorkflow.phase}
          isStalled={invoiceWorkflow.isStalled}
          queueButtonLabel={invoiceButtonLabel}
          onQueueInvoice={queueInvoice}
          onOpenInvoice={invoiceWorkflow.openInvoice}
          onRefreshStatus={() => void invoiceWorkflow.refreshInvoice()}
          onOpenChange={setIsInvoiceSectionOpen}
        />
      </RecordSectionStack>

      <RecordPanelFooter
        deleteLabel="Delete Work Order"
        deleteConfirmMessage="Delete this work order? This cannot be undone."
        onDelete={() => void deleteWorkOrder()}
        onClose={onClose}
        saveLabel="Save Primary Fields"
        savingLabel="Saving..."
        onSave={() => void primarySection.save()}
        isSaving={primarySection.isSaving}
      />
    </div>
  )
}
