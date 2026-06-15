"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { JobType, JobTypeStats } from "@builders/domain"
import { JobTypeRecordPanel } from "./job-type-record-panel"

export function JobTypeDetailClient({
  initialJobType,
  stats,
  backHref,
}: {
  initialJobType: JobType
  stats: JobTypeStats
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Job Types Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved job type changes. Leave this page without saving?"
    >
      {(page) => <JobTypeRecordPanel page={page} entry={initialJobType} stats={stats} />}
    </RecordDetailClientScaffold>
  )
}
