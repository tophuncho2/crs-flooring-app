"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildRecordDetailHref } from "@/features/shared/engines/common/record-entry"
import type { DraftWorkOrder, PropertyOption, WarehouseOption, WorkOrderRow } from "../../types"
import { WorkOrderPrimaryFieldsSection } from "../panel/sections/work-order-primary-fields-section"
import { selectedAddress } from "../panel/shared"

const EMPTY_WORK_ORDER_DRAFT: DraftWorkOrder = {
  propertyId: "",
  templateId: "",
  warehouseId: "",
  status: "BUILDING_ORDER",
  isComplete: false,
  vacancy: "",
  date: "",
  unitText: "",
  customAddress: "",
  instructions: "",
  notes: "",
  workOrderImageUrl: "",
}

function WorkOrderCreatePanel({
  page,
  backHref,
  propertyOptions,
  warehouseOptions,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
}) {
  const controller = useSingleSectionCreateController<DraftWorkOrder>({
    page,
    createInitialValue: () => ({ ...EMPTY_WORK_ORDER_DRAFT }),
    createRecord: async (localValue) => {
      const payload = await requestJson<{ workOrder: WorkOrderRow }>("/api/flooring/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta(localValue)),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/flooring/work-orders", payload.workOrder.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Work Order Details"
      controller={controller}
      showHeader={false}
      saveLabel="Save"
      savingLabel="Saving..."
      footer={{ onClose: page.closePage }}
    >
      <WorkOrderPrimaryFieldsSection
        draft={controller.primarySection.localValue}
        propertyOptions={propertyOptions}
        warehouseOptions={warehouseOptions}
        selectedAddressValue={selectedAddress(propertyOptions, controller.primarySection.localValue, "")}
        unitType=""
        setDraft={(value) => {
          controller.primarySection.setLocalValue((previous) => {
            const nextValue = typeof value === "function" ? value(previous) : value
            return nextValue ?? previous
          })
        }}
      />
    </RecordSingleSectionPanel>
  )
}

export function WorkOrderCreateClient({
  backHref,
  propertyOptions,
  warehouseOptions,
}: {
  backHref: string
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
}) {
  return (
    <RecordCreateClientScaffold
      title="New Work Order"
      backHref={backHref}
      dirtyMessage="You have unsaved work order changes. Leave this form without saving?"
    >
      {(page) => (
        <WorkOrderCreatePanel
          page={page}
          backHref={backHref}
          propertyOptions={propertyOptions}
          warehouseOptions={warehouseOptions}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
