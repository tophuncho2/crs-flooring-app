"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { requestJson } from "@/features/flooring/shared/http"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/primary-record-panel"
import { RecordLineSummary } from "@/features/flooring/shared/record-line-summary"
import { RecordOptionsMenu } from "@/features/flooring/shared/record-options-menu"
import { RecordDetailPageShell } from "@/features/flooring/shared/record-detail-page-shell"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { useUnsavedChangesGuard } from "@/features/flooring/shared/use-unsaved-changes-guard"
import { WorkOrderRecordPanel } from "../components/work-order-record-panel"
import type { MaterialItemOption } from "@/features/flooring/shared/material-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/service-items-editor"

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
  const router = useRouter()
  const notices = useRecordNotices()
  const [workOrder, setWorkOrder] = useState(initialWorkOrder)
  const [isDirty, setIsDirty] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [summary, setSummary] = useState<{
    materialItems: Array<{ quantity: string; unitPrice: string }>
    serviceItems: Array<{ quantity: string; unitPrice: string }>
  }>({
    materialItems: [],
    serviceItems: [],
  })
  const guard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved work order changes. Leave this work order without saving?",
  })

  const closePage = useCallback(() => {
    guard.confirmNavigation(() => {
      router.push(backHref, { scroll: false })
    })
  }, [backHref, guard, router])

  async function markWorkOrderComplete() {
    if (workOrder.isComplete) return
    if (!window.confirm("Mark this work order complete?")) return

    notices.clearNotices()

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
      notices.showSuccess("Work order marked complete")
    } catch (completeError) {
      notices.showError(completeError instanceof Error ? completeError.message : "Failed to complete work order")
    }
  }

  return (
    <RecordDetailPageShell
      title={`Work Order ${workOrder.workOrderNumber}`}
      backHref={backHref}
      onBack={closePage}
      headerMeta={<RecordLineSummary materialItems={summary.materialItems} serviceItems={summary.serviceItems} variant="header" />}
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
        onSummaryChange={setSummary}
        onDirtyChange={setIsDirty}
        notices={notices}
        onWorkOrderSaved={(savedWorkOrder) => {
          setIsDirty(false)
          setWorkOrder((previous) => ({
            ...previous,
            ...savedWorkOrder,
          }))
        }}
        onWorkOrderDeleted={() => {
          setIsDirty(false)
          router.push(backHref, { scroll: false })
        }}
      />
    </RecordDetailPageShell>
  )
}
