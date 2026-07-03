"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { updateTemplateRequest } from "@/modules/templates/data/mutations"
import { TEMPLATE_DETAIL_QUERY_KEY } from "@/modules/templates/data/template-detail-request"
import { useTemplatesListMutations } from "@/modules/templates/controllers/list/use-templates-list-mutations"
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
  const { deleteTemplate } = useTemplatesListMutations()
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<TemplateDetail, TemplateForm>({
    page,
    scope: "template",
    id: template.id,
    initialRecord: template,
    detailUrl: `/api/templates/${template.id}`,
    payloadKey: "template",
    createLocalValue: toTemplateForm,
    manageDirtySections: false,
    // Write-through every reconciled record into the detail query the reference
    // header reads (`templateDetail`), so a primary save or a planned-products save
    // (which publishes via `primary.publishRecord`) refreshes the header row
    // immediately — no manual page refresh.
    reconcile: (record) =>
      queryClient.setQueryData([...TEMPLATE_DETAIL_QUERY_KEY, template.id], record),
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
      await deleteTemplate.mutateAsync({ id: record.id, updatedAt: record.updatedAt })
    },
    deleteErrorMessage: "Failed to delete template",
  })
}
