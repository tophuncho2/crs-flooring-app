"use client"

import {
  buildSingleSectionDeleteConfirmationMessage,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { useContactPrimarySection } from "./controllers/use-contact-primary-section"
import { ContactPrimaryFieldsSection } from "./sections/contact-primary-fields-section"
import type { ContactForm, ContactDetail } from "../../domain/types"

export function ContactRecordPanel({
  page,
  contact,
}: {
  page: RecordDetailClientScaffoldContext
  contact: ContactDetail
}) {
  const controller = useContactPrimarySection({
    page,
    contact,
  })

  return (
    <RecordSingleSectionPanel
      title="Contact Details"
      controller={controller}
      showHeader={false}
      saveLabel="Save Contact"
      savingLabel="Saving Contact..."
      deleteLabel="Delete Contact"
      deleteConfirmationMessage={buildSingleSectionDeleteConfirmationMessage({
        entityLabel: "contact",
        description: "If this contact is linked to templates or work orders, deletion will be blocked.",
      })}
    >
      <ContactPrimaryFieldsSection
        contact={controller.record}
        draft={controller.primarySection.localValue}
        disabled={controller.primarySection.isSaving}
        onFieldChange={(field, value) => {
          controller.primarySection.setLocalValue((previous: ContactForm) => ({
            ...previous,
            [field]: value,
          }))
        }}
      />
    </RecordSingleSectionPanel>
  )
}
