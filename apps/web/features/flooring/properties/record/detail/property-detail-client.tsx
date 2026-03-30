"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/features/shared/engines/record-view"
import { PropertyRecordPanel } from "../panel/property-record-panel"
import type { PropertyDetailRecord } from "../../domain/types"

export function PropertyDetailClient({
  property,
  managementOptions,
  warehouseOptions,
  backHref,
}: {
  property: PropertyDetailRecord
  managementOptions: Array<{ id: string; name: string }>
  warehouseOptions: Array<{ id: string; name: string }>
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
        <PropertyRecordPanel
          page={page}
          property={property}
          managementOptions={managementOptions}
          warehouseOptions={warehouseOptions}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
