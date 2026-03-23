"use client"

import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME } from "@/features/flooring/shared/accent-styles"
import { FormStatusNotices } from "@/features/flooring/shared/notices"
import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/record-form"
import { AutoGrowTextarea } from "@/features/flooring/shared/ui/forms/auto-grow-textarea"
import type { DraftWorkOrder, PropertyOption, WarehouseOption } from "../types"
import { VACANCY_OPTIONS, WORK_ORDER_STATUS_OPTIONS, getVacancyFieldClass, getWorkOrderStatusFieldClass, getWorkOrderStatusLabel } from "../contracts"

export function WorkOrderCreateModal({
  draft,
  propertyOptions,
  warehouseOptions,
  selectedAddress,
  message,
  error,
  isSaving,
  onClose,
  onFieldChange,
  onCreate,
}: {
  draft: DraftWorkOrder
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  selectedAddress: string
  message: string
  error: string
  isSaving: boolean
  onClose: () => void
  onFieldChange: (field: keyof DraftWorkOrder, value: string | boolean) => void
  onCreate: () => void
}) {
  return (
    <RecordModalShell title="New Work Order" onClose={onClose}>
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RecordFormField label="Property">
            <select
              value={draft.propertyId}
              onChange={(event) => onFieldChange("propertyId", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="">Select Property</option>
              {propertyOptions.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Warehouse">
            <select
              value={draft.warehouseId}
              onChange={(event) => onFieldChange("warehouseId", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="">Select Warehouse</option>
              {warehouseOptions.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Status">
            <select
              value={draft.status}
              onChange={(event) => onFieldChange("status", event.target.value)}
              className={`rounded border px-3 py-2 ${getWorkOrderStatusFieldClass(draft.status)}`}
            >
              {WORK_ORDER_STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {getWorkOrderStatusLabel({ status: value, isComplete: false })}
                </option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Vacancy">
            <select
              value={draft.vacancy}
              onChange={(event) => onFieldChange("vacancy", event.target.value)}
              className={`rounded border px-3 py-2 ${getVacancyFieldClass(draft.vacancy)}`}
            >
              <option value="">Select</option>
              {VACANCY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Address">
            <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
              {selectedAddress || "Select a property or enter a custom address"}
            </div>
          </RecordFormField>
          <RecordFormField label="Custom Address">
            <input
              value={draft.customAddress}
              onChange={(event) => onFieldChange("customAddress", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Date">
            <input
              type="date"
              value={draft.date}
              onChange={(event) => onFieldChange("date", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Unit Type">
            <input
              value={draft.unitType}
              onChange={(event) => onFieldChange("unitType", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Unit Label">
            <input
              value={draft.unitText}
              onChange={(event) => onFieldChange("unitText", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Notes">
            <AutoGrowTextarea
              value={draft.notes}
              onChange={(event) => onFieldChange("notes", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <div className="md:col-span-2 xl:col-span-4">
            <RecordFormField label="Instructions">
              <AutoGrowTextarea
                value={draft.instructions}
                onChange={(event) => onFieldChange("instructions", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </RecordFormField>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--panel-border)] px-4 py-4 text-sm text-[var(--foreground)]/70">
          This creates a blank work order row. Use the table-level <span className="font-semibold text-[var(--foreground)]">Sync Template</span> action when starting from a property template.
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={isSaving}
            className={FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME}
          >
            {isSaving ? "Creating..." : "Create Work Order"}
          </button>
        </div>
      </div>
    </RecordModalShell>
  )
}
