"use client"

import { useCallback, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import {
  RecordDetailPageShell,
  RecordOptionsMenu,
  useRecordPageController,
} from "@/features/shared/engines/record-view"
import { WorkOrderRecordPanel } from "../panel/work-order-record-panel"
import type { MaterialItemOption } from "@/features/flooring/shared/line-items/material-items-editor"
import type { ServiceOption, UnitOption } from "@/features/flooring/shared/line-items/service-items-editor"
import type { PropertyOption, SalesRepContactOption, WarehouseOption, WorkOrderDetail } from "../../types"

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
      headerVariant="section"
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
        usePageHeaderForPrimarySection
        propertyOptions={propertyOptions}
        warehouseOptions={warehouseOptions}
        productOptions={productOptions}
        serviceOptions={serviceOptions}
        salesRepOptions={salesRepOptions}
        unitOptions={unitOptions}
        onClose={closePage}
        onDirtySectionsChange={page.setDirtySections}
        notices={page.notices}
        onWorkOrderChange={(nextWorkOrder) => {
          setWorkOrder(nextWorkOrder)
        }}
        onWorkOrderSaved={(savedWorkOrder) => {
          page.setIsDirty(false)
          setWorkOrder(savedWorkOrder)
        }}
        onWorkOrderDeleted={() => {
          page.redirectToBack()
        }}
      />
    </RecordDetailPageShell>
  )
}
