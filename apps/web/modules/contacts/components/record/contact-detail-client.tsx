"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { Contact } from "@builders/domain"
import { ContactRecordPanel } from "./contact-record-panel"

export function ContactDetailClient({
  initialContact,
  backHref,
}: {
  initialContact: Contact
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Contact Hub"
      backHref={backHref}
      headerVariant="section"
      modeNotice={{ mode: "edit", label: "Contact" }}
      dirtyMessage="You have unsaved contact changes. Leave this page without saving?"
    >
      {(page) => <ContactRecordPanel page={page} entry={initialContact} />}
    </RecordDetailClientScaffold>
  )
}
