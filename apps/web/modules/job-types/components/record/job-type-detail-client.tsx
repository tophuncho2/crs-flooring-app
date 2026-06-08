"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { JobType } from "@builders/domain"
import { JobTypeRecordPanel } from "./job-type-record-panel"

export function JobTypeDetailClient({
  initialJobType,
  backHref,
}: {
  initialJobType: JobType
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Job Type Hub"
      backHref={backHref}
      headerVariant="section"
      modeNotice={{ mode: "edit", label: "Job Type" }}
      dirtyMessage="You have unsaved job type changes. Leave this page without saving?"
    >
      {(page) => <JobTypeRecordPanel page={page} entry={initialJobType} />}
    </RecordDetailClientScaffold>
  )
}
