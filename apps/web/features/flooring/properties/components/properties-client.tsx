"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { useCanonicalDetailNavigation } from "@/features/dashboard/shared/navigation/use-canonical-detail-navigation"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import { buildFullAddress, normalizeAddressState } from "@/features/flooring/shared/domain/address-helpers"
import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME, FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { ErrorNotice, FormStatusNotices, SuccessNotice } from "@/features/dashboard/shared/feedback/notices"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { DashboardListPageTable } from "@/features/dashboard/shared/list-page/dashboard-list-page-table"
import { DashboardListRowCell } from "@/features/dashboard/shared/list-page/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/features/dashboard/shared/list-page/render-dashboard-row-cells"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "@/features/dashboard/shared/record-view/forms/record-form"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/features/dashboard/shared/table/table-shell"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
import { requestJson } from "@/features/flooring/shared/transport/http"

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
  templateCount: number
  templatePreviewTags: string[]
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
  initialTablePreferences,
}: {
  initialProperties: PropertyRow[]
  managementOptions: ManagementCompanyOption[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
  initialTablePreferences?: TablePreferencePayload | null
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
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
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
    onSearchQueryChange,
    onToggleSort,
    onToggleGroupedColumn,
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
    sortFieldKey: "property",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    initialPreferences: initialTablePreferences,
    urlSyncMode: "router",
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
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

      const payload = await requestJson<{
        property: PropertyRow & {
          managementCompany: {
            id: string
            name: string
          } | null
          templates?: Array<{ id: string; templateTag: string }>
        }
      }>("/api/flooring/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDraft,
          managementCompanyId: newDraft.managementCompanyId || null,
        }),
      })

      const createdProperty = {
        ...payload.property,
        templateCount: payload.property.templates?.length ?? 0,
        templatePreviewTags: payload.property.templates?.map((template) => template.templateTag) ?? [],
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
      await requestJson<{ ok: boolean }>(`/api/flooring/properties/${id}`, { method: "DELETE" })

      setProperties((prev) => prev.filter((property) => property.id !== id))
      setMessage("Property deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete property")
    } finally {
      setDeletingId(null)
    }
  }

  function renderPropertyRow(row: PropertyRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      property: (columnIndex) => (
        <DashboardListRowCell key="property" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.name}
        </DashboardListRowCell>
      ),
      street: (columnIndex) => <DashboardListRowCell key="street" columnIndex={columnIndex}>{row.streetAddress || "-"}</DashboardListRowCell>,
      city: (columnIndex) => <DashboardListRowCell key="city" columnIndex={columnIndex}>{row.city || "-"}</DashboardListRowCell>,
      state: (columnIndex) => <DashboardListRowCell key="state" columnIndex={columnIndex}>{row.state || "-"}</DashboardListRowCell>,
      zip: (columnIndex) => <DashboardListRowCell key="zip" columnIndex={columnIndex}>{row.zip || "-"}</DashboardListRowCell>,
      phone: (columnIndex) => <DashboardListRowCell key="phone" columnIndex={columnIndex}>{row.phone || "-"}</DashboardListRowCell>,
      email: (columnIndex) => <DashboardListRowCell key="email" columnIndex={columnIndex}>{row.email || "-"}</DashboardListRowCell>,
      fullAddress: (columnIndex) => <DashboardListRowCell key="fullAddress" columnIndex={columnIndex}>{row.fullAddress || "-"}</DashboardListRowCell>,
      managementCompany: (columnIndex) => (
        <DashboardListRowCell key="managementCompany" columnIndex={columnIndex}>
          {row.managementCompany?.name || "No management company"}
        </DashboardListRowCell>
      ),
      delete: (columnIndex) => (
        <DashboardListRowCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => void deleteProperty(row.id)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit property ${row.name}`} onClick={() => propertyNavigation.openRecord(row.id)}>
        {renderDashboardRowCells(visiblePropertyColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <DashboardListPageScaffold
        title={<DashboardCardTitle>Properties</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            count={filteredProperties.length}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            searchPlaceholder="Search property or company"
            isAscendingSort={isAscendingSort}
            onToggleSort={onToggleSort}
            columnSettingsSlot={
              <TableColumnSettings
                columns={orderedPropertyColumns}
                hiddenColumnKeys={hiddenPropertyColumnKeys}
                onToggleColumn={togglePropertyColumnVisibility}
                onMoveColumn={movePropertyColumn}
                onSetColumnOrder={setPropertyColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={onToggleGroupedColumn}
              />
            }
            primaryAction={
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
            }
          />
        }
        notices={
          <>
            {!isCreateModalOpen && message ? <SuccessNotice>{message}</SuccessNotice> : null}
            {!isCreateModalOpen && error ? <ErrorNotice>{error}</ErrorNotice> : null}
          </>
        }
        table={
          <DashboardListPageTable minWidthClass="min-w-[1320px]" columns={visiblePropertyColumns}>
            {isGroupingEnabled
              ? renderGroupedTableRows({
                  groups: groupedProperties as GroupedRowTree<PropertyRow>[],
                  colSpan: visiblePropertyColumns.length,
                  renderRow: renderPropertyRow,
                })
              : sortedProperties.map((row) => renderPropertyRow(row))}

            {filteredProperties.length === 0 ? <TableEmptyRow message="No properties found." colSpan={visiblePropertyColumns.length} /> : null}
          </DashboardListPageTable>
        }
        pagination={
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
        }
      />

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
    </>
  )
}
