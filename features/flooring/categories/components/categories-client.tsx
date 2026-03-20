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
import { validateCategoryForm } from "../validators"

type CategoryRow = {
  id: string
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
  serviceUnit: string
  productCount: number
  createdAt: string
}

type CategoryForm = {
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
}

type UnitOfMeasureOption = {
  id: string
  name: string
  createdAt: string
}

const emptyCategoryForm: CategoryForm = {
  name: "",
  sendUnitId: "",
  stockUnitId: "",
  coverageAvailableUnitId: "",
  itemCoverageUnitId: "",
  serviceUnitId: "",
}

function toCategoryForm(category: CategoryRow): CategoryForm {
  return {
    name: category.name,
    sendUnitId: category.sendUnitId,
    stockUnitId: category.stockUnitId,
    coverageAvailableUnitId: category.coverageAvailableUnitId,
    itemCoverageUnitId: category.itemCoverageUnitId,
    serviceUnitId: category.serviceUnitId,
  }
}

function UnitSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: UnitOfMeasureOption[]
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
      <option value="">None</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  )
}

export default function CategoriesClient({
  initialCategories,
  unitOfMeasureOptions,
}: {
  initialCategories: CategoryRow[]
  unitOfMeasureOptions: UnitOfMeasureOption[]
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [panelMessage, setPanelMessage] = useState("")
  const [panelError, setPanelError] = useState("")
  const {
    activeRecord: selectedCategory,
    draft: categoryForm,
    setDraft: setCategoryForm,
    openRecord: openCategoryRecord,
    closeRecord: closeCategoryRecord,
  } = useUrlRecordEditor({
    rows: categories,
    paramKey: "category",
    createDraft: toCategoryForm,
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
    rows: categories,
    tableKey: "categories-main",
    fields: [
      { key: "edit", label: "Edit", getValue: () => "", searchable: false, groupable: false },
      { key: "name", label: "Category", getValue: (row) => row.name, groupable: false },
      { key: "sendUnit", label: "Send Unit", getValue: (row) => row.sendUnit, groupable: true },
      { key: "stockUnit", label: "Stock Unit", getValue: (row) => row.stockUnit, groupable: true },
      { key: "coverageAvailableUnit", label: "Coverage Available Unit", getValue: (row) => row.coverageAvailableUnit, groupable: true },
      { key: "itemCoverageUnit", label: "Item Coverage Unit", getValue: (row) => row.itemCoverageUnit, groupable: true },
      { key: "serviceUnit", label: "Service Unit", getValue: (row) => row.serviceUnit, groupable: true },
      { key: "products", label: "Products", getValue: (row) => String(row.productCount), groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.name,
    defaultGroupKeys: ["sendUnit"],
  })

  function clearNotices() {
    setMessage("")
    setError("")
    setPanelMessage("")
    setPanelError("")
  }

  function openCreateCategory() {
    clearNotices()
    setCategoryForm(emptyCategoryForm)
    setIsCreateOpen(true)
  }

  function openEditCategory(category: CategoryRow) {
    clearNotices()
    openCategoryRecord(category)
  }

  async function persistCategory(input: CategoryForm, id?: string) {
    return id
      ? requestJson<{ category: CategoryRow }>(`/api/flooring/categories/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      : requestJson<{ category: CategoryRow }>("/api/flooring/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
  }

  async function createCategory() {
    clearNotices()
    const validationError = validateCategoryForm(categoryForm ?? emptyCategoryForm, categories)
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSavingNew(true)
    try {
      const payload = await persistCategory(categoryForm ?? emptyCategoryForm)
      setCategories((prev) => [...prev, payload.category].sort((a, b) => a.name.localeCompare(b.name)))
      setIsCreateOpen(false)
      setCategoryForm(emptyCategoryForm)
      setMessage("Category created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save category")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function savePanelCategory() {
    if (!selectedCategory || !categoryForm) return
    clearNotices()
    const validationError = validateCategoryForm(categoryForm, categories, selectedCategory.id)
    if (validationError) {
      setPanelError(validationError)
      return
    }
    setIsSavingId(selectedCategory.id)
    try {
      const payload = await persistCategory(categoryForm, selectedCategory.id)
      setCategories((prev) =>
        prev.map((category) => (category.id === selectedCategory.id ? payload.category : category)).sort((a, b) => a.name.localeCompare(b.name)),
      )
      openCategoryRecord(payload.category)
      setPanelMessage("Category updated")
    } catch (saveError) {
      setPanelError(saveError instanceof Error ? saveError.message : "Failed to save category")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteCategory(category: CategoryRow) {
    if (!window.confirm(`Delete ${category.name}?`)) return
    clearNotices()
    setDeletingId(category.id)
    try {
      await requestJson<{ success: boolean }>(`/api/flooring/categories/${category.id}`, { method: "DELETE" })
      setCategories((prev) => prev.filter((item) => item.id !== category.id))
      if (selectedCategory?.id === category.id) {
        closeCategoryRecord()
      }
      setMessage("Category deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete category")
    } finally {
      setDeletingId(null)
    }
  }

  function renderRow(category: CategoryRow) {
    const cells: Record<string, ReactNode> = {
      edit: (
        <td key="edit" className="px-3 py-2">
          <EditRowButton onClick={() => openEditCategory(category)} />
        </td>
      ),
      name: <td key="name" className="px-3 py-2 font-medium">{category.name}</td>,
      sendUnit: <td key="sendUnit" className="px-3 py-2">{category.sendUnit || "-"}</td>,
      stockUnit: <td key="stockUnit" className="px-3 py-2">{category.stockUnit || "-"}</td>,
      coverageAvailableUnit: <td key="coverageAvailableUnit" className="px-3 py-2">{category.coverageAvailableUnit || "-"}</td>,
      itemCoverageUnit: <td key="itemCoverageUnit" className="px-3 py-2">{category.itemCoverageUnit || "-"}</td>,
      serviceUnit: <td key="serviceUnit" className="px-3 py-2">{category.serviceUnit || "-"}</td>,
      products: <td key="products" className="px-3 py-2">{category.productCount}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void deleteCategory(category)} disabled={deletingId === category.id}>
            {deletingId === category.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return <tr key={category.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">{visibleColumns.map((column) => cells[column.key])}</tr>
  }

  function renderGroupedRows(groups: GroupedRowTree<CategoryRow>[]): ReactNode[] {
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
            <DashboardCardTitle>Categories</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search categories"
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
              <button type="button" onClick={openCreateCategory} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400">
                <Plus size={16} />
                Category
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1380px]">
          <TableHead>
            <tr>
              {visibleColumns.map((column) => (
                <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {isGroupingEnabled ? renderGroupedRows(groupedRowTree) : sortedRows.map((category) => renderRow(category))}
            {filteredRows.length === 0 ? <TableEmptyRow message="No flooring categories yet." colSpan={visibleColumns.length} /> : null}
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

      {isCreateOpen && categoryForm ? (
        <BasicRecordPanel
          title="New Category"
          onClose={() => !isSavingNew && setIsCreateOpen(false)}
          error={error}
          saveLabel="Create Category"
          savingLabel="Creating..."
          deleteLabel="Delete Category"
          deleteConfirmMessage="Delete this category?"
          onSave={() => void createCategory()}
          onDelete={() => {}}
          isSaving={isSavingNew}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField label="Category Name">
              <input value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), name: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: categoryForm.name.trim() === "" })}`} />
            </FormField>
            <FormField label="Send Unit">
              <UnitSelect value={categoryForm.sendUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), sendUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Stock Unit">
              <UnitSelect value={categoryForm.stockUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), stockUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Coverage Available Unit">
              <UnitSelect value={categoryForm.coverageAvailableUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), coverageAvailableUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Item Coverage Unit">
              <UnitSelect value={categoryForm.itemCoverageUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), itemCoverageUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Service Unit">
              <UnitSelect value={categoryForm.serviceUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), serviceUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
          </div>
        </BasicRecordPanel>
      ) : null}

      {selectedCategory && categoryForm ? (
        <BasicRecordPanel
          title={`Category ${selectedCategory.name}`}
          onClose={closeCategoryRecord}
          message={panelMessage}
          error={panelError}
          saveLabel="Save Category"
          savingLabel="Saving..."
          deleteLabel="Delete Category"
          deleteConfirmMessage={`Delete ${selectedCategory.name}?`}
          onSave={() => void savePanelCategory()}
          onDelete={() => void deleteCategory(selectedCategory)}
          isSaving={isSavingId === selectedCategory.id || deletingId === selectedCategory.id}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField label="Category Name">
              <input value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), name: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: categoryForm.name.trim() === "" })}`} />
            </FormField>
            <FormField label="Send Unit">
              <UnitSelect value={categoryForm.sendUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), sendUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Stock Unit">
              <UnitSelect value={categoryForm.stockUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), stockUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Coverage Available Unit">
              <UnitSelect value={categoryForm.coverageAvailableUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), coverageAvailableUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Item Coverage Unit">
              <UnitSelect value={categoryForm.itemCoverageUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), itemCoverageUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Service Unit">
              <UnitSelect value={categoryForm.serviceUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...(prev ?? emptyCategoryForm), serviceUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
          </div>
        </BasicRecordPanel>
      ) : null}
    </div>
  )
}
