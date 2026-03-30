"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
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
    detailUrl: `/api/flooring/contacts/${contact.id}`,
    payloadKey: "contact",
    createLocalValue: toContactForm,
    saveSection: async ({ localValue, record }) => {
      page.notices.clearNotices()
      const validationError = validateContactForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ contact: ContactDetail }>(`/api/flooring/contacts/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      page.notices.showSuccess("Contact saved")
      return payload.contact
    },
    deleteRecord: async (record) => {
      page.notices.clearNotices()
      await requestJson<{ ok: true }>(`/api/flooring/contacts/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete contact",
  })
}
