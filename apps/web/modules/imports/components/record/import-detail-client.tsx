"use client"

import { useState } from "react"
import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { ImportRecordPanel } from "./import-record-panel"
import type { ImportDetail, InventoryRow, ProductPickerOption, StagedInventoryRow } from "@builders/domain"
import type { LocationOption, ManufacturerOption, WarehouseOption } from "@/modules/imports/controllers/drafts"

function formatImportNumber(value: number) {
  return `IMP-${String(value).padStart(4, "0")}`
}

export function ImportDetailClient({
  initialImport,
  initialStagedRows,
  initialLiveRows,
  initialProductPickerOptionsByItemId,
  warehouseOptions,
  manufacturerOptions,
  locationOptions,
  backHref,
}: {
  initialImport: ImportDetail
  initialStagedRows: StagedInventoryRow[]
  initialLiveRows: InventoryRow[]
  initialProductPickerOptionsByItemId: Record<string, ProductPickerOption>
  warehouseOptions: WarehouseOption[]
  manufacturerOptions: ManufacturerOption[]
  locationOptions: LocationOption[]
  backHref: string
}) {
  // Live rows fetched server-side; the read-only "Live inventory" section UI
  // lands in the next sweep alongside the mark-for-import controller. Keeping
  // the data wired now so that work is purely additive.
  const [liveRows] = useState(initialLiveRows)
  void liveRows

  return (
    <RecordDetailClientScaffold
      title={`Import ${formatImportNumber(initialImport.importNumber)}`}
      backHref={backHref}
      dirtyMessage="You have unsaved import changes. Leave this import record without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ImportRecordPanel
          page={page}
          entry={initialImport}
          initialStagedRows={initialStagedRows}
          initialProductPickerOptionsByItemId={initialProductPickerOptionsByItemId}
          warehouseOptions={warehouseOptions}
          manufacturerOptions={manufacturerOptions}
          locationOptions={locationOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
