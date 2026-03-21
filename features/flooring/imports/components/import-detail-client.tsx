"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CollapsibleTableSection, InlineAddRowButton } from "../../shared/collapsible-table-section"
import { RecordDetailPageShell } from "../../shared/record-detail-page-shell"
import { ErrorNotice } from "../../shared/notices"
import { RecordOptionsMenu } from "../../shared/record-options-menu"
import { DeleteRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField } from "../../shared/record-form"
import { RecordMetricSummary } from "../../shared/record-metric-summary"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "../../shared/table-shell"
import { requestJson } from "../../shared/http"
import { useUnsavedChangesGuard } from "../../shared/use-unsaved-changes-guard"
import {
  IMPORT_STATUS_OPTIONS,
  IMPORT_TRANSPORT_TYPE_OPTIONS,
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

function createItemDraft(item?: ImportRow["inventories"][number]): ImportItemDraft {
  return {
    clientId: item?.id ?? crypto.randomUUID(),
    productId: item?.productId ?? "",
    itemNumber: item?.itemNumber ?? "",
    stockCount: item?.stockCount ?? "",
    locationId: item?.locationId ?? "",
    dyeLot: item?.dyeLot ?? "",
    cost: item?.cost ?? "",
    freight: item?.freight ?? "",
    notes: item?.notes ?? "",
  }
}

function createImportDraft(entry: ImportRow): ImportDraft {
  return {
    orderNumber: entry.orderNumber,
    tag: entry.tag,
    transportType: entry.transportType,
    status: entry.status,
    notes: entry.notes,
    warehouseId: entry.warehouseId,
    items: entry.inventories.map((item) => createItemDraft(item)),
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

export function ImportDetailClient({
  initialImport,
  productOptions,
  warehouseOptions,
  locationOptions,
  backHref,
}: {
  initialImport: ImportRow
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  backHref: string
}) {
  const router = useRouter()
  const [record, setRecord] = useState(initialImport)
  const [draft, setDraft] = useState<ImportDraft>(() => createImportDraft(initialImport))
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(createImportDraft(record)), [draft, record])
  const guard = useUnsavedChangesGuard({
    isDirty,
    message: "You have unsaved import changes. Leave this import without saving?",
  })

  const productLookup = useMemo(() => new Map(productOptions.map((product) => [product.id, product])), [productOptions])
  const summary = useMemo(
    () =>
      calculateImportSummary(
        draft.items.map((item) => ({
          stockCount: item.stockCount,
          cost: item.cost,
          freight: item.freight,
        })),
      ),
    [draft.items],
  )

  const closePage = useCallback(() => {
    guard.confirmNavigation(() => {
      router.push(backHref, { scroll: false })
    })
  }, [backHref, guard, router])

  function setDraftField(field: keyof ImportDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function setItemField(index: number, field: keyof ImportItemDraft, value: string) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  function addItemRow() {
    setDraft((prev) => ({ ...prev, items: [...prev.items, createItemDraft()] }))
  }

  function removeItemRow(index: number) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function saveImport() {
    setMessage("")
    setError("")
    setIsSaving(true)

    try {
      const payload = await requestJson<{ import?: ImportRow }>(`/api/flooring/imports/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      if (!payload.import) {
        throw new Error("Failed to save import")
      }

      setRecord(payload.import)
      setDraft(createImportDraft(payload.import))
      setMessage("Import saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save import")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteImport() {
    setMessage("")
    setError("")
    setIsSaving(true)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/imports/${record.id}`, { method: "DELETE" })
      router.push(backHref, { scroll: false })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete import")
      setIsSaving(false)
    }
  }

  return (
    <RecordDetailPageShell
      title={`Import IMP-${String(record.importNumber).padStart(4, "0")}`}
      backHref={backHref}
      onBack={closePage}
      sizeClass="max-w-6xl"
      headerMeta={
        <RecordMetricSummary
          variant="header"
          metrics={[
            { label: "Total Cost", value: summary.totalCostLabel },
            { label: "Material Items", value: summary.materialItemsCount },
          ]}
        />
      }
      headerActions={
        <RecordOptionsMenu
          items={[
            {
              label: "Go to Inventory",
              onSelect: () => {
                guard.confirmNavigation(() => {
                  router.push("/dashboard/flooring/inventory", { scroll: false })
                })
              },
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              className={`rounded-lg border px-3 py-2 ${getTransportTypeFieldClass(draft.transportType)}`}
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
          <FormField label="Import Warehouse">
            <select
              value={draft.warehouseId}
              onChange={(event) =>
                setDraft((prev) => ({
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
              value={draft.notes}
              onChange={(event) => setDraftField("notes", event.target.value)}
              className="h-24 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2 xl:col-span-2"
            />
          </FormField>
        </div>

        <CollapsibleTableSection title="Import Inventory Rows" defaultOpen>
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
                    <td className="px-3 py-2">
                      <input
                        value={item.notes}
                        onChange={(event) => setItemField(index, "notes", event.target.value)}
                        className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <DeleteRowButton onClick={() => removeItemRow(index)}>Remove</DeleteRowButton>
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t border-[var(--panel-border)]">
                <td colSpan={10} className="px-3 py-3">
                  <InlineAddRowButton label="Add Import Inventory Item" onClick={addItemRow} />
                </td>
              </tr>
            </tbody>
          </ModalTableShell>
        </CollapsibleTableSection>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={closePage} disabled={isSaving} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
            Back
          </button>
          <button
            type="button"
            onClick={() => void saveImport()}
            disabled={isSaving}
            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20"
          >
            {isSaving ? "Saving..." : "Save Import"}
          </button>
          <button
            type="button"
            onClick={() => void deleteImport()}
            disabled={isSaving}
            className="rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-600 hover:bg-rose-500/10"
          >
            Delete Import
          </button>
        </div>
      </div>
    </RecordDetailPageShell>
  )
}
