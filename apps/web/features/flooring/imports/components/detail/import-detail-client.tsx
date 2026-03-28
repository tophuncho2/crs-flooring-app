"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/shell/record-detail-page-shell"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { RecordOptionsMenu } from "@/features/dashboard/shared/record-view/shell/record-options-menu"
import {
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField as FormField,
} from "@/features/dashboard/shared/record-view/forms/record-form"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"
import { RecordMetricSummary } from "@/features/flooring/shared/ui/display/record-metric-summary"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { useRecordDetailController } from "@/features/dashboard/shared/record-view/client/use-record-detail-controller"
import { useRecordPageController } from "@/features/dashboard/shared/record-view/client/use-record-page-controller"
import {
  IMPORT_STATUS_OPTIONS,
  IMPORT_TRANSPORT_TYPE_OPTIONS,
  getImportStatusFieldClass,
  getTransportTypeFieldClass,
} from "@/features/flooring/imports/contracts"
import { calculateImportSummary } from "@/features/flooring/imports/domain/summary"
import { ImportInventoryRowsSection, type ImportItemDraft } from "./import-inventory-rows-section"

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
  const { closePage, confirmNavigation, notices, redirectToBack, setIsDirty } = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved import changes. Leave this import without saving?",
  })
  const {
    record,
    draft,
    setDraft,
    error,
    setError,
    syncRecord,
    clearRecordCache,
    isDirty,
  } = useRecordDetailController<ImportRow, ImportDraft>({
    scope: "import",
    id: initialImport.id,
    initialRecord: initialImport,
    toDraft: createImportDraft,
    url: `/api/flooring/imports/${initialImport.id}`,
    payloadKey: "import",
  })
  const [isSaving, setIsSaving] = useState(false)
  const currentRecord = record ?? initialImport
  const currentDraft = draft ?? createImportDraft(currentRecord)

  const summary = useMemo(
    () =>
      calculateImportSummary(
        currentDraft.items.map((item) => ({
          stockCount: item.stockCount,
          cost: item.cost,
          freight: item.freight,
        })),
    ),
    [currentDraft.items],
  )

  useEffect(() => {
    setIsDirty(isDirty)
  }, [isDirty, setIsDirty])

  function setDraftField(field: keyof ImportDraft, value: string) {
    setDraft((prev) => ({ ...(prev ?? currentDraft), [field]: value }))
  }

  function setItemField(index: number, field: keyof ImportItemDraft, value: string) {
    setDraft((prev) => ({
      ...(prev ?? currentDraft),
      items: (prev?.items ?? currentDraft.items).map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  function addItemRow() {
    setDraft((prev) => ({
      ...(prev ?? currentDraft),
      items: [...(prev?.items ?? currentDraft.items), createItemDraft()],
    }))
  }

  function removeItemRow(index: number) {
    setDraft((prev) => ({
      ...(prev ?? currentDraft),
      items: (prev?.items ?? currentDraft.items).filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function saveImport() {
    notices.clearNotices()
    setError("")
    setIsSaving(true)

    try {
      const payload = await requestJson<{ import?: ImportRow }>(`/api/flooring/imports/${currentRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentDraft),
      })

      if (!payload.import) {
        throw new Error("Failed to save import")
      }

      syncRecord(payload.import)
      notices.showSuccess("Import saved")
    } catch (saveError) {
      notices.showError(saveError instanceof Error ? saveError.message : "Failed to save import")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteImport() {
    notices.clearNotices()
    setError("")
    setIsSaving(true)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/imports/${currentRecord.id}`, { method: "DELETE" })
      clearRecordCache()
      redirectToBack()
    } catch (deleteError) {
      notices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete import")
      setIsSaving(false)
    }
  }

  return (
    <RecordDetailPageShell
      title={`Import IMP-${String(currentRecord.importNumber).padStart(4, "0")}`}
      backHref={backHref}
      onBack={closePage}
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
                confirmNavigation(() => {
                  router.push("/dashboard/flooring/inventory", { scroll: false })
                })
              },
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        <FormStatusNotices message={notices.message} error={notices.error || error} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Order Number">
            <input
              value={currentDraft.orderNumber}
              onChange={(event) => setDraftField("orderNumber", event.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Tag">
            <input
              value={currentDraft.tag}
              onChange={(event) => setDraftField("tag", event.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Transport Type">
            <select
              value={currentDraft.transportType}
              onChange={(event) => setDraftField("transportType", event.target.value)}
              className={`rounded-lg border px-3 py-2 ${getTransportTypeFieldClass(currentDraft.transportType)}`}
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
              value={currentDraft.status}
              onChange={(event) => setDraftField("status", event.target.value)}
              className={`rounded-lg border px-3 py-2 ${getImportStatusFieldClass(currentDraft.status)}`}
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
              value={currentDraft.warehouseId}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...(prev ?? currentDraft),
                  warehouseId: event.target.value,
                  items: (prev?.items ?? currentDraft.items).map((item) => applyDefaultLocationToItem(item, event.target.value, locationOptions)),
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
              value={currentDraft.notes}
              onChange={(event) => setDraftField("notes", event.target.value)}
              rows={1}
              className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
            />
          </FormField>
        </div>

        <ImportInventoryRowsSection
          items={currentDraft.items}
          productOptions={productOptions}
          warehouseOptions={warehouseOptions}
          locationOptions={locationOptions}
          warehouseId={currentDraft.warehouseId}
          totalCostLabel={summary.totalCostLabel}
          onItemFieldChange={setItemField}
          onAddItemRow={addItemRow}
          onRemoveItemRow={removeItemRow}
        />

        <RecordPanelFooter
          deleteLabel="Delete Import"
          deleteConfirmMessage={buildDeleteConfirmationMessage("import")}
          onDelete={() => void deleteImport()}
          onClose={closePage}
          saveLabel="Save Import"
          savingLabel="Saving..."
          onSave={() => void saveImport()}
          isSaving={isSaving}
        />
      </div>
    </RecordDetailPageShell>
  )
}
