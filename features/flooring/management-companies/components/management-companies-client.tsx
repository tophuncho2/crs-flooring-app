"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME, FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "../../shared/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "../../shared/display/dashboard-card-title"
import { ErrorNotice, FormStatusNotices, SuccessNotice } from "../../shared/feedback/notices"
import { DeleteRowButton } from "../../shared/table/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/forms/record-form"
import { TableColumnSettings } from "../../shared/table/table-column-settings"
import TableControlsBar from "../../shared/table/table-controls-bar"
import { ClickableTableRow, TableActionsSummary, TableEmptyRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table/table-shell"
import { useConfiguredTableState } from "../../shared/table/use-configured-table-state"
import { useCanonicalDetailNavigation } from "../../shared/record-page/use-canonical-detail-navigation"
import { useServerTableQueryControls } from "../../shared/table/use-server-table-query-controls"
import { buildFullAddress, normalizeAddressState } from "../../shared/utils/address-helpers"

type ManagementCompanyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  properties: { id: string; name: string; fullAddress: string }[]
}

type DraftCompany = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

type ServerPaginationState = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref: string
  nextPageHref: string
}

type ServerTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

const defaultDraft: DraftCompany = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
}

export default function ManagementCompaniesClient({
  initialCompanies,
  tableState,
  pagination,
}: {
  initialCompanies: ManagementCompanyRow[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const [companies, setCompanies] = useState<ManagementCompanyRow[]>(initialCompanies)
  const [newDraft, setNewDraft] = useState<DraftCompany>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const companyNavigation = useCanonicalDetailNavigation("/dashboard/flooring/management-companies")
  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    setGroupByKeys,
    filteredRows: filteredCompanies,
    sortedRows: sortedCompanies,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedCompanyColumns,
    visibleColumns: visibleCompanyColumns,
    hiddenColumnKeys: hiddenCompanyColumnKeys,
    toggleColumnVisibility: toggleCompanyColumnVisibility,
    moveColumn: moveCompanyColumn,
    setColumnOrder: setCompanyColumnOrder,
  } = useConfiguredTableState({
    rows: companies,
    tableKey: "management-companies-main",
    fields: [
      { key: "company", label: "Company", getValue: (row) => row.name },
      { key: "street", label: "Street", getValue: (row) => row.streetAddress },
      { key: "city", label: "City", getValue: (row) => row.city },
      { key: "state", label: "State", getValue: (row) => row.state },
      { key: "zip", label: "Zip", getValue: (row) => row.zip },
      { key: "phone", label: "Phone", getValue: (row) => row.phone },
      { key: "email", label: "Email", getValue: (row) => row.email },
      { key: "fullAddress", label: "Full Address", getValue: (row) => row.fullAddress },
      { key: "properties", label: "Properties", getValue: (row) => row.properties.map((property) => property.name).join(" ") },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.name,
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled: false,
    setIsGroupingEnabled: () => undefined,
    groupByKeys: [],
    setGroupByKeys,
    groupOptions: [],
  })

  function setNewDraftField(field: keyof DraftCompany, value: string | string[]) {
    const normalizedValue = field === "state" && typeof value === "string" ? normalizeAddressState(value) : value
    setNewDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  async function createCompany() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.name.trim()) {
        throw new Error("Company name is required")
      }

      const response = await fetch("/api/flooring/management-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        managementCompany?: {
          id: string
          name: string
          streetAddress: string | null
          city: string | null
          state: string | null
          postalCode: string | null
          phone: string | null
          email: string | null
          properties: Array<{ id: string; name: string; fullAddress: string }>
        }
      }

      if (!response.ok || !payload.managementCompany) {
        throw new Error(payload.error ?? "Failed to create company")
      }

      const payloadCompany = payload.managementCompany
      const newCompany: ManagementCompanyRow = {
        id: payloadCompany.id,
        name: payloadCompany.name,
        streetAddress: payloadCompany.streetAddress ?? "",
        city: payloadCompany.city ?? "",
        state: payloadCompany.state ?? "",
        zip: payloadCompany.postalCode ?? "",
        phone: payloadCompany.phone ?? "",
        email: payloadCompany.email ?? "",
        fullAddress: buildFullAddress({
          streetAddress: payloadCompany.streetAddress ?? "",
          city: payloadCompany.city ?? "",
          state: payloadCompany.state ?? "",
          zip: payloadCompany.postalCode ?? "",
        }),
        properties: payloadCompany.properties,
      }

      setCompanies((prev) => [newCompany, ...prev])
      setNewDraft(defaultDraft)
      setIsCreateModalOpen(false)
      companyNavigation.openRecord(newCompany.id)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create company")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function deleteCompany(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/flooring/management-companies/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete company")
      }

      setCompanies((prev) => prev.filter((company) => company.id !== id))
      setMessage("Management company deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete company")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Management Companies</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredCompanies.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={serverTableControls.onSearchQueryChange}
              searchPlaceholder="Search company or property"
              isAscendingSort={isAscendingSort}
              onToggleSort={serverTableControls.onToggleSort}
            >
              <TableColumnSettings
                columns={orderedCompanyColumns}
                hiddenColumnKeys={hiddenCompanyColumnKeys}
                onToggleColumn={toggleCompanyColumnVisibility}
                onMoveColumn={moveCompanyColumn}
                onSetColumnOrder={setCompanyColumnOrder}
              />
              <button
                type="button"
                onClick={() => {
                  setMessage("")
                  setError("")
                  setNewDraft(defaultDraft)
                  setIsCreateModalOpen(true)
                }}
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Company
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {!isCreateModalOpen && message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {!isCreateModalOpen && error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1320px]">
          <TableHead>
            <tr>
              {visibleCompanyColumns.map((column) => (
                <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {sortedCompanies.map((row) => {
              const linkedProperties = row.properties.map((property) => property.name).join(", ") || "-"
              const cells: Record<string, ReactNode> = {
                company: <td key="company" className="px-3 py-2 font-medium text-blue-500">{row.name}</td>,
                street: <td key="street" className="px-3 py-2">{row.streetAddress || "-"}</td>,
                city: <td key="city" className="px-3 py-2">{row.city || "-"}</td>,
                state: <td key="state" className="px-3 py-2">{row.state || "-"}</td>,
                zip: <td key="zip" className="px-3 py-2">{row.zip || "-"}</td>,
                phone: <td key="phone" className="px-3 py-2">{row.phone || "-"}</td>,
                email: <td key="email" className="px-3 py-2">{row.email || "-"}</td>,
                fullAddress: <td key="fullAddress" className="px-3 py-2">{row.fullAddress || "-"}</td>,
                properties: (
                  <td key="properties" className="px-3 py-2">
                    <p className="text-xs text-[var(--foreground)]/70">{linkedProperties}</p>
                  </td>
                ),
                delete: (
                  <td key="delete" className="px-3 py-2">
                    <DeleteRowButton onClick={() => void deleteCompany(row.id)} disabled={deletingId === row.id}>
                      {deletingId === row.id ? "Deleting..." : "Delete"}
                    </DeleteRowButton>
                  </td>
                ),
              }

              return (
                <ClickableTableRow key={row.id} ariaLabel={`Edit management company ${row.name}`} onClick={() => companyNavigation.openRecord(row.id)}>
                  {visibleCompanyColumns.map((column) => cells[column.key])}
                </ClickableTableRow>
              )
            })}

            {filteredCompanies.length === 0 ? <TableEmptyRow message="No management companies found." colSpan={visibleCompanyColumns.length} /> : null}
          </tbody>
        </TableShell>
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredCompanies.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      </section>

      {isCreateModalOpen ? (
        <ModalShell title="New Management Company" onClose={() => !isSavingNew && setIsCreateModalOpen(false)}>
          <div className="space-y-6">
            <FormStatusNotices error={error} loadingMessage={isSavingNew ? "Creating management company..." : ""} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Company Name">
                <input value={newDraft.name} onChange={(event) => setNewDraftField("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Street Address">
                <input value={newDraft.streetAddress} onChange={(event) => setNewDraftField("streetAddress", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="City">
                <input value={newDraft.city} onChange={(event) => setNewDraftField("city", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="State">
                <input value={newDraft.state} onChange={(event) => setNewDraftField("state", event.target.value)} maxLength={2} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Zip">
                <input value={newDraft.zip} onChange={(event) => setNewDraftField("zip", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Phone">
                <input value={newDraft.phone} onChange={(event) => setNewDraftField("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Email">
                <input value={newDraft.email} onChange={(event) => setNewDraftField("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Full Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {buildFullAddress(newDraft) || "Company address preview"}
                </div>
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void createCompany()} disabled={isSavingNew} className={FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME}>
                {isSavingNew ? "Creating..." : "Create Company"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
