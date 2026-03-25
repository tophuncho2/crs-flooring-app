"use client"

import type { ContactDetail } from "../../domain/types"
import { ContactRecordPanel } from "./contact-record-panel"

export function ContactDetailClient({
  contact,
  backHref,
}: {
  contact: ContactDetail
  backHref: string
}) {
  return <ContactRecordPanel contact={contact} backHref={backHref} />
}
