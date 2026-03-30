"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/features/shared/engines/record-view"
import { ManagementCompanyRecordPanel } from "../panel/management-company-record-panel"
import type { ManagementCompanyDetail } from "../../domain/types"

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
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ManagementCompanyRecordPanel page={page} company={company} />
      )}
    </RecordDetailClientScaffold>
  )
}
