"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { getConflictSnapshot, withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import { CenteredErrorState, CenteredLoadingState } from "@/modules/shared/engines/common/feedback/feedback-states"
import {
  buildRecordActionConfirmationMessage,
  confirmRecordAction,
  RecordFieldSection,
  RecordMultiSectionPanel,
  type RecordPanelSectionConfig,
  RecordSectionStatusBadge,
  formatRecordSectionWorkflowPhase,
  useRecordDetailController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { formatCurrencyValue } from "@builders/domain"
import {
  buildWorkOrderCalculationRowsFromSummary,
  normalizeWorkOrderExpenseSummary,
  type WorkOrderCalculationRow,
} from "@/modules/work-orders/domain/expense-summary"
import {
  buildDeleteConfirmationMessage,
  confirmRecordDelete,
} from "@/modules/shared/engines/common/feedback/confirm-delete"
import { MaterialAllocationsContent } from "./sections/material-allocations-editor"
import { WorkOrderMaterialItemsSection } from "./sections/work-order-material-items-section"
import { WorkOrderCalculationsSection } from "./sections/work-order-calculations-section"
import { WorkOrderPrimaryFieldsSection } from "./sections/work-order-primary-fields-section"
import { WorkOrderSalesRepsSection } from "./sections/work-order-sales-reps-section"
import { WorkOrderServiceItemsSection } from "./sections/work-order-service-items-section"
import {
  buildWorkflowActionLabel,
  isAutoAllocationRequestBlocked,
  selectedAddress,
} from "./shared"
import { useWorkOrderAutoAllocationWorkflow } from "./workflows/use-work-order-auto-allocation-workflow"
import { useWorkOrderMaterialSection } from "./controllers/use-work-order-material-section"
import { useWorkOrderPrimarySection } from "./controllers/use-work-order-primary-section"
import { useWorkOrderSalesRepsSection } from "./controllers/use-work-order-sales-reps-section"
import { useWorkOrderServiceSection } from "./controllers/use-work-order-service-section"
import type {
  DraftWorkOrder,
  PropertyOption,
  SalesRepContactOption,
  WarehouseOption,
  WorkOrderDetail,
  WorkOrderExpenseSummary,
  WorkOrderReconciliationStatus,
} from "@/modules/work-orders/types"
import type { MaterialItemOption } from "@/modules/shared/engines/record-view/line-items/material-items-editor"
import type { SalesRepOption } from "@/modules/shared/engines/record-view/line-items/sales-rep-items-editor"
import type { ServiceOption, UnitOption } from "@/modules/shared/engines/record-view/line-items/service-items-editor"

function buildWorkOrderReconciliationKey(input: {
  updatedAt: string
  autoAllocationRun?: WorkOrderDetail["autoAllocationRun"] | WorkOrderReconciliationStatus["autoAllocationRun"]
}) {
  return [
    input.updatedAt,
    input.autoAllocationRun?.id ?? "",
    input.autoAllocationRun?.sourceVersion ?? "",
    input.autoAllocationRun?.status ?? "",
  ].join(":")
}

function buildUnsavedWorkflowWarning(dirtySections: string[]) {
  if (dirtySections.length === 0) {
    return undefined
  }

  return `Unsaved changes in ${dirtySections.join(", ")} will not be included. Save those sections first if they must be part of this request.`
}

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

export function WorkOrderRecordPanel({
  page,
  currentUserId,
  workOrderId,
  initialWorkOrder,
  propertyOptions,
  warehouseOptions,
  productOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  onWorkOrderChange,
  onWorkOrderSaved,
  onWorkOrderDeleted,
}: {
  page: RecordDetailClientScaffoldContext
  currentUserId: string
  workOrderId: string
  initialWorkOrder: WorkOrderDetail
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: MaterialItemOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  onWorkOrderChange?: (workOrder: WorkOrderDetail) => void
  onWorkOrderSaved?: (workOrder: WorkOrderDetail) => void
  onWorkOrderDeleted?: (workOrderId: string) => void
}) {
  const initialWorkOrderDetail = useMemo<WorkOrderDetail>(() => initialWorkOrder, [initialWorkOrder])
  const { showSuccess, showError, clearNotices } = page.notices
  const [remoteReconciliationKey, setRemoteReconciliationKey] = useState<string | null>(null)

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
    url: `/api/work-orders/${workOrderId}`,
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
    return nextWorkOrder
  }, [publishWorkOrder, refreshRecord])

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
    applyConflictWorkOrderSnapshot,
  })

  const serviceSection = useWorkOrderServiceSection({
    currentUserId,
    workOrderId,
    workOrder: currentWorkOrder,
    publishWorkOrder,
    applyConflictWorkOrderSnapshot,
    confirmDelete,
  })

  const salesRepSection = useWorkOrderSalesRepsSection({
    currentUserId,
    workOrderId,
    workOrder: currentWorkOrder,
    publishWorkOrder,
    applyConflictWorkOrderSnapshot,
    confirmDelete,
  })

  const materialSection = useWorkOrderMaterialSection({
    currentUserId,
    workOrderId,
    workOrder: currentWorkOrder,
    productOptions,
    publishWorkOrder,
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

  const unsavedWorkflowWarning = useMemo(
    () => buildUnsavedWorkflowWarning(dirtySections),
    [dirtySections],
  )

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

  useEffect(() => {
    let cancelled = false

    async function refreshReconciliation() {
      try {
        const payload = await requestJson<{ workOrder: WorkOrderReconciliationStatus }>(
          `/api/work-orders/${workOrderId}/reconciliation`,
          { cache: "no-store" },
        )
        if (cancelled) {
          return
        }

        const nextReconciliation = payload.workOrder
        const currentKey = buildWorkOrderReconciliationKey({
          updatedAt: currentWorkOrder.updatedAt,
          autoAllocationRun: autoAllocationWorkflow.value ?? currentWorkOrder.autoAllocationRun,
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
  }, [
    autoAllocationWorkflow.value,
    currentWorkOrder.autoAllocationRun,
    currentWorkOrder.updatedAt,
    dirtySections.length,
    refreshWorkOrderDetail,
    workOrderId,
  ])

  const currentExpenseSummary = useMemo(
    () =>
      normalizeWorkOrderExpenseSummary({
        items: materialSection.localValue,
        serviceItems: serviceSection.localValue,
        salesReps: salesRepSection.localValue,
      }),
    [materialSection.localValue, salesRepSection.localValue, serviceSection.localValue],
  )

  const currentCalculationRows = useMemo<WorkOrderCalculationRow[]>(
    () => buildWorkOrderCalculationRowsFromSummary(currentExpenseSummary),
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

  const panelSummary = useMemo(
    () => ({
      metrics: currentSummaryMetrics,
      payload: currentExpenseSummary,
    }),
    [currentExpenseSummary, currentSummaryMetrics],
  )

  const deleteWorkOrder = useCallback(async () => {
    clearNotices()

    try {
      await requestJson(`/api/work-orders/${currentWorkOrder.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, currentWorkOrder.updatedAt)),
      })
      clearRecordCache()
      onWorkOrderDeleted?.(currentWorkOrder.id)
      page.redirectToBack()
    } catch (deleteError) {
      showError(deleteError instanceof Error ? deleteError.message : "Failed to delete work order")
    }
  }, [
    clearNotices,
    clearRecordCache,
    currentWorkOrder.id,
    currentWorkOrder.updatedAt,
    onWorkOrderDeleted,
    page,
    showError,
  ])

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

  if (loading && !workOrder) {
    return <CenteredLoadingState label="Loading work order..." />
  }

  if (error && !workOrder) {
    return <CenteredErrorState title="Error" message={error} onDismiss={page.closePage} />
  }

  if (!workOrder) {
    return <CenteredErrorState title="Error" message="Work order could not be loaded." onDismiss={page.closePage} />
  }

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      slot: "primary",
      order: 0,
      dirtyLabel: "Work Order",
      controller: primarySection,
      render: () => (
        <RecordFieldSection
          title="Work Order Details"
          error={primarySection.error}
          noticeMessage={primarySection.noticeMessage}
          noticeError={primarySection.noticeError}
          isDirty={primarySection.isDirty}
          isSaving={primarySection.isSaving}
          hasConflict={primarySection.hasConflict}
          onSave={() => void primarySection.save()}
          onDiscard={primarySection.discard}
          saveLabel="Save Work Order"
          savingLabel="Saving Work Order..."
          showHeader={false}
        >
          <WorkOrderPrimaryFieldsSection
            draft={primarySection.localValue}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            selectedAddressValue={selectedAddress(
              propertyOptions,
              primarySection.localValue,
              currentWorkOrder.propertyAddress,
            )}
            unitType={currentWorkOrder.unitType}
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
        </RecordFieldSection>
      ),
    },
    {
      key: "material-items",
      type: "item",
      order: 10,
      dirtyLabel: "Material Items",
      controller: materialSection,
      render: () => (
        <WorkOrderMaterialItemsSection
          title="Material Items"
          items={materialSection.localValue}
          productOptions={productOptions}
          loading={loading}
          noticeMessage={materialSection.noticeMessage}
          noticeError={materialSection.noticeError}
          subHeader={{
            isDirty: materialSection.isDirty,
            isSaving: materialSection.isSaving,
            hasConflict: materialSection.hasConflict,
            error: materialSection.error ?? autoAllocationWorkflow.error,
            onSave: () => void materialSection.save(),
            onDiscard: () => materialSection.discard(),
            statusExtra: (
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
            ),
            actions: [
              { key: "add-material-item", kind: "add-row", label: "Add Material Item", onClick: materialSection.addItem },
              {
                key: "run-auto-allocation",
                kind: "workflow",
                label: autoAllocationButtonLabel,
                onClick: requestAutoAllocation,
                disabled: autoAllocationRequestBlocked || materialSection.localValue.length === 0,
              },
              ...(autoAllocationWorkflow.isPending
                ? [
                    {
                      key: "refresh-auto-allocation",
                      kind: "workflow" as const,
                      label: "Refresh Status",
                      onClick: () => void autoAllocationWorkflow.refresh(),
                    },
                  ]
                : []),
            ],
          }}
          itemErrors={materialSection.itemErrors}
          expandedItemIds={materialSection.expandedItemIds}
          onToggleExpandedItem={materialSection.toggleExpandedItem}
          onItemFieldChange={materialSection.changeItemField}
          onDeleteItem={materialSection.deleteItem}
          renderAllocations={(item) => (
            <MaterialAllocationsContent
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
      ),
    },
    {
      key: "service-items",
      type: "item",
      order: 20,
      dirtyLabel: "Service Items",
      controller: serviceSection,
      render: () => (
        <WorkOrderServiceItemsSection
          title="Service Items"
          items={serviceSection.localValue}
          serviceOptions={serviceOptions}
          unitOptions={unitOptions}
          totalAmount={currentExpenseSummary.serviceExpense}
          loading={loading}
          noticeMessage={serviceSection.noticeMessage}
          noticeError={serviceSection.noticeError}
          subHeader={{
            isDirty: serviceSection.isDirty,
            isSaving: serviceSection.isSaving,
            hasConflict: serviceSection.hasConflict,
            error: serviceSection.error,
            onSave: () => void serviceSection.save(),
            onDiscard: () => serviceSection.discard(),
            actions: [{ key: "add-service-item", kind: "add-row", label: "Add Service Item", onClick: serviceSection.addItem }],
          }}
          itemErrors={serviceSection.itemErrors}
          onItemFieldChange={serviceSection.changeField}
          onDeleteItem={serviceSection.deleteItem}
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
        <WorkOrderSalesRepsSection
          title="Sales Reps"
          items={salesRepSection.localValue}
          salesRepOptions={salesRepOptions as SalesRepOption[]}
          customerCost={currentExpenseSummary.customerCost}
          totalAmount={currentExpenseSummary.salesRepExpense}
          loading={loading}
          noticeMessage={salesRepSection.noticeMessage}
          noticeError={salesRepSection.noticeError}
          subHeader={{
            isDirty: salesRepSection.isDirty,
            isSaving: salesRepSection.isSaving,
            hasConflict: salesRepSection.hasConflict,
            error: salesRepSection.error,
            onSave: () => void salesRepSection.save(),
            onDiscard: () => salesRepSection.discard(),
            actions: [{ key: "add-sales-rep", kind: "add-row", label: "Add Sales Rep", onClick: salesRepSection.addItem }],
          }}
          itemErrors={salesRepSection.itemErrors}
          onItemFieldChange={salesRepSection.changeField}
          onDeleteItem={salesRepSection.deleteItem}
        />
      ),
    },
    {
      key: "calculations",
      type: "calculation",
      order: 40,
      render: () => (
        <WorkOrderCalculationsSection
          title="Calculations"
          items={currentCalculationRows}
          loading={false}
        />
      ),
    },
  ]

  return (
    <RecordMultiSectionPanel
      page={page}
      notices={page.notices}
      noticeContent={
        remoteReconciliationKey ? (
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
        ) : null
      }
      summary={panelSummary}
      sections={sections}
      footer={{
        deleteLabel: "Delete Work Order",
        deleteConfirmMessage: "Delete this work order? This cannot be undone.",
        onDelete: () => void deleteWorkOrder(),
      }}
    />
  )
}
