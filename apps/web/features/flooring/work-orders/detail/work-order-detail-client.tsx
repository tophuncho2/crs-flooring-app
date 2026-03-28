"use client"

import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/shell/record-detail-page-shell"
import { RecordOptionsMenu } from "@/features/dashboard/shared/record-view/shell/record-options-menu"
import { WorkOrderRecordPanel } from "../components/record/work-order-record-panel"
import { useRecordPageController } from "@/features/dashboard/shared/record-view/client/use-record-page-controller"
import type { MaterialItemOption } from "@/features/flooring/shared/line-items/material-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/line-items/service-items-editor"
import { WorkOrderExpenseSummaryHeader } from "../components/work-order-expense-summary"
import { normalizeWorkOrderExpenseSummary } from "../domain/expense-summary"
import { useWorkOrderInvoiceController } from "../use-work-order-invoice-controller"
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
    initialWorkOrder.financialSummary ??
      normalizeWorkOrderExpenseSummary({
        items: initialWorkOrder.items ?? [],
        serviceItems: initialWorkOrder.serviceItems ?? [],
        salesReps: initialWorkOrder.salesReps ?? [],
      }),
  )
  const deferredExpenseSummary = useDeferredValue(expenseSummary)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [isPrimaryFieldsOpen, setIsPrimaryFieldsOpen] = useState(true)
  const [isInvoiceSectionOpen, setIsInvoiceSectionOpen] = useState(false)
  const [autoAllocateOption, setAutoAllocateOption] = useState<{
    label: string
    disabled: boolean
    onSelect: () => void
  } | null>(null)
  const invoice = useWorkOrderInvoiceController(workOrder.id, `${workOrder.updatedAt}:${refreshNonce}`, {
    enabled: isInvoiceSectionOpen,
  })
  const previousInvoiceStatusRef = useRef(invoice.invoice.generation?.status ?? null)

  const closePage = useCallback(() => {
    page.closePage()
  }, [page])

  useEffect(() => {
    const previousStatus = previousInvoiceStatusRef.current
    const currentStatus = invoice.invoice.generation?.status ?? null

    if (
      (previousStatus === "REQUESTED" || previousStatus === "QUEUED" || previousStatus === "PROCESSING") &&
      currentStatus === "COMPLETED"
    ) {
      page.notices.showSuccess("Invoice ready")
    }

    if (
      (previousStatus === "REQUESTED" || previousStatus === "QUEUED" || previousStatus === "PROCESSING") &&
      currentStatus === "FAILED"
    ) {
      page.notices.showError(invoice.invoice.generation?.error || "Invoice generation failed")
    }

    previousInvoiceStatusRef.current = currentStatus
  }, [invoice.invoice.generation, page.notices])

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
      if (payload.workOrder.financialSummary) {
        setExpenseSummary(payload.workOrder.financialSummary)
      }
      setRefreshNonce((current) => current + 1)
      page.notices.showSuccess("Work order marked complete")
    } catch (completeError) {
      page.notices.showError(completeError instanceof Error ? completeError.message : "Failed to complete work order")
    }
  }

  async function queueInvoiceGeneration() {
    page.notices.clearNotices()

    try {
      const nextInvoice = await invoice.queueInvoice()

      if (nextInvoice.generation?.status === "COMPLETED") {
        page.notices.showSuccess("Invoice already available")
        return
      }

      if (nextInvoice.generation?.status === "FAILED") {
        page.notices.showError(nextInvoice.generation.error || "Invoice generation failed")
        return
      }

      page.notices.showSuccess("Invoice generation requested")
    } catch (invoiceError) {
      page.notices.showError(invoiceError instanceof Error ? invoiceError.message : "Failed to request invoice generation")
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
            ...(autoAllocateOption
              ? [
                  {
                    label: autoAllocateOption.label,
                    onSelect: autoAllocateOption.onSelect,
                    disabled: autoAllocateOption.disabled,
                  },
                ]
              : []),
          ]}
        />
      }
    >
      <WorkOrderRecordPanel
        workOrderId={workOrder.id}
        initialWorkOrder={workOrder}
        showPrimaryFields={isPrimaryFieldsOpen}
        propertyOptions={propertyOptions}
        warehouseOptions={warehouseOptions}
        productOptions={productOptions}
        serviceOptions={serviceOptions}
        salesRepOptions={salesRepOptions}
        unitOptions={unitOptions}
        invoice={invoice.invoice}
        invoiceLoading={invoice.isLoading}
        invoiceGenerating={invoice.isGenerating}
        onQueueInvoice={() => void queueInvoiceGeneration()}
        onOpenInvoice={invoice.openInvoice}
        onInvoiceSectionOpenChange={setIsInvoiceSectionOpen}
        onAutoAllocateOptionsChange={setAutoAllocateOption}
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
          setExpenseSummary(savedWorkOrder.financialSummary)
        }}
        onWorkOrderDeleted={() => {
          page.redirectToBack()
        }}
      />
    </RecordDetailPageShell>
  )
}
