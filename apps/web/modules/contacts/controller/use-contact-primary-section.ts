"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { updateContactRequest, deleteContactRequest } from "@/modules/contacts/data/mutations"
import {
  toContactForm,
  validateContactForm,
  type ContactDetail,
  type ContactForm,
} from "@builders/domain"

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
    saveSection: async ({ localValue, record, revisionKey }) => {
      const validationError = validateContactForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await updateContactRequest(record.id, localValue, revisionKey)

      return {
        serverValue: payload.contact,
        noticeMessage: "Contact saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteContactRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete contact",
  })
}
