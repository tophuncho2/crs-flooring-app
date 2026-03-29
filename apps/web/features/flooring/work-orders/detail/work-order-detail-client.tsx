"use client"

import { startTransition, useCallback, useDeferredValue, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/shell/record-detail-page-shell"
import { RecordOptionsMenu } from "@/features/dashboard/shared/record-view/shell/record-options-menu"
import { WorkOrderRecordPanel } from "../components/record/work-order-record-panel"
import { useRecordPageController } from "@/features/dashboard/shared/record-view/client/use-record-page-controller"
import type { MaterialItemOption } from "@/features/flooring/shared/line-items/material-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/line-items/service-items-editor"
import { WorkOrderExpenseSummaryHeader } from "../components/work-order-expense-summary"
import { normalizeWorkOrderExpenseSummary } from "../domain/expense-summary"
import type { PropertyOption, SalesRepContactOption, WarehouseOption, WorkOrderDetail } from "../types"

export default function WorkOrderDetailClient({
  currentUserId,
  workOrder: initialWorkOrder,
  productOptions,
  propertyOptions,
  warehouseOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  backHref,
}: {
  currentUserId: string
  workOrder: WorkOrderDetail
  productOptions: MaterialItemOption[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  serviceOptions: ServiceOption[]
  salesRepOptions: SalesRepContactOption[]
  unitOptions: UnitOption[]
  backHref: string
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved work order changes. Leave this work order without saving?",
  })
  const [workOrder, setWorkOrder] = useState(initialWorkOrder)
  const [expenseSummary, setExpenseSummary] = useState(
    initialWorkOrder.financialSummary ??
      normalizeWorkOrderExpenseSummary({
        items: initialWorkOrder.items ?? [],
        serviceItems: initialWorkOrder.serviceItems ?? [],
        salesReps: initialWorkOrder.salesReps ?? [],
      }),
  )
  const deferredExpenseSummary = useDeferredValue(expenseSummary)
  const [isPrimaryFieldsOpen, setIsPrimaryFieldsOpen] = useState(true)

  const closePage = useCallback(() => {
    page.closePage()
  }, [page])

  async function markWorkOrderComplete() {
    if (workOrder.isComplete) return
    if (!window.confirm("Mark this work order complete?")) return

    page.notices.clearNotices()

    try {
      const payload = await requestJson<{ workOrder?: WorkOrderDetail }>(`/api/flooring/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({ isComplete: true }, workOrder.updatedAt)),
      })

      if (!payload.workOrder) {
        throw new Error("Failed to complete work order")
      }

      setWorkOrder(payload.workOrder)
      if (payload.workOrder.financialSummary) {
        setExpenseSummary(payload.workOrder.financialSummary)
      }
      page.notices.showSuccess("Work order marked complete")
    } catch (completeError) {
      page.notices.showError(completeError instanceof Error ? completeError.message : "Failed to complete work order")
    }
  }

  return (
    <RecordDetailPageShell
      title={`Work Order ${workOrder.workOrderNumber}`}
      backHref={backHref}
      onBack={closePage}
      onHeaderToggle={() => setIsPrimaryFieldsOpen((current) => !current)}
      isHeaderExpanded={isPrimaryFieldsOpen}
      headerMeta={<WorkOrderExpenseSummaryHeader summary={deferredExpenseSummary} />}
      headerActions={
        <RecordOptionsMenu
          items={[
            {
              label: "Complete",
              onSelect: () => void markWorkOrderComplete(),
              disabled: workOrder.isComplete,
            },
          ]}
        />
      }
    >
      <WorkOrderRecordPanel
        currentUserId={currentUserId}
        workOrderId={workOrder.id}
        initialWorkOrder={workOrder}
        showPrimaryFields={isPrimaryFieldsOpen}
        propertyOptions={propertyOptions}
        warehouseOptions={warehouseOptions}
        productOptions={productOptions}
        serviceOptions={serviceOptions}
        salesRepOptions={salesRepOptions}
        unitOptions={unitOptions}
        onClose={closePage}
        onExpenseSummaryChange={(nextSummary) => {
          startTransition(() => {
            setExpenseSummary(nextSummary)
          })
        }}
        onDirtySectionsChange={page.setDirtySections}
        notices={page.notices}
        onWorkOrderChange={(nextWorkOrder) => {
          setWorkOrder(nextWorkOrder)
          setExpenseSummary(nextWorkOrder.financialSummary)
        }}
        onWorkOrderSaved={(savedWorkOrder) => {
          page.setIsDirty(false)
          setWorkOrder(savedWorkOrder)
          setExpenseSummary(savedWorkOrder.financialSummary)
        }}
        onWorkOrderDeleted={() => {
          page.redirectToBack()
        }}
      />
    </RecordDetailPageShell>
  )
}
