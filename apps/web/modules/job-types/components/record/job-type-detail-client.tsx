"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { JobType, JobTypeStats } from "@builders/domain"
import { JobTypeRecordPanel } from "./job-type-record-panel"

export function JobTypeDetailClient({
  initialJobType,
  stats,
  backHref,
  previousJobTypeId,
  nextJobTypeId,
}: {
  initialJobType: JobType
  stats: JobTypeStats
  backHref: string
  previousJobTypeId: string | null
  nextJobTypeId: string | null
}) {
  return (
    <RecordDetailClientScaffold
      title="Job Types Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved job type changes. Leave this page without saving?"
    >
      {(page) => (
        <JobTypeRecordPanel
          page={page}
          entry={initialJobType}
          stats={stats}
          previousJobTypeId={previousJobTypeId}
          nextJobTypeId={nextJobTypeId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
