"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  deleteTemplateRequest,
  updateTemplateRequest,
} from "@/modules/templates/data/mutations"
import {
  toTemplateForm,
  validateTemplateForm,
  type TemplateDetail,
  type TemplateForm,
} from "@builders/domain"

export function useTemplatePrimarySection({
  page,
  template,
}: {
  page: RecordDetailClientScaffoldContext
  template: TemplateDetail
}) {
  return useSingleSectionRecordController<TemplateDetail, TemplateForm>({
    page,
    scope: "template",
    id: template.id,
    initialRecord: template,
    detailUrl: `/api/templates/${template.id}`,
    payloadKey: "template",
    createLocalValue: toTemplateForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const validationError = validateTemplateForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await updateTemplateRequest(record.id, localValue, revisionKey)

      return {
        serverValue: payload.template,
        noticeMessage: "Template saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteTemplateRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete template",
  })
}
