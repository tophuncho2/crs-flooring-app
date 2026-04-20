"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import type { WarehouseDetail } from "@/modules/warehouse/types"
import { WarehouseRecordPanel } from "./warehouse-record-panel"

export function WarehouseDetailClient({
  warehouse,
  backHref,
}: {
  warehouse: WarehouseDetail
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
