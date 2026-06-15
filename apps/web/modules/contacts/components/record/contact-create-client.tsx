"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_CONTACT_FORM, type ContactForm } from "@builders/domain"
import { createContactRequest } from "@/modules/contacts/data/mutations"
import { ContactPrimaryFieldsSection } from "./primary/contact-primary-fields-section"

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
      const { contact } = await createContactRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/contacts", contact.id, backHref),
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
    >
      <ContactPrimaryFieldsSection
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
