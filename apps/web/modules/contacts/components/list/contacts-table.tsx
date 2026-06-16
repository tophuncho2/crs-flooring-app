"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/engines/list-view"
import type { ContactListRow } from "@builders/domain"
import { CONTACTS_LIST_COLUMNS } from "./table/contacts-list-columns"
import { renderContactRowCell } from "./table/contacts-row-cell"

export function ContactsTable({
  rows,
  onOpenContact,
  pagination,
}: {
  rows: ContactListRow[]
  onOpenContact: (row: ContactListRow) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<ContactListRow>
      rows={rows}
      columns={CONTACTS_LIST_COLUMNS}
      empty="No contacts match this search."
      onOpenRow={(row) => onOpenContact(row)}
      getRowAriaLabel={(row) => `Open contact ${row.name}`}
      renderCell={renderContactRowCell}
      footerSlot={pagination}
    />
  )
}
