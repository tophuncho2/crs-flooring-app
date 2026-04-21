"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import type {
  InventoryDetail,
  InventoryLocationOption,
  InventoryWarehouseOption,
} from "@builders/domain"
import { InventoryRecordPanel } from "./inventory-record-panel"

export function InventoryDetailClient({
  initialRecord,
  locationOptions,
  warehouseOptions,
  backHref,
}: {
  initialRecord: InventoryDetail
  locationOptions: InventoryLocationOption[]
  warehouseOptions: InventoryWarehouseOption[]
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Inventory ${initialRecord.itemNumber}`}
      backHref={backHref}
      dirtyMessage="You have unsaved inventory changes. Leave this inventory record without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <InventoryRecordPanel
          page={page}
          inventory={initialRecord}
          locationOptions={locationOptions}
          warehouseOptions={warehouseOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
