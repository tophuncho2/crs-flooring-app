"use client"

import { ContactPicker } from "@/modules/contacts/components/picker/contact-picker"

/**
 * Dashboard create entry. Creating a labor payment needs a contact, so "+ Labor
 * Payment" is a contact picker: choosing a contact routes into that contact's
 * record view with the labor-payments create face open (auto-seeded). Keeps the
 * shared `ContactPicker` + `/api/contacts/options` chain in use.
 */
export function LaborPaymentCreateEntry({ onPick }: { onPick: (contactId: string) => void }) {
  return (
    <ContactPicker
      value={null}
      onChange={(id) => {
        if (id) onPick(id)
      }}
      placeholder="+ Labor Payment"
      searchPlaceholder="Search contacts"
      ariaLabel="Create labor payment for a contact"
    />
  )
}
