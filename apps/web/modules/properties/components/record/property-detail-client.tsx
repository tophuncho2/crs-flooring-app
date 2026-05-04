"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { PropertyRecordPanel } from "./property-record-panel"
import type { PropertyDetailRecord } from "@builders/domain"

export function PropertyDetailClient({
  property,
  backHref,
}: {
  property: PropertyDetailRecord
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Property ${property.name}`}
      backHref={backHref}
      dirtyMessage="You have unsaved property changes. Leave this property without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <PropertyRecordPanel page={page} property={property} />
      )}
    </RecordDetailClientScaffold>
  )
}
