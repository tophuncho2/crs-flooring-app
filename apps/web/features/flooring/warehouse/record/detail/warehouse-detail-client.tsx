"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import type { WarehouseDetail } from "../../types"
import { WarehouseRecordPanel } from "../panel/warehouse-record-panel"

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
