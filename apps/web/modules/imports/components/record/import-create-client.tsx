"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import { createImportRequest } from "@/modules/imports/data/mutations"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  EMPTY_IMPORT_PRIMARY_FORM,
  type ImportPrimaryForm,
} from "@builders/domain"
import { ImportPrimaryFieldsSection } from "./primary/import-primary-fields-section"
import { ImportRecordFooter } from "./footer"

function ImportCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<ImportPrimaryForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_IMPORT_PRIMARY_FORM }),
    createRecord: async (localValue) => {
      const payload = await createImportRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/imports", payload.import.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Import Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Import"
        savingLabel="Creating Import..."
      >
        <ImportPrimaryFieldsSection
          draft={controller.primarySection.localValue}
          warehouseName={null}
          manufacturerName={null}
          disabled={controller.primarySection.isSaving}
          onFieldChange={(field, value) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              [field]: value,
            }))
          }}
        />
      </RecordSingleSectionPanel>
      <ImportRecordFooter onClose={page.closePage} />
    </div>
  )
}

export function ImportCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Import"
      backHref={backHref}
      dirtyMessage="You have unsaved import changes. Leave this form without saving?"
    >
      {(page) => <ImportCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
