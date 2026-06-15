"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { ManufacturerRow, ManufacturerStats } from "@builders/domain"
import { ManufacturerRecordPanel } from "./manufacturer-record-panel"

export function ManufacturerDetailClient({
  initialManufacturer,
  stats,
  backHref,
}: {
  initialManufacturer: ManufacturerRow
  stats: ManufacturerStats
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Manufacturers Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved manufacturer changes. Leave this page without saving?"
    >
      {(page) => <ManufacturerRecordPanel page={page} entry={initialManufacturer} stats={stats} />}
    </RecordDetailClientScaffold>
  )
}
