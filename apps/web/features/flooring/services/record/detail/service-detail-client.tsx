"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/features/shared/engines/record-view"
import { ServiceRecordPanel } from "../panel/service-record-panel"
import type { ServiceRow, UnitOption } from "../../domain/types"

export function ServiceDetailClient({
  service,
  unitOptions,
  backHref,
}: {
  service: ServiceRow
  unitOptions: UnitOption[]
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Service ${service.name}`}
      backHref={backHref}
      dirtyMessage="You have unsaved service changes. Leave this service without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ServiceRecordPanel
          page={page}
          service={service}
          unitOptions={unitOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
