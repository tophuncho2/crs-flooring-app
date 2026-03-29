"use client"

import type { ReactNode } from "react"
import {
  RecordAllocationItemRow,
  RecordAllocationItemsPanel,
  RecordItemCell,
  RecordSectionStatusBadge,
} from "@/features/shared/engines/record-view"
import { formatCurrencyValue } from "@/features/flooring/shared/line-items/line-totals"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import {
  FieldErrorText,
  getFieldControlClassName,
  hasFieldErrors,
  type FieldErrorMap,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { WORK_ORDER_MATERIAL_GRID_CLASS_NAME } from "./material-grid-layout"
import type { InventoryAllocationOption, WorkOrderItemAllocationRow } from "@/features/flooring/work-orders/types"

export type AllocationDraft = {
  inventoryId: string
  quantity: string
  notes: string
}

export type AllocationField = "inventoryId" | "quantity"
export type AllocationFieldErrors = FieldErrorMap<AllocationField>

export function validateAllocationFields(value: Pick<AllocationDraft, "inventoryId" | "quantity">) {
  const errors: AllocationFieldErrors = {}

  if (!value.inventoryId.trim()) {
    errors.inventoryId = "Select inventory."
  }

  if (!value.quantity.trim()) {
    errors.quantity = "Enter a quantity."
  } else if (!isEditableDecimalInput(value.quantity, 2) || !Number.isFinite(Number(value.quantity))) {
    errors.quantity = "Enter a valid quantity with up to 2 decimals."
  } else if (Number(value.quantity) <= 0) {
    errors.quantity = "Enter a quantity greater than 0."
  }

  return errors
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function readPricePerUnit(options: InventoryAllocationOption[], inventoryId: string) {
  return options.find((option) => option.id === inventoryId)?.pricePerUnit ?? 0
}

function readAllocationRowStatus(allocation: WorkOrderItemAllocationRow, hasErrors: boolean) {
  if (hasErrors) {
    return "Needs Review"
  }

  if (allocation.id.startsWith("temp:")) {
    return "Unsaved"
  }

  return "Ready"
}

function readAllocationRowStatusTone(allocation: WorkOrderItemAllocationRow, hasErrors: boolean) {
  if (hasErrors) {
    return "error" as const
  }

  if (allocation.id.startsWith("temp:")) {
    return "warning" as const
  }

  return "neutral" as const
}

function AllocationCell({
  label,
  children,
  className,
}: {
  label: string
  children?: ReactNode
  className?: string
}) {
  return (
    <RecordItemCell
      label={label}
      className={joinClasses("bg-orange-500/[0.08] px-2.5 py-2", className)}
      labelClassName="text-[9px] text-[var(--foreground)]/55"
    >
      {children}
    </RecordItemCell>
  )
}

function AllocationValueCell({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <AllocationCell label={label}>
      <div className="rounded-md border border-[rgba(58,58,58,0.72)] bg-[var(--panel-background)] px-2 py-1.5 text-sm text-[var(--foreground)]">
        {value}
      </div>
    </AllocationCell>
  )
}

function AllocationEditorRow({
  allocation,
  allocationOptions,
  rowErrors,
  onAllocationFieldChange,
  onDeleteAllocation,
}: {
  allocation: WorkOrderItemAllocationRow
  allocationOptions: InventoryAllocationOption[]
  rowErrors: FieldErrorMap<AllocationField> | undefined
  onAllocationFieldChange: (allocationId: string, field: keyof AllocationDraft, value: string) => void
  onDeleteAllocation: (allocationId: string) => void
}) {
  const rowPricePerUnit = readPricePerUnit(allocationOptions, allocation.inventoryId) || Number(allocation.unitCost)
  const quantityValue = Number(allocation.quantity || 0)
  const hasErrors = hasFieldErrors(rowErrors)
  const rowStatusLabel = readAllocationRowStatus(allocation, hasErrors)
  const rowStatusTone = readAllocationRowStatusTone(allocation, hasErrors)

  return (
    <div className={joinClasses(WORK_ORDER_MATERIAL_GRID_CLASS_NAME, hasFieldErrors(rowErrors) ? "bg-rose-500/[0.04]" : undefined)}>
      <AllocationCell label="Inventory">
        <div className="space-y-1">
          <select
            value={allocation.inventoryId}
            onChange={(event) => onAllocationFieldChange(allocation.id, "inventoryId", event.target.value)}
            className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-[var(--foreground)]", Boolean(rowErrors?.inventoryId))}
          >
            <option value="">Select inventory</option>
            {allocationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {rowErrors?.inventoryId ? <FieldErrorText>{rowErrors.inventoryId}</FieldErrorText> : null}
        </div>
      </AllocationCell>
      <AllocationCell label="Qty">
        <div className="space-y-1">
          <input
            value={allocation.quantity}
            inputMode="decimal"
            spellCheck={false}
            placeholder="Qty"
            onChange={(event) => onAllocationFieldChange(allocation.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
            className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-[var(--foreground)]", Boolean(rowErrors?.quantity))}
          />
          {rowErrors?.quantity ? <FieldErrorText>{rowErrors.quantity}</FieldErrorText> : null}
        </div>
      </AllocationCell>
      <AllocationValueCell label="Unit Cost" value={formatCurrencyValue(rowPricePerUnit)} />
      <AllocationValueCell label="Total" value={formatCurrencyValue(quantityValue * rowPricePerUnit)} />
      <AllocationCell label="Notes" className="xl:col-span-2">
        <input
          value={allocation.notes}
          placeholder="Notes"
          onChange={(event) => onAllocationFieldChange(allocation.id, "notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-[var(--foreground)]"
        />
      </AllocationCell>
      <AllocationCell label="Status">
        <div className="flex min-h-[2.5rem] items-center">
          <RecordSectionStatusBadge tone={rowStatusTone} className="min-w-[8.75rem] justify-center">
            {rowStatusLabel}
          </RecordSectionStatusBadge>
        </div>
      </AllocationCell>
      <AllocationCell label="Remove">
        <div className="flex min-h-[2.5rem] items-start justify-start xl:justify-end">
          <DeleteRowButton onClick={() => onDeleteAllocation(allocation.id)} className="whitespace-nowrap px-2.5">
            Remove
          </DeleteRowButton>
        </div>
      </AllocationCell>
    </div>
  )
}

export function MaterialAllocationsEditor({
  allocations,
  allocationOptions,
  loadingOptions,
  onAddAllocation,
  itemErrors = {},
  onAllocationFieldChange,
  onDeleteAllocation,
}: {
  allocations: WorkOrderItemAllocationRow[]
  allocationOptions: InventoryAllocationOption[]
  loadingOptions: boolean
  onAddAllocation: () => void
  itemErrors?: RowFieldErrors<AllocationField>
  onAllocationFieldChange: (allocationId: string, field: keyof AllocationDraft, value: string) => void
  onDeleteAllocation: (allocationId: string) => void
}) {
  return (
    <div className="space-y-0">
      <RecordAllocationItemsPanel
        emptyState="No allocations yet."
        footer={
          <button
            type="button"
            onClick={onAddAllocation}
            disabled={loadingOptions}
            className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
          >
            {loadingOptions ? "Loading inventory..." : "Add Allocation"}
          </button>
        }
      >
        {allocations.length > 0
          ? allocations.map((allocation, index) => {
              return (
                <RecordAllocationItemRow
                  key={allocation.id}
                  className={joinClasses(
                    index > 0 ? "border-t border-[var(--panel-border)]" : undefined,
                    "py-0",
                  )}
                >
                  <AllocationEditorRow
                    allocation={allocation}
                    allocationOptions={allocationOptions}
                    rowErrors={itemErrors[allocation.id]}
                    onAllocationFieldChange={onAllocationFieldChange}
                    onDeleteAllocation={onDeleteAllocation}
                  />
                </RecordAllocationItemRow>
              )
            })
          : null}
      </RecordAllocationItemsPanel>
    </div>
  )
}
