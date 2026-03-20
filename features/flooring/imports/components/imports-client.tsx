"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { CollapsibleTableSection, InlineAddRowButton } from "../../shared/collapsible-table-section"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { RecordOptionsMenu } from "../../shared/record-options-menu"
import { DeleteRowButton, EditRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { getSharedFormFieldClass } from "../../shared/form-field-styles"
import { RecordMetricSummary } from "../../shared/record-metric-summary"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { ModalTableHead, ModalTableShell, TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { useTableColumns } from "../../shared/use-table-columns"
import { useServerTableQueryControls } from "../../shared/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree, useTableControls } from "../../shared/use-table-controls"
import {
  IMPORT_STATUS_OPTIONS,
  IMPORT_TRANSPORT_TYPE_OPTIONS,
  formatImportStatus,
  formatTransportType,
  getImportStatusFieldClass,
  getTransportTypeFieldClass,
} from "../contracts"
import { calculateImportSummary } from "../summary"

type ImportRow = {
  id: string
  importNumber: number
  orderNumber: string
  tag: string
  transportType: string
  status: string
  notes: string
  warehouseId: string
  warehouseName: string
  itemsCount: number
  createdAt: string
  updatedAt: string
  inventories: Array<{
    id: string
    productId: string
    productName: string
    stockUnit: string
    itemNumber: string
    dyeLot: string
    stockCount: string
    cost: string
    freight: string
    notes: string
    locationId: string
    locationCode: string
    warehouseId: string
    warehouseName: string
    sectionName: string
  }>
}

type ProductOption = {
  id: string
  label: string
  stockUnit: string
}

type WarehouseOption = {
  id: string
  name: string
}

type LocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  label: string
}

type ImportItemDraft = {
  clientId: string
  productId: string
  itemNumber: string
  stockCount: string
  locationId: string
  dyeLot: string
  cost: string
  freight: string
  notes: string
}

type ImportDraft = {
  orderNumber: string
  tag: string
  transportType: string
  status: string
  notes: string
  warehouseId: string
  items: ImportItemDraft[]
}

type CreateImportValidation = {
  warehouseId: boolean
  items: boolean
  itemFields: Record<string, { productId: boolean; stockCount: boolean }>
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

function createEmptyItem(): ImportItemDraft {
  return {
    clientId: crypto.randomUUID(),
    productId: "",
    itemNumber: "",
    stockCount: "",
    locationId: "",
    dyeLot: "",
    cost: "",
    freight: "",
    notes: "",
  }
}

function applyDefaultLocationToItem(item: ImportItemDraft, warehouseId: string, locationOptions: LocationOption[]) {
  const warehouseLocations = warehouseId ? locationOptions.filter((location) => location.warehouseId === warehouseId) : []
  const currentLocation = warehouseLocations.find((location) => location.id === item.locationId)

  if (currentLocation) {
    return item
  }

  return {
    ...item,
    locationId: "",
  }
}

function createEmptyDraft(): ImportDraft {
  return {
    orderNumber: "",
    tag: "",
    transportType: "PURCHASE_ORDER",
    status: "PENDING",
    notes: "",
    warehouseId: "",
    items: [],
  }
}

function autoResizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "0px"
  element.style.height = `${Math.max(element.scrollHeight, 42)}px`
}

function validateCreateImportDraft(draft: ImportDraft): CreateImportValidation {
  const itemFields: CreateImportValidation["itemFields"] = {}

  for (const item of draft.items) {
    itemFields[item.clientId] = {
      productId: item.productId.trim() === "",
      stockCount: item.stockCount.trim() === "",
    }
  }

  return {
    warehouseId: draft.warehouseId.trim() === "",
    items: draft.items.length === 0,
    itemFields,
  }
}

function hasCreateImportValidationErrors(validation: CreateImportValidation) {
  if (validation.warehouseId) return true
  if (validation.items) return true

  return Object.values(validation.itemFields).some((fields) => fields.productId || fields.stockCount)
}

function StatusPill({
  label,
  toneClassName,
}: {
  label: string
  toneClassName: string
}) {
  return (
    <span className={`inline-flex min-w-[110px] justify-center rounded border px-2 py-1 text-center text-sm ${toneClassName}`}>
      {label}
    </span>
  )
}

export default function ImportsClient({
  initialImports,
  productOptions,
  warehouseOptions,
  locationOptions,
  tableState,
  pagination,
}: {
  initialImports: ImportRow[]
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const [imports, setImports] = useState(initialImports)
  const [draft, setDraft] = useState<ImportDraft>(() => createEmptyDraft())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeImportId, setActiveImportId] = useState<string | null>(null)
  const [activeImportDraft, setActiveImportDraft] = useState<ImportDraft>(() => createEmptyDraft())
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")
  const [createModalError, setCreateModalError] = useState("")
  const [createValidation, setCreateValidation] = useState<CreateImportValidation>(() => validateCreateImportDraft(createEmptyDraft()))
  const [activeImportError, setActiveImportError] = useState("")

  const productLookup = useMemo(() => new Map(productOptions.map((product) => [product.id, product])), [productOptions])
  const activeImport = useMemo(() => imports.find((row) => row.id === activeImportId) ?? null, [imports, activeImportId])
  const activeImportSummary = useMemo(
    () =>
      calculateImportSummary(
        activeImportDraft.items.map((item) => ({
          stockCount: item.stockCount,
          cost: item.cost,
          freight: item.freight,
        })),
      ),
    [activeImportDraft.items],
  )
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
    filteredRows: filteredImports,
    sortedRows: sortedImports,
    groupedRowTree,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
  } = useTableControls({
    rows: imports,
    searchFields: [
      { key: "importNumber", getValue: (row) => `IMP-${String(row.importNumber).padStart(4, "0")}` },
      { key: "tag", getValue: (row) => row.tag },
      { key: "warehouse", getValue: (row) => row.warehouseName },
      { key: "status", getValue: (row) => row.status },
    ],
    sortField: (row) => String(row.importNumber),
    groupFields: [
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName },
      { key: "status", label: "Status", getValue: (row) => formatImportStatus(row.status) },
      { key: "transport", label: "Transport", getValue: (row) => formatTransportType(row.transportType) },
    ],
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })
  const importGroupOptions = groupFields.map((field) => ({ key: field.key, label: field.label }))
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions: importGroupOptions,
  })
  const importColumns = useMemo(
    () => [
      { key: "edit", label: "Edit" },
      { key: "importNumber", label: "Import #" },
      { key: "tag", label: "Tag" },
      { key: "transport", label: "Transport" },
      { key: "status", label: "Status" },
      { key: "warehouse", label: "Warehouse" },
      { key: "created", label: "Created" },
      { key: "items", label: "Items" },
      { key: "delete", label: "Delete" },
    ],
    [],
  )
  const {
    allColumns: orderedImportColumns,
    visibleColumns: visibleImportColumns,
    hiddenColumnKeys: hiddenImportColumnKeys,
    toggleColumnVisibility: toggleImportColumnVisibility,
    moveColumn: moveImportColumn,
    setColumnOrder: setImportColumnOrder,
  } = useTableColumns({
    tableKey: "imports-main",
    columns: importColumns,
  })

  function openCreateModal() {
    setMessage("")
    setPageError("")
    setCreateModalError("")
    const emptyDraft = createEmptyDraft()
    setCreateValidation(validateCreateImportDraft(emptyDraft))
    setDraft(emptyDraft)
    setIsModalOpen(true)
  }

  function closeCreateModal() {
    if (isSaving) return
    setIsModalOpen(false)
  }

  function openImport(rowId: string) {
    const row = imports.find((item) => item.id === rowId)
    if (!row) return
    setMessage("")
    setPageError("")
    setActiveImportError("")
      setActiveImportDraft({
        orderNumber: row.orderNumber,
        tag: row.tag,
        transportType: row.transportType,
      status: row.status,
      notes: row.notes,
      warehouseId: row.warehouseId,
        items: row.inventories.map((item) => ({
          clientId: crypto.randomUUID(),
          productId: item.productId,
        itemNumber: item.itemNumber,
        stockCount: item.stockCount,
        locationId: item.locationId,
        dyeLot: item.dyeLot,
        cost: item.cost,
        freight: item.freight,
        notes: item.notes,
      })),
    })
    setActiveImportId(rowId)
  }

  function closeImport() {
    setActiveImportId(null)
  }

  async function saveActiveImport() {
    if (!activeImport) return
    setMessage("")
    setPageError("")
    setActiveImportError("")
    setIsSaving(true)

    try {
      const response = await fetch(`/api/flooring/imports/${activeImport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeImportDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as { import?: ImportRow; error?: string }
      if (!response.ok || !payload.import) {
        throw new Error(payload.error ?? "Failed to save import")
      }

      setImports((prev) => prev.map((row) => (row.id === activeImport.id ? payload.import! : row)))
      setActiveImportDraft({
        orderNumber: payload.import.orderNumber,
        tag: payload.import.tag,
        transportType: payload.import.transportType,
        status: payload.import.status,
        notes: payload.import.notes,
        warehouseId: payload.import.warehouseId,
        items: payload.import.inventories.map((item) => ({
          clientId: crypto.randomUUID(),
          productId: item.productId,
          itemNumber: item.itemNumber,
          stockCount: item.stockCount,
          locationId: item.locationId,
          dyeLot: item.dyeLot,
          cost: item.cost,
          freight: item.freight,
          notes: item.notes,
        })),
      })
      setMessage("Import saved")
    } catch (saveError) {
      setActiveImportError(saveError instanceof Error ? saveError.message : "Failed to save import")
    } finally {
      setIsSaving(false)
    }
  }

  function setDraftField(field: keyof Omit<ImportDraft, "items">, value: string) {
    setDraft((prev) => {
      const next =
        field === "warehouseId"
          ? {
              ...prev,
              warehouseId: value,
              items: prev.items.map((item) => applyDefaultLocationToItem(item, value, locationOptions)),
            }
          : { ...prev, [field]: value }
      setCreateValidation(validateCreateImportDraft(next))
      return next
    })
  }

  function setItemField(index: number, field: keyof ImportItemDraft, value: string) {
    setDraft((prev) => {
      const next = {
        ...prev,
        items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
      }
      setCreateValidation(validateCreateImportDraft(next))
      return next
    })
  }

  function addItemRow() {
    setDraft((prev) => {
      const nextItem = applyDefaultLocationToItem(createEmptyItem(), prev.warehouseId, locationOptions)
      const next = { ...prev, items: [...prev.items, nextItem] }
      setCreateValidation(validateCreateImportDraft(next))
      return next
    })
  }

  function removeItemRow(index: number) {
    setDraft((prev) => {
      const next = {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      }
      setCreateValidation(validateCreateImportDraft(next))
      return next
    })
  }

  function setActiveImportItemField(index: number, field: keyof ImportItemDraft, value: string) {
    setActiveImportDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  function addActiveImportItemRow() {
    setActiveImportDraft((prev) => ({
      ...prev,
      items: [...prev.items, applyDefaultLocationToItem(createEmptyItem(), prev.warehouseId, locationOptions)],
    }))
  }

  function removeActiveImportItemRow(index: number) {
    setActiveImportDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function createImport() {
    setMessage("")
    setPageError("")
    setCreateModalError("")
    const nextValidation = validateCreateImportDraft(draft)
    setCreateValidation(nextValidation)
    if (hasCreateImportValidationErrors(nextValidation)) {
      setCreateModalError(nextValidation.items ? "Add at least one inventory row before creating the import" : "Fill the highlighted required fields before creating the import")
      return
    }
    setIsSaving(true)

    try {
      const response = await fetch("/api/flooring/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        import?: ImportRow
        error?: string
      }

      if (!response.ok || !payload.import) {
        throw new Error(payload.error ?? "Failed to create import")
      }

      setImports((prev) => [payload.import!, ...prev])
      const emptyDraft = createEmptyDraft()
      setDraft(emptyDraft)
      setCreateValidation(validateCreateImportDraft(emptyDraft))
      setIsModalOpen(false)
      setMessage("Import created")
    } catch (createError) {
      setCreateModalError(createError instanceof Error ? createError.message : "Failed to create import")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteImport(id: string) {
    setMessage("")
    setPageError("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/flooring/imports/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete import")
      }

      setImports((prev) => prev.filter((row) => row.id !== id))
      setMessage("Import deleted")
    } catch (deleteError) {
      setPageError(deleteError instanceof Error ? deleteError.message : "Failed to delete import")
    } finally {
      setDeletingId(null)
    }
  }

  function renderImportRow(row: ImportRow) {
    const cells: Record<string, ReactNode> = {
      edit: (
        <td key="edit" className="px-3 py-2">
          <EditRowButton onClick={() => openImport(row.id)} />
        </td>
      ),
      importNumber: <td key="importNumber" className="px-3 py-2 font-medium text-blue-500">IMP-{String(row.importNumber).padStart(4, "0")}</td>,
      tag: <td key="tag" className="px-3 py-2">{row.tag || "-"}</td>,
      transport: (
        <td key="transport" className="px-3 py-2">
          <StatusPill label={formatTransportType(row.transportType)} toneClassName={getTransportTypeFieldClass(row.transportType)} />
        </td>
      ),
      status: (
        <td key="status" className="px-3 py-2">
          <StatusPill label={formatImportStatus(row.status)} toneClassName={getImportStatusFieldClass(row.status)} />
        </td>
      ),
      warehouse: <td key="warehouse" className="px-3 py-2">{row.warehouseName || "-"}</td>,
      created: <td key="created" className="px-3 py-2">{new Date(row.createdAt).toLocaleDateString()}</td>,
      items: <td key="items" className="px-3 py-2">{row.itemsCount}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void deleteImport(row.id)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <tr key={row.id} className="border-t border-[var(--panel-border)]">
        {visibleImportColumns.map((column) => cells[column.key])}
      </tr>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<ImportRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${groupFields[group.depth]?.label ?? "Group"}: ${group.label}`} depth={group.depth} colSpan={visibleImportColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderImportRow(row))),
    ])
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Imports</h1>
          </div>
          <TableActionsSummary count={filteredImports.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={serverTableControls.onSearchQueryChange}
              searchPlaceholder="Search import # or tag"
              isAscendingSort={isAscendingSort}
              onToggleSort={serverTableControls.onToggleSort}
              ascendingSortLabel="1-9"
              descendingSortLabel="9-1"
              isGroupingEnabled={isGroupingEnabled}
              onToggleGrouping={serverTableControls.onToggleGrouping}
              groupOptions={importGroupOptions}
              groupByKeys={groupByKeys}
              onGroupByKeyAtIndexChange={serverTableControls.onGroupByKeyAtIndexChange}
              onAddGroupBy={serverTableControls.onAddGroupBy}
              onRemoveGroupBy={serverTableControls.onRemoveGroupBy}
              maxGroupFields={MAX_GROUP_FIELDS}
            >
              <TableColumnSettings
                columns={orderedImportColumns}
                hiddenColumnKeys={hiddenImportColumnKeys}
                onToggleColumn={toggleImportColumnVisibility}
                onMoveColumn={moveImportColumn}
                onSetColumnOrder={setImportColumnOrder}
              />
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
              >
                <Plus size={16} />
                Import
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {pageError ? <ErrorNotice className="mt-3">{pageError}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[980px]">
          <TableHead>
              <tr>
                {visibleImportColumns.map((column) => (
                  <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                ))}
              </tr>
          </TableHead>
            <tbody>
              {isGroupingEnabled ? renderGroupedRows(groupedRowTree) : sortedImports.map((row) => renderImportRow(row))}
              {filteredImports.length === 0 ? <TableEmptyRow message="No imports logged yet." colSpan={visibleImportColumns.length} /> : null}
            </tbody>
        </TableShell>
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredImports.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      </section>

      {isModalOpen ? (
        <ModalShell title="New Import" onClose={closeCreateModal}>
          <div className="space-y-6">
            {createModalError ? <ErrorNotice>{createModalError}</ErrorNotice> : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Import Warehouse">
                <select
                  value={draft.warehouseId}
                  onChange={(event) => setDraftField("warehouseId", event.target.value)}
                  className={`rounded-lg border px-3 py-2 ${getSharedFormFieldClass({
                    isRequired: true,
                    isEmpty: createValidation.warehouseId,
                  })}`}
                >
                  <option value="">Select Warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Order Number">
                <input
                  value={draft.orderNumber}
                  onChange={(event) => setDraftField("orderNumber", event.target.value)}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
              <FormField label="Transport Type">
                <select
                  value={draft.transportType}
                  onChange={(event) => setDraftField("transportType", event.target.value)}
                  className={`rounded-lg border px-3 py-2 ${getTransportTypeFieldClass(draft.transportType)}`}
                >
                  {IMPORT_TRANSPORT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Created Time">
                <input value="Created on save" readOnly className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75" />
              </FormField>
              <FormField label="Tag">
                <input
                  value={draft.tag}
                  onChange={(event) => setDraftField("tag", event.target.value)}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
              <FormField label="Notes">
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraftField("notes", event.target.value)}
                  onInput={(event) => autoResizeTextarea(event.currentTarget)}
                  rows={1}
                  className="min-h-[42px] rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 resize-y overflow-hidden"
                />
              </FormField>
              <FormField label="Import Status">
                <select
                  value={draft.status}
                  onChange={(event) => setDraftField("status", event.target.value)}
                  className={`rounded-lg border px-3 py-2 ${getImportStatusFieldClass(draft.status)}`}
                >
                  {IMPORT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <CollapsibleTableSection
              title="Inventory Table"
              defaultOpen
            >
              <p className="text-sm text-[var(--foreground)]/70">Pending inventory created here will stay out of live inventory until the import is final.</p>
              <ModalTableShell minWidthClass="min-w-[1380px]">
                <ModalTableHead>
                  <tr>
                    <TableHeaderCell>Product</TableHeaderCell>
                    <TableHeaderCell>Item #</TableHeaderCell>
                    <TableHeaderCell>Starting Stock</TableHeaderCell>
                    <TableHeaderCell>Location</TableHeaderCell>
                    <TableHeaderCell>Dye Lot</TableHeaderCell>
                    <TableHeaderCell>Cost $</TableHeaderCell>
                    <TableHeaderCell>Freight $</TableHeaderCell>
                    <TableHeaderCell>Import Warehouse</TableHeaderCell>
                    <TableHeaderCell>Import Status</TableHeaderCell>
                    <TableHeaderCell>Notes</TableHeaderCell>
                    <TableHeaderCell>Remove</TableHeaderCell>
                  </tr>
                </ModalTableHead>
                  <tbody>
                    {draft.items.map((item, index) => {
                      const filteredLocations = draft.warehouseId
                        ? locationOptions.filter((location) => location.warehouseId === draft.warehouseId)
                        : locationOptions
                      const selectedProduct = productLookup.get(item.productId)
                      const itemValidation = createValidation.itemFields[item.clientId] ?? {
                        productId: false,
                        stockCount: false,
                      }

                      return (
                        <tr key={item.clientId} className="border-t border-[var(--panel-border)]">
                          <td className="px-3 py-2">
                            <select
                              value={item.productId}
                              onChange={(event) => setItemField(index, "productId", event.target.value)}
                              className={`w-56 rounded border px-2 py-1 ${getSharedFormFieldClass({
                                isRequired: true,
                                isEmpty: itemValidation.productId,
                              })}`}
                            >
                              <option value="">Select product</option>
                              {productOptions.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                              <input
                                value={item.itemNumber}
                                onChange={(event) => setItemField(index, "itemNumber", event.target.value)}
                                className={`w-24 rounded border px-2 py-1 ${getSharedFormFieldClass({
                                  isRequired: false,
                                  isEmpty: item.itemNumber.trim() === "",
                                })}`}
                              />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <input
                                value={item.stockCount}
                                onChange={(event) => setItemField(index, "stockCount", event.target.value)}
                                className={`w-24 rounded border px-2 py-1 ${getSharedFormFieldClass({
                                  isRequired: true,
                                  isEmpty: itemValidation.stockCount,
                                })}`}
                              />
                              <span className="text-xs text-[var(--foreground)]/60">{selectedProduct?.stockUnit || "unit"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.locationId}
                              onChange={(event) => setItemField(index, "locationId", event.target.value)}
                              className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            >
                              <option value="">Select location</option>
                              {filteredLocations.map((location) => (
                                <option key={location.id} value={location.id}>
                                  {location.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.dyeLot}
                              onChange={(event) => setItemField(index, "dyeLot", event.target.value)}
                              className={`w-24 rounded border px-2 py-1 ${getSharedFormFieldClass({
                                isRequired: false,
                                isEmpty: item.dyeLot.trim() === "",
                              })}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.cost}
                              onChange={(event) => setItemField(index, "cost", event.target.value)}
                              className={`w-24 rounded border px-2 py-1 ${getSharedFormFieldClass({
                                isRequired: false,
                                isEmpty: item.cost.trim() === "",
                              })}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.freight}
                              onChange={(event) => setItemField(index, "freight", event.target.value)}
                              className={`w-24 rounded border px-2 py-1 ${getSharedFormFieldClass({
                                isRequired: false,
                                isEmpty: item.freight.trim() === "",
                              })}`}
                            />
                          </td>
                          <td className="px-3 py-2">{warehouseOptions.find((warehouse) => warehouse.id === draft.warehouseId)?.name || "-"}</td>
                          <td className="px-3 py-2">
                            <StatusPill label={formatImportStatus(draft.status)} toneClassName={getImportStatusFieldClass(draft.status)} />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.notes}
                              onChange={(event) => setItemField(index, "notes", event.target.value)}
                              className={`w-52 rounded border px-2 py-1 ${getSharedFormFieldClass({
                                isRequired: false,
                                isEmpty: item.notes.trim() === "",
                              })}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <DeleteRowButton onClick={() => removeItemRow(index)}>Remove</DeleteRowButton>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t border-[var(--panel-border)]">
                      <td colSpan={11} className="px-3 py-3">
                        <InlineAddRowButton label="Add Inventory Item" onClick={addItemRow} />
                      </td>
                    </tr>
                  </tbody>
              </ModalTableShell>
            </CollapsibleTableSection>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isSaving}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createImport()}
                disabled={isSaving}
                className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                {isSaving ? "Creating..." : "Create Import"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeImport ? (
        <ModalShell
          title={`Import IMP-${String(activeImport.importNumber).padStart(4, "0")}`}
          onClose={closeImport}
          sizeClass="max-w-6xl"
          headerMeta={
            <RecordMetricSummary
              variant="header"
              metrics={[
                { label: "Total Cost", value: activeImportSummary.totalCostLabel },
                { label: "Material Items", value: activeImportSummary.materialItemsCount },
              ]}
            />
          }
          headerActions={
            <RecordOptionsMenu
              items={[
                {
                  label: "Go to Inventory",
                  onSelect: () => {
                    window.location.assign("/dashboard/flooring/inventory")
                  },
                },
              ]}
            />
          }
        >
          <div className="space-y-6">
            {message === "Import saved" ? (
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                Import saved
              </p>
            ) : null}
            {activeImportError ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{activeImportError}</p> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Order Number">
                <input
                  value={activeImportDraft.orderNumber}
                  onChange={(event) => setActiveImportDraft((prev) => ({ ...prev, orderNumber: event.target.value }))}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
              <FormField label="Tag">
                <input
                  value={activeImportDraft.tag}
                  onChange={(event) => setActiveImportDraft((prev) => ({ ...prev, tag: event.target.value }))}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
              <FormField label="Transport Type">
                <select
                  value={activeImportDraft.transportType}
                  onChange={(event) => setActiveImportDraft((prev) => ({ ...prev, transportType: event.target.value }))}
                  className={`rounded-lg border px-3 py-2 ${getTransportTypeFieldClass(activeImportDraft.transportType)}`}
                >
                  {IMPORT_TRANSPORT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Import Status">
                <select
                  value={activeImportDraft.status}
                  onChange={(event) => setActiveImportDraft((prev) => ({ ...prev, status: event.target.value }))}
                  className={`rounded-lg border px-3 py-2 ${getImportStatusFieldClass(activeImportDraft.status)}`}
                >
                  {IMPORT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Import Warehouse">
                <select
                  value={activeImportDraft.warehouseId}
                  onChange={(event) =>
                    setActiveImportDraft((prev) => ({
                      ...prev,
                      warehouseId: event.target.value,
                      items: prev.items.map((item) => applyDefaultLocationToItem(item, event.target.value, locationOptions)),
                    }))
                  }
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">Select Warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Notes">
                <textarea
                  value={activeImportDraft.notes}
                  onChange={(event) => setActiveImportDraft((prev) => ({ ...prev, notes: event.target.value }))}
                  className="h-24 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2 xl:col-span-2"
                />
              </FormField>
            </div>

            <CollapsibleTableSection
              title="Import Inventory Rows"
              defaultOpen
            >
              <p className="text-sm text-[var(--foreground)]/70">Rows created with this import header.</p>
              <ModalTableShell minWidthClass="min-w-[1320px]">
                <ModalTableHead>
                  <tr>
                    <TableHeaderCell>Product</TableHeaderCell>
                    <TableHeaderCell>Item #</TableHeaderCell>
                    <TableHeaderCell>Stock</TableHeaderCell>
                    <TableHeaderCell>Location</TableHeaderCell>
                    <TableHeaderCell>Dye Lot</TableHeaderCell>
                    <TableHeaderCell>Cost $</TableHeaderCell>
                    <TableHeaderCell>Freight $</TableHeaderCell>
                    <TableHeaderCell>Warehouse</TableHeaderCell>
                    <TableHeaderCell>Notes</TableHeaderCell>
                    <TableHeaderCell>Remove</TableHeaderCell>
                  </tr>
                </ModalTableHead>
                <tbody>
                  {activeImportDraft.items.map((item, index) => {
                    const filteredLocations = activeImportDraft.warehouseId
                      ? locationOptions.filter((location) => location.warehouseId === activeImportDraft.warehouseId)
                      : locationOptions
                    const selectedProduct = productLookup.get(item.productId)

                    return (
                      <tr key={item.clientId} className="border-t border-[var(--panel-border)]">
                        <td className="px-3 py-2">
                          <select
                            value={item.productId}
                            onChange={(event) => setActiveImportItemField(index, "productId", event.target.value)}
                            className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          >
                            <option value="">Select product</option>
                            {productOptions.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.itemNumber}
                            onChange={(event) => setActiveImportItemField(index, "itemNumber", event.target.value)}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              value={item.stockCount}
                              onChange={(event) => setActiveImportItemField(index, "stockCount", event.target.value)}
                              className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            />
                            <span className="text-xs text-[var(--foreground)]/60">{selectedProduct?.stockUnit || "unit"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.locationId}
                            onChange={(event) => setActiveImportItemField(index, "locationId", event.target.value)}
                            className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          >
                            <option value="">Select location</option>
                            {filteredLocations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.dyeLot}
                            onChange={(event) => setActiveImportItemField(index, "dyeLot", event.target.value)}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.cost}
                            onChange={(event) => setActiveImportItemField(index, "cost", event.target.value)}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.freight}
                            onChange={(event) => setActiveImportItemField(index, "freight", event.target.value)}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">{warehouseOptions.find((warehouse) => warehouse.id === activeImportDraft.warehouseId)?.name || "-"}</td>
                        <td className="px-3 py-2">
                          <input
                            value={item.notes}
                            onChange={(event) => setActiveImportItemField(index, "notes", event.target.value)}
                            className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <DeleteRowButton onClick={() => removeActiveImportItemRow(index)}>Remove</DeleteRowButton>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t border-[var(--panel-border)]">
                    <td colSpan={10} className="px-3 py-3">
                      <InlineAddRowButton label="Add Import Inventory Item" onClick={addActiveImportItemRow} />
                    </td>
                  </tr>
                </tbody>
              </ModalTableShell>
            </CollapsibleTableSection>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeImport} disabled={isSaving} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
                Close
              </button>
              <button
                type="button"
                onClick={() => void saveActiveImport()}
                disabled={isSaving}
                className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Import"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
