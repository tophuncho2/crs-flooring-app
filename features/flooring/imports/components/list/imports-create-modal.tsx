"use client"

import { Save } from "lucide-react"
import {
  FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME,
} from "@/features/flooring/shared/ui/display/accent-styles"
import { ErrorNotice } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "@/features/flooring/shared/ui/forms/record-form"
import { getSharedFormFieldClass } from "@/features/flooring/shared/ui/forms/form-field-styles"
import { StatusPill } from "@/features/flooring/shared/ui/feedback/status-pill"
import { IMPORT_INVENTORY_TABLE_MIN_WIDTH_CLASS } from "@/features/flooring/shared/ui/table/table-size-classes"
import { CollapsibleTableSection, InlineAddRowButton } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "@/features/flooring/shared/ui/table/table-shell"
import type {
  CreateImportValidation,
  ImportDraft,
  ImportItemDraft,
  LocationOption,
  ProductOption,
  WarehouseOption,
} from "@/features/flooring/imports/controllers/use-imports-list-controller"
import {
  IMPORT_STATUS_OPTIONS,
  IMPORT_TRANSPORT_TYPE_OPTIONS,
  formatImportStatus,
  getImportStatusFieldClass,
  getTransportTypeFieldClass,
} from "@/features/flooring/imports/contracts"

function autoResizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "0px"
  element.style.height = `${Math.max(element.scrollHeight, 42)}px`
}

export function ImportsCreateModal({
  isOpen,
  onClose,
  draft,
  warehouseOptions,
  productOptions,
  locationOptions,
  productLookup,
  validation,
  onDraftFieldChange,
  onItemFieldChange,
  onAddItemRow,
  onRemoveItemRow,
  onSave,
  isSaving,
  isLoadingOptions,
  error,
}: {
  isOpen: boolean
  onClose: () => void
  draft: ImportDraft
  warehouseOptions: WarehouseOption[]
  productOptions: ProductOption[]
  locationOptions: LocationOption[]
  productLookup: Map<string, ProductOption>
  validation: CreateImportValidation
  onDraftFieldChange: (field: keyof Omit<ImportDraft, "items">, value: string) => void
  onItemFieldChange: (index: number, field: keyof ImportItemDraft, value: string) => void
  onAddItemRow: () => void
  onRemoveItemRow: (index: number) => void
  onSave: () => void
  isSaving: boolean
  isLoadingOptions: boolean
  error: string
}) {
  if (!isOpen) return null

  const selectedWarehouseName = warehouseOptions.find((warehouse) => warehouse.id === draft.warehouseId)?.name || "-"

  return (
    <ModalShell title="New Import" onClose={onClose}>
      <div className="space-y-6">
        {error ? <ErrorNotice>{error}</ErrorNotice> : null}
        {isLoadingOptions ? <p className="text-sm text-[var(--foreground)]/65">Loading import options...</p> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Import Warehouse">
            <select
              value={draft.warehouseId}
              onChange={(event) => onDraftFieldChange("warehouseId", event.target.value)}
              disabled={isLoadingOptions}
              className={`rounded-lg border px-3 py-2 ${getSharedFormFieldClass({
                isRequired: true,
                isEmpty: validation.warehouseId,
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
              onChange={(event) => onDraftFieldChange("orderNumber", event.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Transport Type">
            <select
              value={draft.transportType}
              onChange={(event) => onDraftFieldChange("transportType", event.target.value)}
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
            <input
              value="Created on save"
              readOnly
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75"
            />
          </FormField>
          <FormField label="Tag">
            <input
              value={draft.tag}
              onChange={(event) => onDraftFieldChange("tag", event.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={draft.notes}
              onChange={(event) => onDraftFieldChange("notes", event.target.value)}
              onInput={(event) => autoResizeTextarea(event.currentTarget)}
              rows={1}
              className="min-h-[42px] resize-y overflow-hidden rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Import Status">
            <select
              value={draft.status}
              onChange={(event) => onDraftFieldChange("status", event.target.value)}
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

        <CollapsibleTableSection title="Inventory Table" defaultOpen>
          <ModalTableShell minWidthClass={IMPORT_INVENTORY_TABLE_MIN_WIDTH_CLASS}>
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
                const itemValidation = validation.itemFields[item.clientId] ?? {
                  productId: false,
                  stockCount: false,
                }

                return (
                  <tr key={item.clientId} className="border-t border-[var(--panel-border)]">
                    <td className="px-3 py-2">
                      <select
                        value={item.productId}
                        onChange={(event) => onItemFieldChange(index, "productId", event.target.value)}
                        disabled={isLoadingOptions}
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
                        onChange={(event) => onItemFieldChange(index, "itemNumber", event.target.value)}
                        className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={item.stockCount}
                          onChange={(event) => onItemFieldChange(index, "stockCount", event.target.value)}
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
                        onChange={(event) => onItemFieldChange(index, "locationId", event.target.value)}
                        disabled={isLoadingOptions}
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
                        onChange={(event) => onItemFieldChange(index, "dyeLot", event.target.value)}
                        className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={item.cost}
                        onChange={(event) => onItemFieldChange(index, "cost", event.target.value)}
                        className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={item.freight}
                        onChange={(event) => onItemFieldChange(index, "freight", event.target.value)}
                        className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">{selectedWarehouseName}</td>
                    <td className="px-3 py-2">
                      <StatusPill label={formatImportStatus(draft.status)} toneClassName={getImportStatusFieldClass(draft.status)} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={item.notes}
                        onChange={(event) => onItemFieldChange(index, "notes", event.target.value)}
                        className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <DeleteRowButton onClick={() => onRemoveItemRow(index)}>Remove</DeleteRowButton>
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t border-[var(--panel-border)]">
                <td colSpan={11} className="px-3 py-3">
                  <InlineAddRowButton label="Add Inventory Item" onClick={onAddItemRow} />
                </td>
              </tr>
            </tbody>
          </ModalTableShell>
        </CollapsibleTableSection>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isLoadingOptions}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isLoadingOptions}
            className={FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME}
          >
            <Save size={16} />
            {isLoadingOptions ? "Loading..." : isSaving ? "Creating..." : "Create Import"}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
