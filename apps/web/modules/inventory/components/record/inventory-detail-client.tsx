"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import type { InventoryDetail } from "@builders/domain"
import { InventoryRecordPanel } from "./inventory-record-panel"
import { InventoryPrintButton } from "./print/inventory-print-button"

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
      headerActions={<InventoryPrintButton recordId={initialRecord.id} />}
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <InventoryRecordPanel page={page} inventory={initialRecord} />
      )}
    </RecordDetailClientScaffold>
  )
}
