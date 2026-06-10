"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls, ListToolbar, ListToolbarBottomRow, ListToolbarCell, ListViewNoticePortal, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { ContactsListFilters } from "@builders/application"
import {
  LIST_CONTACTS_PAGE_SIZE,
  type ContactListRow,
} from "@builders/domain"
import {
  CONTACTS_LIST_QUERY_KEY,
  listContactsRequest,
} from "@/modules/contacts/data/list-contacts-request"
import { useContactsListController } from "@/modules/contacts/controllers/list/use-contacts-list-controller"
import { ContactsTable } from "./contacts-table"
import { AddContactButton } from "./toolbar-controls/add-contact-button"
import { ContactsListSearch } from "./toolbar-controls/contacts-list-search"
import { ContactsClearAll } from "./toolbar-controls/sub-controls/contacts-clear-all"
import { ContactsRowCount } from "./toolbar-controls/sub-controls/contacts-row-count"

const CONTACTS_FILTERABLE_FIELDS = [] as const

export type ContactsClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: ContactsListFilters
}

export default function ContactsClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
}: ContactsClientProps) {
  const { message, pageError, openCreate, openContact } = useContactsListController()

  const {
    rows,
    total,
    searchQuery,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onClearAllFilters,
  } = useFetchListController<ContactListRow, ContactsListFilters>({
    mode: "fetch",
    queryKey: [...CONTACTS_LIST_QUERY_KEY],
    listFn: listContactsRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_CONTACTS_PAGE_SIZE,
    tableKey: "contacts-main",
    filterableFields: CONTACTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const hasActiveFilters = useMemo(() => searchQuery.trim().length > 0, [searchQuery])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <ListViewNoticePortal label="Contacts" />
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        {message || pageError ? (
          <div className="space-y-2 border-b border-[var(--panel-border)] px-4 py-3">
            {message ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}
            {pageError ? (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
                {pageError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Contacts
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <ContactsListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={
                    <ContactsClearAll
                      hasActive={hasActiveFilters}
                      onClick={handleClearAll}
                    />
                  }
                  right={<ContactsRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddContactButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <ContactsTable
        rows={rows}
        onOpenContact={(row) => openContact(row.id)}
        pagination={
          <PaginateControls
            page={page}
            pageSize={pageSize}
            totalItems={total}
            totalPages={totalPages}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        }
      />
    </div>
  )
}
