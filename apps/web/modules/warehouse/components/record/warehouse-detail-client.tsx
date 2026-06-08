"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { WarehouseRow } from "@builders/domain"
import { WarehouseRecordPanel } from "./warehouse-record-panel"

export function WarehouseDetailClient({
  initialWarehouse,
  backHref,
}: {
  initialWarehouse: WarehouseRow
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Warehouse Hub"
      backHref={backHref}
      headerVariant="section"
      modeNotice={{ mode: "edit", label: "Warehouse" }}
      dirtyMessage="You have unsaved warehouse changes. Leave this page without saving?"
    >
      {(page) => <WarehouseRecordPanel page={page} entry={initialWarehouse} />}
    </RecordDetailClientScaffold>
  )
}
