"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import type { InventoryDetail } from "@builders/domain"
import { InventoryRecordPanel } from "./inventory-record-panel"

export function InventoryDetailClient({
  initialRecord,
  backHref,
}: {
  initialRecord: InventoryDetail
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={initialRecord.inventoryNumber}
      backHref={backHref}
      dirtyMessage="You have unsaved inventory changes. Leave this inventory record without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <InventoryRecordPanel page={page} inventory={initialRecord} />
      )}
    </RecordDetailClientScaffold>
  )
}
