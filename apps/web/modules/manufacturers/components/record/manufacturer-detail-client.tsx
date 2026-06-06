"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { ManufacturerRow } from "@builders/domain"
import { ManufacturerRecordPanel } from "./manufacturer-record-panel"

export function ManufacturerDetailClient({
  initialManufacturer,
  backHref,
}: {
  initialManufacturer: ManufacturerRow
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={initialManufacturer.companyName || initialManufacturer.agentName || "Manufacturer"}
      backHref={backHref}
      dirtyMessage="You have unsaved manufacturer changes. Leave this page without saving?"
    >
      {(page) => <ManufacturerRecordPanel page={page} entry={initialManufacturer} />}
    </RecordDetailClientScaffold>
  )
}
