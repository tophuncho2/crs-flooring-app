"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/scaffolds/record-detail-client-scaffold"
import { ManufacturerRecordPanel } from "./manufacturer-record-panel"
import type { ManufacturerRow } from "@builders/domain"

export function ManufacturerDetailClient({
  manufacturer,
  backHref,
}: {
  manufacturer: ManufacturerRow
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Manufacturer ${manufacturer.companyName || manufacturer.agentName}`}
      backHref={backHref}
      dirtyMessage="You have unsaved manufacturer changes. Leave this manufacturer without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ManufacturerRecordPanel page={page} manufacturer={manufacturer} />
      )}
    </RecordDetailClientScaffold>
  )
}
