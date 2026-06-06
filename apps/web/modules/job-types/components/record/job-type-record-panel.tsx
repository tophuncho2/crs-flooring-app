"use client"

import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { JobType } from "@builders/domain"
import { useJobTypePrimarySection } from "@/modules/job-types/controllers/record/primary/use-job-type-primary-section"
import { JobTypePrimaryFieldsSection } from "./primary/job-type-primary-fields-section"

export function JobTypeRecordPanel({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: JobType
}) {
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
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
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
