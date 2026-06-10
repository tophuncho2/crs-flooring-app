"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { ManagementCompanyDetail, PropertyDetailRecord } from "@builders/domain"
import { PropertyRecordView } from "./property-record-view"

export function PropertyDetailClient({
  property,
  managementCompany,
  backHref,
}: {
  property: PropertyDetailRecord
  managementCompany: ManagementCompanyDetail | null
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Property Hub"
      backHref={backHref}
      dirtyMessage="You have unsaved property changes. Leave without saving?"
      headerVariant="section"
      modeNotice={{ mode: "edit", label: "Property" }}
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <PropertyRecordView
          page={page}
          entry={property}
          managementCompany={managementCompany}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
