"use client"

import { useQueryState } from "nuqs"
import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { Contact } from "@builders/domain"
import { ContactRecordView } from "./contact-record-view"

export function ContactDetailClient({
  initialContact,
  backHref,
}: {
  initialContact: Contact
  backHref: string
}) {
  // The labor-payments drilldown selection rides in the query string
  // (`?laborPayment=<id|"new">`), so a deep link (ledger row click) and the
  // dashboard "+ Labor Payment" picker can open the section in edit/create mode.
  const [laborPayment, setLaborPayment] = useQueryState("laborPayment")

  return (
    <RecordDetailClientScaffold
      title="Contact Hub"
      backHref={backHref}
      headerVariant="section"
      modeNotice={{ mode: "edit", label: "Contact" }}
      dirtyMessage="You have unsaved contact changes. Leave this page without saving?"
    >
      {(page) => (
        <ContactRecordView
          page={page}
          entry={initialContact}
          selectedLaborPaymentId={laborPayment}
          onSelectLaborPayment={(id) => void setLaborPayment(id)}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
