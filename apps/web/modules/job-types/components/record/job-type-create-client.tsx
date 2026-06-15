"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_JOB_TYPE_FORM, type JobTypeForm } from "@builders/domain"
import { createJobTypeRequest } from "@/modules/job-types/data/mutations"
import { JobTypePrimaryFieldsSection } from "./primary/job-type-primary-fields-section"

function JobTypeCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<JobTypeForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_JOB_TYPE_FORM }),
    createRecord: async (localValue) => {
      const { jobType } = await createJobTypeRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/job-types", jobType.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Job Type Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create Job Type"
      savingLabel="Creating Job Type..."
    >
      <JobTypePrimaryFieldsSection
        draft={controller.primarySection.localValue}
        editable={!controller.primarySection.isSaving}
        onFieldChange={(field, value) =>
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            [field]: value,
          }))
        }
      />
    </RecordSingleSectionPanel>
  )
}

export function JobTypeCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Job Type"
      backHref={backHref}
      dirtyMessage="You have unsaved job type changes. Leave this form without saving?"
    >
      {(page) => <JobTypeCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
