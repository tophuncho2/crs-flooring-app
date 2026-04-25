"use client"

import { useState } from "react"
import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { ImportRecordPanel } from "./import-record-panel"
import type { ImportDetail, InventoryRow, StagedInventoryRow } from "@builders/domain"
import type { CategoryOption, LocationOption, ManufacturerOption, ProductOption, WarehouseOption } from "@/modules/imports/controllers/drafts"

function formatImportNumber(value: number) {
  return `IMP-${String(value).padStart(4, "0")}`
}

export function ImportDetailClient({
  initialImport,
  initialStagedRows,
  initialLiveRows,
  productOptions,
  warehouseOptions,
  manufacturerOptions,
  locationOptions,
  categoryOptions,
  backHref,
}: {
  initialImport: ImportDetail
  initialStagedRows: StagedInventoryRow[]
  initialLiveRows: InventoryRow[]
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  manufacturerOptions: ManufacturerOption[]
  locationOptions: LocationOption[]
  categoryOptions: CategoryOption[]
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
          productOptions={productOptions}
          warehouseOptions={warehouseOptions}
          manufacturerOptions={manufacturerOptions}
          locationOptions={locationOptions}
          categoryOptions={categoryOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
