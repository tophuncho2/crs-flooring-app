"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { InventoryRecordPanel } from "../panel/inventory-record-panel"
import type { InventoryRow, LocationOption } from "../../domain/types"

export function InventoryDetailClient({
  initialRecord,
  locationOptions,
  backHref,
}: {
  initialRecord: InventoryRow
  locationOptions: LocationOption[]
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
        />
      )}
    </RecordDetailClientScaffold>
  )
}
