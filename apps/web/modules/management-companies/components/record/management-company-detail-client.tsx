"use client"

import { useQueryState } from "nuqs"
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
  // The drilled-in property lives in the URL (`?property=<id>`) so the browser
  // back button and deep links work.
  const [selectedPropertyId, setSelectedPropertyId] = useQueryState("property")

  return (
    <RecordDetailClientScaffold
      title="Management Hub"
      backHref={backHref}
      dirtyMessage="You have unsaved management-company changes. Leave without saving?"
      headerVariant="section"
      modeNotice={{ mode: "edit", label: "Management" }}
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ManagementCompanyRecordView
          page={page}
          entry={managementCompany}
          backHref={backHref}
          selectedPropertyId={selectedPropertyId}
          onSelectProperty={(id) => void setSelectedPropertyId(id)}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
