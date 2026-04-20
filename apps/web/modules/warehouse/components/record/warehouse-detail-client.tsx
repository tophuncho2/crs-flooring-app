"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import type { WarehouseDetailRecord } from "@builders/db"
import { WarehouseRecordPanel } from "./warehouse-record-panel"

export function WarehouseDetailClient({
  warehouse,
  backHref,
}: {
  warehouse: WarehouseDetailRecord
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Warehouse ${warehouse.name}`}
      backHref={backHref}
      dirtyMessage="You have unsaved warehouse changes. Leave this warehouse without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <WarehouseRecordPanel
          page={page}
          warehouse={warehouse}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
