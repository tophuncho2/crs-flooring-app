"use client"

import { useCallback, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/primary-record-panel"
import { RecordLineSummary } from "@/features/flooring/shared/record-line-summary"
import { RecordOptionsMenu } from "@/features/flooring/shared/record-options-menu"
import { RecordDetailPageShell } from "@/features/flooring/shared/record-page/record-detail-page-shell"
import { useRecordPageController } from "@/features/flooring/shared/record-page/use-record-page-controller"
import { WorkOrderRecordPanel } from "../components/work-order-record-panel"
import type { MaterialItemOption } from "@/features/flooring/shared/record-items/material-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/record-items/service-items-editor"

type PropertyOption = {
  id: string
  name: string
  address: string
}

type WarehouseOption = {
  id: string
  name: string
}

type WorkOrderDetail = {
  id: string
  workOrderNumber: string
  propertyId: string
  templateId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  createdAt: string
  updatedAt: string
  hasShortage?: boolean
}

export default function WorkOrderDetailClient({
  workOrder: initialWorkOrder,
  productOptions,
  propertyOptions,
  warehouseOptions,
  serviceOptions,
  unitOptions,
  backHref,
}: {
  workOrder: WorkOrderDetail
  productOptions: MaterialItemOption[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  backHref: string
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved work order changes. Leave this work order without saving?",
  })
  const [workOrder, setWorkOrder] = useState(initialWorkOrder)
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
      headerMeta={<RecordLineSummary materialItems={page.summary.materialItems} serviceItems={page.summary.serviceItems} variant="header" />}
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
        unitOptions={unitOptions}
        onClose={closePage}
        refreshNonce={refreshNonce}
        onSummaryChange={page.setSummary}
        onDirtyChange={page.setIsDirty}
        notices={page.notices}
        onWorkOrderSaved={(savedWorkOrder) => {
          page.setIsDirty(false)
          setWorkOrder((previous) => ({
            ...previous,
            ...savedWorkOrder,
          }))
        }}
        onWorkOrderDeleted={() => {
          page.redirectToBack()
        }}
      />
    </RecordDetailPageShell>
  )
}
