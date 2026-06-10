"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toContactForm,
  validateContactForm,
  type Contact,
  type ContactForm,
} from "@builders/domain"
import { deleteContactRequest, updateContactRequest } from "@/modules/contacts/data/mutations"
import { CONTACTS_LIST_QUERY_KEY } from "@/modules/contacts/data/list-contacts-request"

export function useContactPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: Contact
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<Contact, ContactForm>({
    page,
    scope: "contacts",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/contacts/${entry.id}`,
    payloadKey: "contact",
    createLocalValue: toContactForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateContactForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { contact } = await updateContactRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: contact,
        noticeMessage: "Contact saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteContactRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: CONTACTS_LIST_QUERY_KEY })
    },
    deleteErrorMessage: "Failed to delete contact",
  })
}
