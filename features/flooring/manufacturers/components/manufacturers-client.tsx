"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { BasicRecordPanel } from "../../shared/basic-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, EditRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField } from "../../shared/record-form"
import { getSharedFormFieldClass } from "../../shared/form-field-styles"
import { DashboardCardTitle } from "../../shared/dashboard-card-title"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/use-table-controls"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { useUrlRecordEditor } from "../../shared/use-url-record-editor"
import { requestJson } from "../../shared/http"
import { validateManufacturerForm } from "../validators"

type ManufacturerRow = {
  id: string
  companyName: string
  agentName: string
  website: string
  phone: string
  email: string
  productsCount: number
  createdAt: string
  updatedAt: string
}

type ManufacturerForm = {
  companyName: string
  agentName: string
  website: string
  phone: string
  email: string
}

const emptyForm: ManufacturerForm = {
  companyName: "",
  agentName: "",
  website: "",
  phone: "",
  email: "",
}

function toForm(manufacturer: ManufacturerRow): ManufacturerForm {
  return {
    companyName: manufacturer.companyName,
    agentName: manufacturer.agentName,
    website: manufacturer.website,
    phone: manufacturer.phone,
    email: manufacturer.email,
  }
}

export default function ManufacturersClient({ initialManufacturers }: { initialManufacturers: ManufacturerRow[] }) {
  const [manufacturers, setManufacturers] = useState(initialManufacturers)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [panelMessage, setPanelMessage] = useState("")
  const [panelError, setPanelError] = useState("")
  const {
    activeRecord: selectedManufacturer,
    draft: manufacturerForm,
    setDraft: setManufacturerForm,
    openRecord: openManufacturerRecord,
    closeRecord: closeManufacturerRecord,
  } = useUrlRecordEditor({
    rows: manufacturers,
    paramKey: "manufacturer",
    createDraft: toForm,
  })

  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    groupFields,
    toggleGroupByKey,
    filteredRows,
    sortedRows,
    groupedRowTree,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns,
    visibleColumns,
    hiddenColumnKeys,
    toggleColumnVisibility,
    moveColumn,
    setColumnOrder,
  } = useConfiguredTableState({
    rows: manufacturers,
    tableKey: "manufacturers-main",
    fields: [
      { key: "edit", label: "Edit", getValue: () => "", searchable: false, groupable: false },
      { key: "companyName", label: "Company Name", getValue: (row) => row.companyName || "No company", groupable: true },
      { key: "agentName", label: "Agent Name", getValue: (row) => row.agentName || "No agent", groupable: false },
      { key: "website", label: "Website", getValue: (row) => row.website, groupable: false },
      { key: "phone", label: "Phone", getValue: (row) => row.phone, groupable: false },
      { key: "email", label: "Email", getValue: (row) => row.email, groupable: false },
      { key: "products", label: "Products", getValue: (row) => String(row.productsCount), groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.companyName || row.agentName,
    defaultGroupKeys: ["companyName"],
  })

  function clearNotices() {
    setMessage("")
    setError("")
    setPanelMessage("")
    setPanelError("")
  }

  function openCreate() {
    clearNotices()
    setManufacturerForm(emptyForm)
    setIsCreateOpen(true)
  }

  function openEdit(manufacturer: ManufacturerRow) {
    clearNotices()
    openManufacturerRecord(manufacturer)
  }

  async function persistManufacturer(input: ManufacturerForm, id?: string) {
    return id
      ? requestJson<{ manufacturer: ManufacturerRow }>(`/api/flooring/manufacturers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      : requestJson<{ manufacturer: ManufacturerRow }>("/api/flooring/manufacturers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
  }

  async function createManufacturer() {
    clearNotices()
    const validationError = validateManufacturerForm(manufacturerForm ?? emptyForm, manufacturers)
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSavingNew(true)
    try {
      const payload = await persistManufacturer(manufacturerForm ?? emptyForm)
      setManufacturers((prev) => [payload.manufacturer, ...prev].sort((a, b) => a.companyName.localeCompare(b.companyName)))
      setManufacturerForm(emptyForm)
      setIsCreateOpen(false)
      setMessage("Manufacturer created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save manufacturer")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function savePanelManufacturer() {
    if (!selectedManufacturer || !manufacturerForm) return
    clearNotices()
    const validationError = validateManufacturerForm(manufacturerForm, manufacturers, selectedManufacturer.id)
    if (validationError) {
      setPanelError(validationError)
      return
    }
    setIsSavingId(selectedManufacturer.id)
    try {
      const payload = await persistManufacturer(manufacturerForm, selectedManufacturer.id)
      setManufacturers((prev) =>
        prev
          .map((manufacturer) => (manufacturer.id === selectedManufacturer.id ? payload.manufacturer : manufacturer))
          .sort((a, b) => a.companyName.localeCompare(b.companyName)),
      )
      openManufacturerRecord(payload.manufacturer)
      setPanelMessage("Manufacturer updated")
    } catch (saveError) {
      setPanelError(saveError instanceof Error ? saveError.message : "Failed to save manufacturer")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteManufacturer(manufacturer: ManufacturerRow) {
    if (!window.confirm(`Delete ${manufacturer.companyName || manufacturer.agentName || "this manufacturer"}?`)) return
    clearNotices()
    setDeletingId(manufacturer.id)
    try {
      await requestJson<{ success: boolean }>(`/api/flooring/manufacturers/${manufacturer.id}`, { method: "DELETE" })
      setManufacturers((prev) => prev.filter((item) => item.id !== manufacturer.id))
      if (selectedManufacturer?.id === manufacturer.id) {
        closeManufacturerRecord()
      }
      setMessage("Manufacturer deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete manufacturer")
    } finally {
      setDeletingId(null)
    }
  }

  function renderRow(manufacturer: ManufacturerRow) {
    const cells: Record<string, ReactNode> = {
      edit: (
        <td key="edit" className="px-3 py-2">
          <EditRowButton onClick={() => openEdit(manufacturer)} />
        </td>
      ),
      companyName: <td key="companyName" className="px-3 py-2">{manufacturer.companyName || "-"}</td>,
      agentName: <td key="agentName" className="px-3 py-2 font-medium">{manufacturer.agentName || "-"}</td>,
      website: <td key="website" className="px-3 py-2">{manufacturer.website || "-"}</td>,
      phone: <td key="phone" className="px-3 py-2">{manufacturer.phone || "-"}</td>,
      email: <td key="email" className="px-3 py-2">{manufacturer.email || "-"}</td>,
      products: <td key="products" className="px-3 py-2">{manufacturer.productsCount}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void deleteManufacturer(manufacturer)} disabled={deletingId === manufacturer.id}>
            {deletingId === manufacturer.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return <tr key={manufacturer.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">{visibleColumns.map((column) => cells[column.key])}</tr>
  }

  function renderGroupedRows(groups: GroupedRowTree<ManufacturerRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${groupFields[group.depth]?.label ?? "Group"}: ${group.label}`} depth={group.depth} colSpan={visibleColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Manufacturers</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search manufacturers"
              isAscendingSort={isAscendingSort}
              onToggleSort={() => setIsAscendingSort((prev) => !prev)}
            >
              <TableColumnSettings
                columns={allColumns}
                hiddenColumnKeys={hiddenColumnKeys}
                onToggleColumn={toggleColumnVisibility}
                onMoveColumn={moveColumn}
                onSetColumnOrder={setColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={toggleGroupByKey}
              />
              <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400">
                <Plus size={16} />
                Manufacturer
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1320px]">
          <TableHead>
            <tr>
              {visibleColumns.map((column) => (
                <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {isGroupingEnabled ? renderGroupedRows(groupedRowTree) : sortedRows.map((manufacturer) => renderRow(manufacturer))}
            {filteredRows.length === 0 ? <TableEmptyRow message="No manufacturers yet." colSpan={visibleColumns.length} /> : null}
          </tbody>
        </TableShell>
        <TablePaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
        />
      </div>

      {isCreateOpen && manufacturerForm ? (
        <BasicRecordPanel
          title="New Manufacturer"
          onClose={() => !isSavingNew && setIsCreateOpen(false)}
          error={error}
          saveLabel="Create Manufacturer"
          savingLabel="Creating..."
          deleteLabel="Delete Manufacturer"
          deleteConfirmMessage="Delete this manufacturer?"
          onSave={() => void createManufacturer()}
          onDelete={() => {}}
          isSaving={isSavingNew}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Company Name">
              <input value={manufacturerForm.companyName} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), companyName: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: manufacturerForm.companyName.trim() === "" })}`} required />
            </FormField>
            <FormField label="Agent Name">
              <input value={manufacturerForm.agentName} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), agentName: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: manufacturerForm.agentName.trim() === "" })}`} />
            </FormField>
            <FormField label="Website">
              <input value={manufacturerForm.website} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), website: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Phone">
              <input value={manufacturerForm.phone} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), phone: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Email">
              <input value={manufacturerForm.email} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), email: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
          </div>
        </BasicRecordPanel>
      ) : null}

      {selectedManufacturer && manufacturerForm ? (
        <BasicRecordPanel
          title={`Manufacturer ${selectedManufacturer.companyName || selectedManufacturer.agentName}`}
          onClose={closeManufacturerRecord}
          message={panelMessage}
          error={panelError}
          saveLabel="Save Manufacturer"
          savingLabel="Saving..."
          deleteLabel="Delete Manufacturer"
          deleteConfirmMessage={`Delete ${selectedManufacturer.companyName || selectedManufacturer.agentName}?`}
          onSave={() => void savePanelManufacturer()}
          onDelete={() => void deleteManufacturer(selectedManufacturer)}
          isSaving={isSavingId === selectedManufacturer.id || deletingId === selectedManufacturer.id}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Company Name">
              <input value={manufacturerForm.companyName} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), companyName: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: manufacturerForm.companyName.trim() === "" })}`} required />
            </FormField>
            <FormField label="Agent Name">
              <input value={manufacturerForm.agentName} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), agentName: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: manufacturerForm.agentName.trim() === "" })}`} />
            </FormField>
            <FormField label="Website">
              <input value={manufacturerForm.website} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), website: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Phone">
              <input value={manufacturerForm.phone} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), phone: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Email">
              <input value={manufacturerForm.email} onChange={(event) => setManufacturerForm((prev) => ({ ...(prev ?? emptyForm), email: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
          </div>
        </BasicRecordPanel>
      ) : null}
    </div>
  )
}
