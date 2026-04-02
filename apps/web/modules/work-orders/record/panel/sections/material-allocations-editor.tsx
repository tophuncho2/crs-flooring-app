"use client"

import {
  RecordAllocationRowBuilder,
  RecordRowStatusBadge,
  RecordScopedRow,
  resolveRecordRowStatus,
} from "@/modules/shared/engines/record-view"
import { formatCurrencyValue } from "@builders/domain"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/modules/shared/engines/record-view/contracts/child-item-validation"
import {
  hasFieldErrors,
  type FieldErrorMap,
  type RowFieldErrors,
} from "@/modules/shared/engines/record-view/feedback/record-field-errors"
import { WORK_ORDER_MATERIAL_ALLOCATION_LAYOUT } from "./work-order-line-item-grid"
import type { InventoryAllocationOption, WorkOrderItemAllocationRow } from "@/modules/work-orders/types"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/modules/shared/engines/record-view/sections/record-section-tokens"

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

export function MaterialAllocationsContent({
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
    <>
      {allocations.length === 0 ? (
        <div className="bg-orange-500/[0.06] px-4 py-8 text-center text-[var(--foreground)]/65">
          No allocations yet.
        </div>
      ) : (
        allocations.map((allocation, index) => {
          const rowErrors = itemErrors[allocation.id]
          const rowPricePerUnit = readPricePerUnit(allocationOptions, allocation.inventoryId) || Number(allocation.unitCost)
          const quantityValue = Number(allocation.quantity || 0)
          const hasErrors = hasFieldErrors(rowErrors)
          const status = resolveRecordRowStatus({
            hasErrors,
            isUnsaved: allocation.id.startsWith("temp:"),
          })

          return (
            <RecordScopedRow
              key={allocation.id}
              layout={WORK_ORDER_MATERIAL_ALLOCATION_LAYOUT}
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
                showCellLabels={index === 0}
                onInventoryChange={(value) => onAllocationFieldChange(allocation.id, "inventoryId", value)}
                onQuantityChange={(value) => onAllocationFieldChange(allocation.id, "quantity", normalizeEditableDecimalInput(value))}
                onNotesChange={(value) => onAllocationFieldChange(allocation.id, "notes", value)}
                controls={{
                  capabilities: { supportsStatusColumn: true, supportsRemoveRow: true },
                  status: {
                    content: (
                      <RecordRowStatusBadge tone={status.tone}>
                        {status.label}
                      </RecordRowStatusBadge>
                    ),
                  },
                  remove: {
                    onRemove: () => onDeleteAllocation(allocation.id),
                  },
                }}
              />
            </RecordScopedRow>
          )
        })
      )}
      <div
        className={joinRecordSectionClasses(
          "flex justify-end bg-orange-500/[0.06] px-3 py-3",
          "border-t",
          RECORD_SECTION_BORDER_CLASS_NAME,
        )}
      >
        <button
          type="button"
          onClick={onAddAllocation}
          disabled={loadingOptions}
          className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {loadingOptions ? "Loading inventory..." : "Add Allocation"}
        </button>
      </div>
    </>
  )
}
