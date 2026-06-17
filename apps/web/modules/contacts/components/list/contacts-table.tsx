"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
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
  pagination?: PaginateContract
}) {
  return (
    <DataTable<ContactListRow>
      rows={rows}
      columns={CONTACTS_LIST_COLUMNS}
      empty="No contacts match this search."
      onOpenRow={(row) => onOpenContact(row)}
      getRowAriaLabel={(row) => `Open contact ${row.name}`}
      renderCell={renderContactRowCell}
      pagination={pagination}
    />
  )
}
