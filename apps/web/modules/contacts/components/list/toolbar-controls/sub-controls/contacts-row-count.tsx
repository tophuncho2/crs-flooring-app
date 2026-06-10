"use client"

import { ListRowCount } from "@/engines/list-view"

export type ContactsRowCountProps = {
  count: number
  total: number
}

export function ContactsRowCount({ count, total }: ContactsRowCountProps) {
  return <ListRowCount count={count} total={total} label="contacts" />
}
