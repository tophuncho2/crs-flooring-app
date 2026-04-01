"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { ContactRecordPanel } from "../panel/contact-record-panel"
import type { ContactDetail } from "../../domain/types"

export function ContactDetailClient({
  contact,
  backHref,
}: {
  contact: ContactDetail
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Contact ${contact.name}`}
      backHref={backHref}
      dirtyMessage="You have unsaved contact changes. Leave this contact without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ContactRecordPanel page={page} contact={contact} />
      )}
    </RecordDetailClientScaffold>
  )
}
