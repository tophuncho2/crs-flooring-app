"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { ManagementCompanyDetail } from "@builders/domain"
import { ManagementCompanyRecordView } from "./management-company-record-view"

export function ManagementCompanyDetailClient({
  managementCompany,
  backHref,
}: {
  managementCompany: ManagementCompanyDetail
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Management Hub"
      backHref={backHref}
      dirtyMessage="You have unsaved management-company changes. Leave without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ManagementCompanyRecordView page={page} entry={managementCompany} />
      )}
    </RecordDetailClientScaffold>
  )
}
