"use client"

import { startTransition, useCallback, useDeferredValue, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/ui/record-page/record-panel-width"
import { RecordOptionsMenu } from "@/features/flooring/shared/ui/display/record-options-menu"
import { RecordDetailPageShell } from "@/features/flooring/shared/ui/record-page/record-detail-page-shell"
import { useRecordPageController } from "@/features/flooring/shared/controllers/record-page/use-record-page-controller"
import { WorkOrderRecordPanel } from "../components/work-order-record-panel"
import type { MaterialItemOption } from "@/features/flooring/shared/ui/record-items/material-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/ui/record-items/service-items-editor"
import { WorkOrderExpenseSummaryHeader } from "../components/work-order-expense-summary"
import { normalizeWorkOrderExpenseSummary } from "../domain/expense-summary"
import type { PropertyOption, SalesRepContactOption, WarehouseOption, WorkOrderDetail } from "../types"

export default function WorkOrderDetailClient({
  workOrder: initialWorkOrder,
  productOptions,
  propertyOptions,
  warehouseOptions,
  serviceOptions,
  salesRepOptions,
  unitOptions,
  backHref,
}: {
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
    initialWorkOrder.expenseSummary ??
      normalizeWorkOrderExpenseSummary({
        items: initialWorkOrder.items ?? [],
        serviceItems: initialWorkOrder.serviceItems ?? [],
        salesReps: initialWorkOrder.salesReps ?? [],
      }),
  )
  const deferredExpenseSummary = useDeferredValue(expenseSummary)
  const [refreshNonce, setRefreshNonce] = useState(0)

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
        body: JSON.stringify({ isComplete: true }),
      })

      if (!payload.workOrder) {
        throw new Error("Failed to complete work order")
      }

      setWorkOrder((previous) => ({
        ...previous,
        ...payload.workOrder,
      }))
      if (payload.workOrder.expenseSummary) {
        setExpenseSummary(payload.workOrder.expenseSummary)
      }
      setRefreshNonce((current) => current + 1)
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
      headerMeta={<WorkOrderExpenseSummaryHeader summary={deferredExpenseSummary} />}
      headerActions={
        <RecordOptionsMenu
          items={[
            {
              label: "Complete",
              onSelect: () => void markWorkOrderComplete(),
              disabled: workOrder.isComplete,
            },
            {
              label: "Invoice",
              disabled: true,
            },
          ]}
        />
      }
      sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
    >
      <WorkOrderRecordPanel
        workOrderId={workOrder.id}
        initialWorkOrder={workOrder}
        propertyOptions={propertyOptions}
        warehouseOptions={warehouseOptions}
        productOptions={productOptions}
        serviceOptions={serviceOptions}
        salesRepOptions={salesRepOptions}
        unitOptions={unitOptions}
        onClose={closePage}
        refreshNonce={refreshNonce}
        onExpenseSummaryChange={(nextSummary) => {
          startTransition(() => {
            setExpenseSummary(nextSummary)
          })
        }}
        onDirtyChange={page.setIsDirty}
        notices={page.notices}
        onWorkOrderSaved={(savedWorkOrder) => {
          page.setIsDirty(false)
          setWorkOrder((previous) => ({
            ...previous,
            ...savedWorkOrder,
          }))
          setExpenseSummary(savedWorkOrder.expenseSummary)
        }}
        onWorkOrderDeleted={() => {
          page.redirectToBack()
        }}
      />
    </RecordDetailPageShell>
  )
}
