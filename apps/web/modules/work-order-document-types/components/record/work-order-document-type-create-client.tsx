"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  EMPTY_WORK_ORDER_DOCUMENT_TYPE_FORM,
  type WorkOrderDocumentTypeForm,
} from "@builders/domain"
import { createWorkOrderDocumentTypeRequest } from "@/modules/work-order-document-types/data/mutations"
import { WorkOrderDocumentTypePrimaryFieldsSection } from "./primary/work-order-document-type-primary-fields-section"

function WorkOrderDocumentTypeCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<WorkOrderDocumentTypeForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_WORK_ORDER_DOCUMENT_TYPE_FORM }),
    createRecord: async (localValue) => {
      const { workOrderDocumentType } = await createWorkOrderDocumentTypeRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref(
          "/dashboard/work-order-document-types",
          workOrderDocumentType.id,
          backHref,
        ),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Document Type Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
    >
      <WorkOrderDocumentTypePrimaryFieldsSection
        draft={controller.primarySection.localValue}
        editable={!controller.primarySection.isSaving}
        onNameChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({ ...previous, name: value }))
        }
        onColorChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({ ...previous, color: value }))
        }
        onPrintConfigChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            printConfig: value,
          }))
        }
      />
    </RecordSingleSectionPanel>
  )
}

export function WorkOrderDocumentTypeCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Document Type"
      backHref={backHref}
      dirtyMessage="You have unsaved document type changes. Leave this form without saving?"
    >
      {(page) => <WorkOrderDocumentTypeCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
