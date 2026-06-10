"use client"

import { SearchControl } from "@/engines/list-view"

export type ContactsListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function ContactsListSearch({ query, onQueryChange }: ContactsListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search contacts"
    />
  )
}
