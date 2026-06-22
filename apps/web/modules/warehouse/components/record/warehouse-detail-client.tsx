"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { WarehouseRow, WarehouseStats } from "@builders/domain"
import { WarehouseRecordPanel } from "./warehouse-record-panel"

export function WarehouseDetailClient({
  initialWarehouse,
  stats,
  backHref,
  previousWarehouseId,
  nextWarehouseId,
}: {
  initialWarehouse: WarehouseRow
  stats: WarehouseStats
  backHref: string
  previousWarehouseId: string | null
  nextWarehouseId: string | null
}) {
  return (
    <RecordDetailClientScaffold
      title="Warehouse Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved warehouse changes. Leave this page without saving?"
    >
      {(page) => (
        <WarehouseRecordPanel
          page={page}
          entry={initialWarehouse}
          stats={stats}
          previousWarehouseId={previousWarehouseId}
          nextWarehouseId={nextWarehouseId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
