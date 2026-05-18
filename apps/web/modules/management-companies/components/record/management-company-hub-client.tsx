"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/scaffolds/record-detail-client-scaffold"
import { ManagementCompanyRecordPanel } from "./management-company-record-panel"
import type { ManagementCompanyDetail } from "@builders/domain"

export function ManagementCompanyDetailClient({
  company,
  backHref,
}: {
  company: ManagementCompanyDetail
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Management Company ${company.name}`}
      backHref={backHref}
      dirtyMessage="You have unsaved management company changes. Leave this management company without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ManagementCompanyRecordPanel page={page} company={company} />
      )}
    </RecordDetailClientScaffold>
  )
}
