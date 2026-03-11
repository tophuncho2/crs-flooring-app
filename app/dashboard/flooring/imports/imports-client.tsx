"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import { ErrorNotice, SuccessNotice } from "../shared/notices"
import { DeleteRowButton, OpenRowButton } from "../shared/row-action-buttons"
import { TableColumnSettings } from "../shared/table-column-settings"
import TableControlsBar from "../shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "../shared/table-shell"
import { useTableColumns } from "../shared/use-table-columns"
import { useTableControls } from "../shared/use-table-controls"

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

const transportTypeOptions = [
  { value: "RETURN", label: "Return" },
  { value: "PURCHASE_ORDER", label: "Purchase Order" },
]

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "FINAL", label: "Final" },
]

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

function createEmptyDraft(): ImportDraft {
  return {
    orderNumber: "",
    tag: "",
    transportType: "PURCHASE_ORDER",
    status: "PENDING",
    notes: "",
    warehouseId: "",
    items: [createEmptyItem()],
  }
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}

function formatImportStatus(value: string) {
  return value === "FINAL" ? "Final" : "Pending"
}

function formatTransportType(value: string) {
  return value === "RETURN" ? "Return" : "Purchase Order"
}

export default function ImportsClient({
  initialImports,
  productOptions,
  warehouseOptions,
  locationOptions,
}: {
  initialImports: ImportRow[]
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
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
  const [activeImportError, setActiveImportError] = useState("")

  const productLookup = useMemo(() => new Map(productOptions.map((product) => [product.id, product])), [productOptions])
  const activeImport = useMemo(() => imports.find((row) => row.id === activeImportId) ?? null, [imports, activeImportId])
  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupFields,
    filteredRows: filteredImports,
    sortedRows: sortedImports,
    groupedRows: groupedImports,
  } = useTableControls({
    rows: imports,
    searchFields: [
      { key: "importNumber", getValue: (row) => `IMP-${String(row.importNumber).padStart(4, "0")}` },
      { key: "tag", getValue: (row) => row.tag },
    ],
    sortField: (row) => String(row.importNumber),
    groupFields: [{ key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName }],
    defaultGrouped: true,
    defaultGroupKey: "warehouse",
  })
  const importColumns = useMemo(
    () => [
      { key: "open", label: "Open" },
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
    setDraft(createEmptyDraft())
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
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function setItemField(index: number, field: keyof ImportItemDraft, value: string) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  function addItemRow() {
    setDraft((prev) => ({ ...prev, items: [createEmptyItem(), ...prev.items] }))
  }

  function removeItemRow(index: number) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? [createEmptyItem()] : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function setActiveImportItemField(index: number, field: keyof ImportItemDraft, value: string) {
    setActiveImportDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  function addActiveImportItemRow() {
    setActiveImportDraft((prev) => ({ ...prev, items: [createEmptyItem(), ...prev.items] }))
  }

  function removeActiveImportItemRow(index: number) {
    setActiveImportDraft((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? [createEmptyItem()] : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function createImport() {
    setMessage("")
    setPageError("")
    setCreateModalError("")
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
      setDraft(createEmptyDraft())
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
      open: (
        <td key="open" className="px-3 py-2">
          <OpenRowButton onClick={() => openImport(row.id)} />
        </td>
      ),
      importNumber: <td key="importNumber" className="px-3 py-2 font-medium text-blue-500">IMP-{String(row.importNumber).padStart(4, "0")}</td>,
      tag: <td key="tag" className="px-3 py-2">{row.tag || "-"}</td>,
      transport: <td key="transport" className="px-3 py-2">{formatTransportType(row.transportType)}</td>,
      status: <td key="status" className="px-3 py-2">{formatImportStatus(row.status)}</td>,
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

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Imports</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">Create import headers and inventory rows before material arrives.</p>
          </div>
          <TableActionsSummary count={filteredImports.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search import # or tag"
              isAscendingSort={isAscendingSort}
              onToggleSort={() => setIsAscendingSort((prev) => !prev)}
              ascendingSortLabel="1-9"
              descendingSortLabel="9-1"
              isGroupingEnabled={isGroupingEnabled}
              onToggleGrouping={() => setIsGroupingEnabled((prev) => !prev)}
              groupOptions={groupFields.map((field) => ({ key: field.key, label: field.label }))}
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
              {isGroupingEnabled
                ? groupedImports.flatMap(([groupName, rows]) => [
                    <TableGroupRow key={`group-${groupName}`} label={groupName} colSpan={visibleImportColumns.length} />,
                    ...rows.map((row) => renderImportRow(row)),
                  ])
                : sortedImports.map((row) => renderImportRow(row))}
              {filteredImports.length === 0 ? <TableEmptyRow message="No imports logged yet." colSpan={visibleImportColumns.length} /> : null}
            </tbody>
        </TableShell>
      </section>

      {isModalOpen ? (
        <ModalShell title="New Import" onClose={closeCreateModal}>
          <div className="space-y-6">
            {createModalError ? <ErrorNotice>{createModalError}</ErrorNotice> : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Import Number">
                <input value="Assigned on save" readOnly className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75" />
              </FormField>
              <FormField label="Order Number">
                <input
                  value={draft.orderNumber}
                  onChange={(event) => setDraftField("orderNumber", event.target.value)}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
              <FormField label="Tag">
                <input
                  value={draft.tag}
                  onChange={(event) => setDraftField("tag", event.target.value)}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
              <FormField label="Transport Type">
                <select
                  value={draft.transportType}
                  onChange={(event) => setDraftField("transportType", event.target.value)}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  {transportTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Import Status">
                <select
                  value={draft.status}
                  onChange={(event) => setDraftField("status", event.target.value)}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Created Time">
                <input value="Created on save" readOnly className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75" />
              </FormField>
              <FormField label="Import Warehouse">
                <select
                  value={draft.warehouseId}
                  onChange={(event) => setDraftField("warehouseId", event.target.value)}
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
                  value={draft.notes}
                  onChange={(event) => setDraftField("notes", event.target.value)}
                  className="h-28 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2 xl:col-span-2"
                />
              </FormField>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Inventory Table</h3>
                  <p className="text-sm text-[var(--foreground)]/70">Pending inventory created here will stay out of live inventory until the import is final.</p>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]"
                >
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
                <table className="w-full min-w-[1380px] text-sm">
                  <thead className="bg-[var(--panel-hover)] text-left">
                    <tr>
                      <th className="h-10 px-3 py-2">Product</th>
                      <th className="h-10 px-3 py-2">Item #</th>
                      <th className="h-10 px-3 py-2">Starting Stock</th>
                      <th className="h-10 px-3 py-2">Location</th>
                      <th className="h-10 px-3 py-2">Dye Lot</th>
                      <th className="h-10 px-3 py-2">Cost $</th>
                      <th className="h-10 px-3 py-2">Freight $</th>
                      <th className="h-10 px-3 py-2">Import Warehouse</th>
                      <th className="h-10 px-3 py-2">Import Status</th>
                      <th className="h-10 px-3 py-2">Notes</th>
                      <th className="h-10 px-3 py-2">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.items.map((item, index) => {
                      const filteredLocations = draft.warehouseId
                        ? locationOptions.filter((location) => location.warehouseId === draft.warehouseId)
                        : locationOptions
                      const selectedProduct = productLookup.get(item.productId)

                      return (
                        <tr key={item.clientId} className="border-t border-[var(--panel-border)]">
                          <td className="px-3 py-2">
                            <select
                              value={item.productId}
                              onChange={(event) => setItemField(index, "productId", event.target.value)}
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
                              onChange={(event) => setItemField(index, "itemNumber", event.target.value)}
                              className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <input
                                value={item.stockCount}
                                onChange={(event) => setItemField(index, "stockCount", event.target.value)}
                                className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
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
                              className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.cost}
                              onChange={(event) => setItemField(index, "cost", event.target.value)}
                              className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={item.freight}
                              onChange={(event) => setItemField(index, "freight", event.target.value)}
                              className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">{warehouseOptions.find((warehouse) => warehouse.id === draft.warehouseId)?.name || "-"}</td>
                          <td className="px-3 py-2">{formatImportStatus(draft.status)}</td>
                          <td className="px-3 py-2">
                            <input
                              value={item.notes}
                              onChange={(event) => setItemField(index, "notes", event.target.value)}
                              className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

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
        <ModalShell title={`Import IMP-${String(activeImport.importNumber).padStart(4, "0")}`} onClose={closeImport}>
          <div className="space-y-6">
            {message === "Import saved" ? (
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                Import saved
              </p>
            ) : null}
            {activeImportError ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{activeImportError}</p> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Import Number">
                <input
                  value={`IMP-${String(activeImport.importNumber).padStart(4, "0")}`}
                  readOnly
                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75"
                />
              </FormField>
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
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  {transportTypeOptions.map((option) => (
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
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Import Warehouse">
                <select
                  value={activeImportDraft.warehouseId}
                  onChange={(event) => setActiveImportDraft((prev) => ({ ...prev, warehouseId: event.target.value }))}
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

            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Import Inventory Rows</h3>
                <p className="text-sm text-[var(--foreground)]/70">Rows created with this import header.</p>
              </div>
              <button
                type="button"
                onClick={addActiveImportItemRow}
                className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]"
              >
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
              <table className="w-full min-w-[1320px] text-sm">
                <thead className="bg-[var(--panel-hover)] text-left">
                  <tr>
                    <th className="h-10 px-3 py-2">Product</th>
                    <th className="h-10 px-3 py-2">Item #</th>
                    <th className="h-10 px-3 py-2">Stock</th>
                    <th className="h-10 px-3 py-2">Location</th>
                    <th className="h-10 px-3 py-2">Dye Lot</th>
                    <th className="h-10 px-3 py-2">Cost $</th>
                    <th className="h-10 px-3 py-2">Freight $</th>
                    <th className="h-10 px-3 py-2">Warehouse</th>
                    <th className="h-10 px-3 py-2">Notes</th>
                    <th className="h-10 px-3 py-2">Remove</th>
                  </tr>
                </thead>
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
                          <button
                            type="button"
                            onClick={() => removeActiveImportItemRow(index)}
                            className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {activeImportDraft.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                        No inventory rows were attached to this import.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

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
