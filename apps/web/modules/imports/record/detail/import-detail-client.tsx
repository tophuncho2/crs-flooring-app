"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { ImportRecordPanel } from "../panel/import-record-panel"
import type { ImportRow, LocationOption, ProductOption, WarehouseOption } from "../../domain/types"

function formatImportNumber(value: number) {
  return `IMP-${String(value).padStart(4, "0")}`
}

export function ImportDetailClient({
  initialImport,
  productOptions,
  warehouseOptions,
  locationOptions,
  backHref,
}: {
  initialImport: ImportRow
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  backHref: string
}) {
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
          productOptions={productOptions}
          warehouseOptions={warehouseOptions}
          locationOptions={locationOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
