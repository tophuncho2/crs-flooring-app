"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { PropertyDetailRecord } from "@builders/domain"
import { PropertyRecordView } from "./property-record-view"

export function PropertyDetailClient({
  property,
  backHref,
}: {
  property: PropertyDetailRecord
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={property.name}
      backHref={backHref}
      dirtyMessage="You have unsaved property changes. Leave this property without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <PropertyRecordView page={page} entry={property} />
      )}
    </RecordDetailClientScaffold>
  )
}
