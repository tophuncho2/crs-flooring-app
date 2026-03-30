"use client"

import {
  RecordAllocationRowBuilder,
  RecordRowStatusBadge,
  RecordSectionGrid,
  RecordSectionGridRow,
} from "@/features/shared/engines/record-view"
import { formatCurrencyValue } from "@/features/flooring/shared/line-items/line-totals"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import {
  hasFieldErrors,
  type FieldErrorMap,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { WORK_ORDER_MATERIAL_ALLOCATION_COLUMNS } from "./material-grid-layout"
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

function readPricePerUnit(options: InventoryAllocationOption[], inventoryId: string) {
  return options.find((option) => option.id === inventoryId)?.pricePerUnit ?? 0
}

function readAllocationUnit(options: InventoryAllocationOption[], allocation: WorkOrderItemAllocationRow) {
  return options.find((option) => option.id === allocation.inventoryId)?.stockUnit
    || allocation.inventory.stockUnit
    || "-"
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
    <RecordSectionGrid
      columns={WORK_ORDER_MATERIAL_ALLOCATION_COLUMNS}
      group="allocation"
      surface="nested"
      isEmpty={allocations.length === 0}
      emptyState="No allocations yet."
      footer={(
        <button
          type="button"
          onClick={onAddAllocation}
          disabled={loadingOptions}
          className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {loadingOptions ? "Loading inventory..." : "Add Allocation"}
        </button>
      )}
    >
      {allocations.map((allocation) => {
        const rowErrors = itemErrors[allocation.id]
        const rowPricePerUnit = readPricePerUnit(allocationOptions, allocation.inventoryId) || Number(allocation.unitCost)
        const quantityValue = Number(allocation.quantity || 0)
        const hasErrors = hasFieldErrors(rowErrors)

        return (
          <RecordSectionGridRow
            key={allocation.id}
            columns={WORK_ORDER_MATERIAL_ALLOCATION_COLUMNS}
            group="allocation"
            rowTone={hasErrors ? "error" : "allocation"}
          >
            <RecordAllocationRowBuilder
              inventoryValue={allocation.inventoryId}
              inventoryOptions={allocationOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              quantityValue={allocation.quantity}
              unitLabel={readAllocationUnit(allocationOptions, allocation)}
              unitCostValue={formatCurrencyValue(rowPricePerUnit)}
              totalValue={formatCurrencyValue(quantityValue * rowPricePerUnit)}
              notesValue={allocation.notes}
              inventoryError={rowErrors?.inventoryId}
              quantityError={rowErrors?.quantity}
              onInventoryChange={(value) => onAllocationFieldChange(allocation.id, "inventoryId", value)}
              onQuantityChange={(value) => onAllocationFieldChange(allocation.id, "quantity", normalizeEditableDecimalInput(value))}
              onNotesChange={(value) => onAllocationFieldChange(allocation.id, "notes", value)}
              controls={{
                capabilities: { supportsStatusColumn: true, supportsRemoveRow: true },
                status: {
                  content: (
                    <RecordRowStatusBadge tone={readAllocationRowStatusTone(allocation, hasErrors)}>
                      {readAllocationRowStatus(allocation, hasErrors)}
                    </RecordRowStatusBadge>
                  ),
                },
                remove: {
                  onRemove: () => onDeleteAllocation(allocation.id),
                },
              }}
            />
          </RecordSectionGridRow>
        )
      })}
    </RecordSectionGrid>
  )
}
