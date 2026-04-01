"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toContactForm,
  validateContactForm,
  type ContactDetail,
  type ContactForm,
} from "../../../domain/types"

export function useContactPrimarySection({
  page,
  contact,
}: {
  page: RecordDetailClientScaffoldContext
  contact: ContactDetail
}) {
  return useSingleSectionRecordController<ContactDetail, ContactForm>({
    page,
    scope: "contact",
    id: contact.id,
    initialRecord: contact,
    detailUrl: `/api/contacts/${contact.id}`,
    payloadKey: "contact",
    createLocalValue: toContactForm,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateContactForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ contact: ContactDetail }>(`/api/contacts/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        serverValue: payload.contact,
        noticeMessage: "Contact saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/contacts/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete contact",
  })
}
