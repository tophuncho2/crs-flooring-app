"use client"

import { useState } from "react"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import {
  RecordDetailClientScaffold,
  RecordOptionsMenu,
} from "@/modules/shared/engines/record-view"
import { WorkOrderRecordPanel } from "../panel/work-order-record-panel"
import type { MaterialItemOption } from "@/modules/shared/engines/record-view/contracts/material-item-contracts"
import type { ServiceOption, UnitOption } from "@/modules/shared/engines/record-view/contracts/service-item-contracts"
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
  const [workOrder, setWorkOrder] = useState(initialWorkOrder)

  return (
    <RecordDetailClientScaffold
      title={`Work Order ${workOrder.workOrderNumber}`}
      backHref={backHref}
      dirtyMessage="You have unsaved work order changes. Leave this work order without saving?"
      headerVariant="section"
      headerActions={(page) => (
        <RecordOptionsMenu
          items={[
            {
              label: "Complete",
              onSelect: () => {
                if (workOrder.isComplete) return
                if (!window.confirm("Mark this work order complete?")) return

                page.notices.clearNotices()

                void requestJson<{ workOrder?: WorkOrderDetail }>(`/api/work-orders/${workOrder.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(withMutationMeta({ isComplete: true }, workOrder.updatedAt)),
                })
                  .then((payload) => {
                    if (!payload.workOrder) {
                      throw new Error("Failed to complete work order")
                    }

                    setWorkOrder(payload.workOrder)
                    page.notices.showSuccess("Work order marked complete")
                  })
                  .catch((completeError) => {
                    page.notices.showError(
                      completeError instanceof Error ? completeError.message : "Failed to complete work order",
                    )
                  })
              },
              disabled: workOrder.isComplete,
            },
          ]}
        />
      )}
    >
      {(page) => (
        <WorkOrderRecordPanel
          page={page}
          currentUserId={currentUserId}
          workOrderId={workOrder.id}
          initialWorkOrder={workOrder}
          propertyOptions={propertyOptions}
          warehouseOptions={warehouseOptions}
          productOptions={productOptions}
          serviceOptions={serviceOptions}
          salesRepOptions={salesRepOptions}
          unitOptions={unitOptions}
          onWorkOrderChange={setWorkOrder}
          onWorkOrderSaved={setWorkOrder}
          onWorkOrderDeleted={() => {
            page.redirectToBack()
          }}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
