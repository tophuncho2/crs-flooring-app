"use client"

import { useRouter } from "next/navigation"
import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { JobType, JobTypeStats } from "@builders/domain"
import { useJobTypePrimarySection } from "@/modules/job-types/controllers/record/primary/use-job-type-primary-section"
import { JobTypePrimaryFieldsSection } from "./primary/job-type-primary-fields-section"
import { JobTypeStatisticsSection } from "./statistics/job-type-statistics-section"

export function JobTypeRecordPanel({
  page,
  entry,
  stats,
  previousJobTypeId,
  nextJobTypeId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: JobType
  stats: JobTypeStats
  previousJobTypeId: string | null
  nextJobTypeId: string | null
}) {
  const router = useRouter()
  const controller = useJobTypePrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "job type",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Job Type"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
        >
          <JobTypePrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            jobTypeNumber={record.jobTypeNumber}
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
            createdBy={record.createdBy}
            updatedBy={record.updatedBy}
          />
        </RecordPrimarySectionInstance>
      ),
    },
    {
      key: "statistics",
      type: "item",
      order: 20,
      render: () => <JobTypeStatisticsSection stats={stats} />,
    },
  ]

  return (
    <>
      {/* Walks the global JT-number line (◀ JT-n ▶) from the top bar. Job-type
          detail is a per-id page, so a step router-navigates to the neighbor's
          page; the portal's dirty guard prompts first when edited. */}
      <RecordStepperPortal
        label={entry.jobTypeNumber}
        isDirty={page.isDirty}
        discardMessage="This job type has unsaved changes. Stepping to another job type will discard them."
        onPrevious={
          previousJobTypeId
            ? () => router.push(`/dashboard/job-types/${previousJobTypeId}`)
            : null
        }
        onNext={
          nextJobTypeId
            ? () => router.push(`/dashboard/job-types/${nextJobTypeId}`)
            : null
        }
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Job Type"
        confirmTitle="Delete job type?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
