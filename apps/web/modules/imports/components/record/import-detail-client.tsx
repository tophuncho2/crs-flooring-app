"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { ImportRecordPanel } from "./import-record-panel"
import type { ImportDetail as ImportRow } from "@builders/domain"
import type { CategoryOption, LocationOption, ProductOption, WarehouseOption } from "@/modules/imports/controllers/drafts"

function formatImportNumber(value: number) {
  return `IMP-${String(value).padStart(4, "0")}`
}

export function ImportDetailClient({
  initialImport,
  productOptions,
  warehouseOptions,
  locationOptions,
  categoryOptions,
  backHref,
}: {
  initialImport: ImportRow
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  categoryOptions: CategoryOption[]
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
          categoryOptions={categoryOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
