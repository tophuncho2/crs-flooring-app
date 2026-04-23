"use client"

import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import { createContactRequest } from "@/modules/contacts/data/mutations"
import { EMPTY_CONTACT_FORM, type ContactDetail, type ContactForm } from "@builders/domain"
import { ContactPrimaryFieldsSection } from "./contact-primary-fields-section"

const EMPTY_CONTACT: ContactDetail = {
  id: "new",
  name: "",
  type: "OTHER",
  typeLabel: "",
  createdAt: "",
  updatedAt: "",
}

function ContactCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<ContactForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_CONTACT_FORM }),
    createRecord: async (localValue) => {
      const payload = await createContactRequest(localValue)

      return {
        redirectTo: buildRecordDetailHref("/dashboard/contacts", payload.contact.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Contact Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create Contact"
      savingLabel="Creating Contact..."
      footer={{ onClose: page.closePage }}
    >
      <ContactPrimaryFieldsSection
        contact={EMPTY_CONTACT}
        draft={controller.primarySection.localValue}
        disabled={controller.primarySection.isSaving}
        onFieldChange={(field, value) => {
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            [field]: value,
          }))
        }}
      />
    </RecordSingleSectionPanel>
  )
}

export function ContactCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Contact"
      backHref={backHref}
      dirtyMessage="You have unsaved contact changes. Leave this form without saving?"
    >
      {(page) => <ContactCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
