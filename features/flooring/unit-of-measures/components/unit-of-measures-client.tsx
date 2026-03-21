"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { BasicRecordPanel } from "../../shared/basic-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, EditRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField } from "../../shared/record-form"
import { getSharedFormFieldClass } from "../../shared/form-field-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "../../shared/dashboard-card-title"
import { formatStableDateTime } from "../../shared/date-format"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/use-table-controls"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { useUrlRecordEditor } from "../../shared/use-url-record-editor"
import { requestJson } from "../../shared/http"

type UnitOfMeasureRow = {
  id: string
  name: string
  createdAt: string
}

type UnitOfMeasureForm = {
  name: string
}

const emptyForm: UnitOfMeasureForm = {
  name: "",
}

function validateUnitOfMeasureForm(input: UnitOfMeasureForm) {
  return input.name.trim() ? "" : "Unit of measure is required"
}

function toForm(unit: UnitOfMeasureRow): UnitOfMeasureForm {
  return { name: unit.name }
}

export default function UnitOfMeasuresClient({
  canManage,
  initialUnitOfMeasures,
}: {
  canManage: boolean
  initialUnitOfMeasures: UnitOfMeasureRow[]
}) {
  const [unitOfMeasures, setUnitOfMeasures] = useState(initialUnitOfMeasures)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [panelMessage, setPanelMessage] = useState("")
  const [panelError, setPanelError] = useState("")
  const {
    activeRecord: selectedUnit,
    draft: unitForm,
    setDraft: setUnitForm,
    openRecord: openUnitRecord,
    closeRecord: closeUnitRecord,
  } = useUrlRecordEditor({
    rows: unitOfMeasures,
    paramKey: "unitOfMeasure",
    createDraft: toForm,
  })

  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    groupByKeys,
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
    rows: unitOfMeasures,
    tableKey: "unit-of-measures-main",
    fields: [
      ...(canManage ? [{ key: "edit", label: "Edit", getValue: () => "", searchable: false, groupable: false } as const] : []),
      { key: "name", label: "Unit Of Measure", getValue: (row) => row.name, groupable: false },
      { key: "createdAt", label: "Created", getValue: (row) => row.createdAt, groupable: false },
      ...(canManage ? [{ key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false } as const] : []),
    ],
    sortField: (row) => row.name,
  })

  function clearNotices() {
    setMessage("")
    setError("")
    setPanelMessage("")
    setPanelError("")
  }

  function openCreate() {
    clearNotices()
    setUnitForm(emptyForm)
    setIsCreateOpen(true)
  }

  function openEdit(unit: UnitOfMeasureRow) {
    clearNotices()
    openUnitRecord(unit)
  }

  async function persistUnitOfMeasure(input: UnitOfMeasureForm, id?: string) {
    return id
      ? requestJson<{ unitOfMeasure: UnitOfMeasureRow }>(`/api/builder/unit-of-measures/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      : requestJson<{ unitOfMeasure: UnitOfMeasureRow }>("/api/builder/unit-of-measures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
  }

  async function createUnitOfMeasure() {
    clearNotices()
    const validationError = validateUnitOfMeasureForm(unitForm ?? emptyForm)
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSavingNew(true)
    try {
      const payload = await persistUnitOfMeasure(unitForm ?? emptyForm)
      setUnitOfMeasures((prev) => [...prev, payload.unitOfMeasure].sort((a, b) => a.name.localeCompare(b.name)))
      setUnitForm(emptyForm)
      setIsCreateOpen(false)
      setMessage("Unit of measure created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save unit of measure")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function savePanelUnit() {
    if (!selectedUnit || !unitForm) return
    clearNotices()
    const validationError = validateUnitOfMeasureForm(unitForm)
    if (validationError) {
      setPanelError(validationError)
      return
    }
    setIsSavingId(selectedUnit.id)
    try {
      const payload = await persistUnitOfMeasure(unitForm, selectedUnit.id)
      setUnitOfMeasures((prev) =>
        prev
          .map((unit) => (unit.id === selectedUnit.id ? payload.unitOfMeasure : unit))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      openUnitRecord(payload.unitOfMeasure)
      setPanelMessage("Unit of measure updated")
    } catch (saveError) {
      setPanelError(saveError instanceof Error ? saveError.message : "Failed to save unit of measure")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteUnitOfMeasure(unit: UnitOfMeasureRow) {
    if (!window.confirm(`Delete ${unit.name}?`)) return
    clearNotices()
    setDeletingId(unit.id)
    try {
      await requestJson<{ success: boolean }>(`/api/builder/unit-of-measures/${unit.id}`, { method: "DELETE" })
      setUnitOfMeasures((prev) => prev.filter((item) => item.id !== unit.id))
      if (selectedUnit?.id === unit.id) {
        closeUnitRecord()
      }
      setMessage("Unit of measure deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete unit of measure")
    } finally {
      setDeletingId(null)
    }
  }

  function renderRow(unit: UnitOfMeasureRow) {
    const cells: Record<string, ReactNode> = {
      ...(canManage
        ? {
            edit: (
              <td key="edit" className="px-3 py-2">
                <EditRowButton onClick={() => openEdit(unit)} />
              </td>
            ),
          }
        : {}),
      name: <td key="name" className="px-3 py-2 font-medium">{unit.name}</td>,
      createdAt: <td key="createdAt" className="px-3 py-2">{formatStableDateTime(unit.createdAt)}</td>,
      ...(canManage
        ? {
            delete: (
              <td key="delete" className="px-3 py-2">
                <DeleteRowButton onClick={() => void deleteUnitOfMeasure(unit)} disabled={deletingId === unit.id}>
                  {deletingId === unit.id ? "Deleting..." : "Delete"}
                </DeleteRowButton>
              </td>
            ),
          }
        : {}),
    }

    return <tr key={unit.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">{visibleColumns.map((column) => cells[column.key])}</tr>
  }

  function renderGroupedRows(groups: GroupedRowTree<UnitOfMeasureRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${group.fieldLabel}: ${group.label}`} depth={group.depth} colSpan={visibleColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Unit Of Measures</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search unit of measures"
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
              {canManage ? (
                <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400">
                  <Plus size={16} />
                  Unit Of Measure
                </button>
              ) : null}
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[920px]">
          <TableHead>
            <tr>
              {visibleColumns.map((column) => (
                <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {isGroupingEnabled ? renderGroupedRows(groupedRowTree) : sortedRows.map((unit) => renderRow(unit))}
            {filteredRows.length === 0 ? <TableEmptyRow message="No units of measure yet." colSpan={visibleColumns.length} /> : null}
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

      {canManage && isCreateOpen && unitForm ? (
        <BasicRecordPanel
          title="New Unit Of Measure"
          onClose={() => !isSavingNew && setIsCreateOpen(false)}
          error={error}
          saveLabel="Create Unit Of Measure"
          savingLabel="Creating..."
          deleteLabel="Delete Unit Of Measure"
          deleteConfirmMessage="Delete this unit of measure?"
          onSave={() => void createUnitOfMeasure()}
          onDelete={() => {}}
          isSaving={isSavingNew}
          sizeClass="max-w-3xl"
        >
          <FormField label="Unit Of Measure">
            <input
              value={unitForm.name}
              onChange={(event) => setUnitForm((prev) => ({ ...(prev ?? emptyForm), name: event.target.value }))}
              className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: unitForm.name.trim() === "" })}`}
              required
            />
          </FormField>
        </BasicRecordPanel>
      ) : null}

      {canManage && selectedUnit && unitForm ? (
        <BasicRecordPanel
          title={`Unit Of Measure ${selectedUnit.name}`}
          onClose={closeUnitRecord}
          message={panelMessage}
          error={panelError}
          saveLabel="Save Unit Of Measure"
          savingLabel="Saving..."
          deleteLabel="Delete Unit Of Measure"
          deleteConfirmMessage={`Delete ${selectedUnit.name}?`}
          onSave={() => void savePanelUnit()}
          onDelete={() => void deleteUnitOfMeasure(selectedUnit)}
          isSaving={isSavingId === selectedUnit.id || deletingId === selectedUnit.id}
          sizeClass="max-w-3xl"
        >
          <FormField label="Unit Of Measure">
            <input
              value={unitForm.name}
              onChange={(event) => setUnitForm((prev) => ({ ...(prev ?? emptyForm), name: event.target.value }))}
              className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: unitForm.name.trim() === "" })}`}
              required
            />
          </FormField>
        </BasicRecordPanel>
      ) : null}
    </div>
  )
}
