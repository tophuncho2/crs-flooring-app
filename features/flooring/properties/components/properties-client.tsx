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
import { ClickableTableRow, TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table/table-shell"
import { useConfiguredTableState } from "../../shared/table/use-configured-table-state"
import { useCanonicalDetailNavigation } from "../../shared/record-page/use-canonical-detail-navigation"
import { useServerTableQueryControls } from "../../shared/table/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/table/use-table-controls"
import { buildFullAddress, normalizeAddressState } from "../../shared/utils/address-helpers"

type ManagementCompanyOption = {
  id: string
  name: string
}

type PropertyManagementCompany = {
  id: string
  name: string
}

type PropertyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: PropertyManagementCompany | null
  templates: Array<{
    id: string
    templateTag: string
    warehouseName: string
    itemsCount: number
  }>
}

type DraftProperty = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  managementCompanyId: string
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

const defaultDraft: DraftProperty = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  managementCompanyId: "",
}

export default function PropertiesClient({
  initialProperties,
  managementOptions,
  tableState,
  pagination,
}: {
  initialProperties: PropertyRow[]
  managementOptions: ManagementCompanyOption[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const [properties, setProperties] = useState<PropertyRow[]>(initialProperties)
  const [newDraft, setNewDraft] = useState<DraftProperty>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const propertyNavigation = useCanonicalDetailNavigation("/dashboard/flooring/properties")
  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupFields,
    filteredRows: filteredProperties,
    sortedRows: sortedProperties,
    groupedRowTree: groupedProperties,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedPropertyColumns,
    visibleColumns: visiblePropertyColumns,
    hiddenColumnKeys: hiddenPropertyColumnKeys,
    toggleColumnVisibility: togglePropertyColumnVisibility,
    moveColumn: movePropertyColumn,
    setColumnOrder: setPropertyColumnOrder,
  } = useConfiguredTableState({
    rows: properties,
    tableKey: "properties-main",
    fields: [
      { key: "property", label: "Property", getValue: (row) => row.name, groupable: false },
      { key: "street", label: "Street", getValue: (row) => row.streetAddress, groupable: false },
      { key: "city", label: "City", getValue: (row) => row.city, groupable: true },
      { key: "state", label: "State", getValue: (row) => row.state, groupable: true },
      { key: "zip", label: "Zip", getValue: (row) => row.zip, groupable: false },
      { key: "phone", label: "Phone", getValue: (row) => row.phone, groupable: false },
      { key: "email", label: "Email", getValue: (row) => row.email, groupable: false },
      { key: "fullAddress", label: "Full Address", getValue: (row) => row.fullAddress, groupable: false },
      { key: "managementCompany", label: "Management Company", getValue: (row) => row.managementCompany?.name ?? "No management company", groupable: true },
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
  const propertyGroupOptions = groupFields.map((field) => ({ key: field.key, label: field.label }))
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions: propertyGroupOptions,
  })

  function setNewDraftField(field: keyof DraftProperty, value: string | string[]) {
    const normalizedValue = field === "state" && typeof value === "string" ? normalizeAddressState(value) : value
    setNewDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  async function createProperty() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.name.trim()) {
        throw new Error("Property name is required")
      }

      const response = await fetch("/api/flooring/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDraft,
          managementCompanyId: newDraft.managementCompanyId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        property?: PropertyRow & {
          managementCompany: {
            id: string
            name: string
          } | null
          templates?: PropertyRow["templates"]
        }
      }

      if (!response.ok || !payload.property) {
        throw new Error(payload.error ?? "Failed to create property")
      }

      const createdProperty = {
        ...payload.property,
        templates: payload.property.templates ?? [],
      }
      setProperties((prev) => [createdProperty, ...prev])
      setNewDraft(defaultDraft)
      setIsCreateModalOpen(false)
      propertyNavigation.openRecord(createdProperty.id)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create property")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function deleteProperty(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/flooring/properties/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete property")
      }

      setProperties((prev) => prev.filter((property) => property.id !== id))
      setMessage("Property deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete property")
    } finally {
      setDeletingId(null)
    }
  }

  function renderPropertyRow(row: PropertyRow) {
    const cells: Record<string, ReactNode> = {
      property: <td key="property" className="px-3 py-2 font-medium text-blue-500">{row.name}</td>,
      street: <td key="street" className="px-3 py-2">{row.streetAddress || "-"}</td>,
      city: <td key="city" className="px-3 py-2">{row.city || "-"}</td>,
      state: <td key="state" className="px-3 py-2">{row.state || "-"}</td>,
      zip: <td key="zip" className="px-3 py-2">{row.zip || "-"}</td>,
      phone: <td key="phone" className="px-3 py-2">{row.phone || "-"}</td>,
      email: <td key="email" className="px-3 py-2">{row.email || "-"}</td>,
      fullAddress: <td key="fullAddress" className="px-3 py-2">{row.fullAddress || "-"}</td>,
      managementCompany: <td key="managementCompany" className="px-3 py-2">{row.managementCompany?.name || "No management company"}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void deleteProperty(row.id)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit property ${row.name}`} onClick={() => propertyNavigation.openRecord(row.id)}>
        {visiblePropertyColumns.map((column) => cells[column.key])}
      </ClickableTableRow>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<PropertyRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow
        key={`${group.depth}-${group.key}`}
        label={`${group.fieldLabel}: ${group.label}`}
        depth={group.depth}
        colSpan={visiblePropertyColumns.length}
      />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderPropertyRow(row))),
    ])
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Properties</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredProperties.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={serverTableControls.onSearchQueryChange}
              searchPlaceholder="Search property or company"
              isAscendingSort={isAscendingSort}
              onToggleSort={serverTableControls.onToggleSort}
            >
              <TableColumnSettings
                columns={orderedPropertyColumns}
                hiddenColumnKeys={hiddenPropertyColumnKeys}
                onToggleColumn={togglePropertyColumnVisibility}
                onMoveColumn={movePropertyColumn}
                onSetColumnOrder={setPropertyColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={serverTableControls.onToggleGroupByKey}
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
                Property
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {!isCreateModalOpen && message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {!isCreateModalOpen && error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1320px]">
          <TableHead>
            <tr>
              {visiblePropertyColumns.map((column) => (
                <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {isGroupingEnabled ? renderGroupedRows(groupedProperties) : sortedProperties.map((row) => renderPropertyRow(row))}

            {filteredProperties.length === 0 ? <TableEmptyRow message="No properties found." colSpan={visiblePropertyColumns.length} /> : null}
          </tbody>
        </TableShell>
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredProperties.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      </section>

      {isCreateModalOpen ? (
        <ModalShell title="New Property" onClose={() => !isSavingNew && setIsCreateModalOpen(false)}>
          <div className="space-y-6">
            <FormStatusNotices error={error} loadingMessage={isSavingNew ? "Creating property..." : ""} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Property Name">
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
              <FormField label="Management Company">
                <select value={newDraft.managementCompanyId} onChange={(event) => setNewDraftField("managementCompanyId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No management company</option>
                  {managementOptions.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Phone">
                <input value={newDraft.phone} onChange={(event) => setNewDraftField("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Email">
                <input value={newDraft.email} onChange={(event) => setNewDraftField("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Full Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {buildFullAddress(newDraft) || "Property address preview"}
                </div>
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void createProperty()} disabled={isSavingNew} className={FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME}>
                {isSavingNew ? "Creating..." : "Create Property"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
