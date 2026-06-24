"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { EntityDetail, PropertyDetailRecord } from "@builders/domain"
import { PropertyRecordView } from "./property-record-view"

export function PropertyDetailClient({
  property,
  entity,
  backHref,
}: {
  property: PropertyDetailRecord
  entity: EntityDetail | null
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Properties Hub"
      backHref={backHref}
      dirtyMessage="You have unsaved property changes. Leave without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <PropertyRecordView
          page={page}
          entry={property}
          entity={entity}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
