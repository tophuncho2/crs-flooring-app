"use client"

import type { ReactNode } from "react"
import { RecordInlineActionsCell } from "@/features/dashboard/shared/record-view/sections/record-inline-actions-cell"
import { RecordItemCell } from "@/features/dashboard/shared/record-view/sections/record-item-cell"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "@/features/dashboard/shared/record-view/sections/record-section-tokens"
import { formatCurrencyValue } from "@/features/flooring/shared/line-items/line-totals"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { InlineAddRowButton, useInlineCreateRow } from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import {
  FieldErrorText,
  getFieldControlClassName,
  hasFieldErrors,
  type FieldErrorMap,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { useRowAutosave } from "@/features/flooring/shared/line-items/use-row-autosave"
import { WORK_ORDER_MATERIAL_GRID_CLASS_NAME } from "@/features/flooring/work-orders/components/material-grid-layout"
import type { InventoryAllocationOption, WorkOrderItemAllocationRow } from "../types"

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
      className={joinClasses("bg-orange-500/[0.08] px-3 py-2", className)}
      labelClassName="text-[var(--foreground)]/55"
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

function AllocationActionsPanel({
  children,
}: {
  children: ReactNode
}) {
  return (
    <RecordInlineActionsCell className="h-full bg-orange-500/[0.08] px-3 py-2">{children}</RecordInlineActionsCell>
  )
}

function AllocationRowShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        WORK_ORDER_MATERIAL_GRID_CLASS_NAME,
        className,
      )}
    >
      {children}
    </div>
  )
}

function AllocationEditorRow({
  allocation,
  allocationOptions,
  deletingAllocationId,
  rowErrors,
  onAllocationFieldChange,
  onSaveAllocation,
  onDeleteAllocation,
}: {
  allocation: WorkOrderItemAllocationRow
  allocationOptions: InventoryAllocationOption[]
  deletingAllocationId: string | null
  rowErrors: FieldErrorMap<AllocationField> | undefined
  onAllocationFieldChange: (allocationId: string, field: keyof AllocationDraft, value: string) => void
  onSaveAllocation: (allocation: WorkOrderItemAllocationRow) => Promise<boolean> | boolean
  onDeleteAllocation: (allocationId: string) => void
}) {
  const rowPricePerUnit = readPricePerUnit(allocationOptions, allocation.inventoryId) || Number(allocation.unitCost)
  const quantityValue = Number(allocation.quantity || 0)
  const autosave = useRowAutosave({
    rowId: allocation.id,
    value: allocation,
    serialize: (currentAllocation) =>
      JSON.stringify({
        inventoryId: currentAllocation.inventoryId,
        quantity: currentAllocation.quantity,
        notes: currentAllocation.notes,
      }),
    canAutosave:
      Object.keys(
        validateAllocationFields({
          inventoryId: allocation.inventoryId,
          quantity: allocation.quantity,
        }),
      ).length === 0,
    onSave: onSaveAllocation,
  })

  return (
    <AllocationRowShell
      {...autosave.focusLeaveProps}
      className={hasFieldErrors(rowErrors) ? "bg-rose-500/[0.04]" : undefined}
    >
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
      <AllocationCell label="Notes">
        <input
          value={allocation.notes}
          placeholder="Notes"
          onChange={(event) => onAllocationFieldChange(allocation.id, "notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-[var(--foreground)]"
        />
      </AllocationCell>
      <AllocationActionsPanel>
        <DeleteRowButton onClick={() => onDeleteAllocation(allocation.id)} disabled={deletingAllocationId === allocation.id}>
          {deletingAllocationId === allocation.id ? "Deleting..." : "Delete"}
        </DeleteRowButton>
      </AllocationActionsPanel>
    </AllocationRowShell>
  )
}

export function MaterialAllocationsEditor({
  allocations,
  draft,
  allocationOptions,
  loadingOptions,
  adding,
  deletingAllocationId,
  draftErrors = {},
  itemErrors = {},
  onDraftChange,
  onAdd,
  onAllocationFieldChange,
  onSaveAllocation,
  onDeleteAllocation,
}: {
  allocations: WorkOrderItemAllocationRow[]
  draft: AllocationDraft
  allocationOptions: InventoryAllocationOption[]
  loadingOptions: boolean
  adding: boolean
  deletingAllocationId: string | null
  draftErrors?: AllocationFieldErrors
  itemErrors?: RowFieldErrors<AllocationField>
  onDraftChange: (field: keyof AllocationDraft, value: string) => void
  onAdd: () => Promise<boolean> | boolean
  onAllocationFieldChange: (allocationId: string, field: keyof AllocationDraft, value: string) => void
  onSaveAllocation: (allocation: WorkOrderItemAllocationRow) => Promise<boolean> | boolean
  onDeleteAllocation: (allocationId: string) => void
}) {
  const addRow = useInlineCreateRow(false)

  async function handleAdd() {
    const didAdd = await onAdd()
    if (didAdd !== false) {
      addRow.close()
    }
  }

  function handleCancel() {
    onDraftChange("inventoryId", "")
    onDraftChange("quantity", "")
    onDraftChange("notes", "")
    addRow.close()
  }

  return (
    <div className="space-y-0">
      {allocations.map((allocation) => {
        return (
          <AllocationEditorRow
            key={allocation.id}
            allocation={allocation}
            allocationOptions={allocationOptions}
            deletingAllocationId={deletingAllocationId}
            rowErrors={itemErrors[allocation.id]}
            onAllocationFieldChange={onAllocationFieldChange}
            onSaveAllocation={onSaveAllocation}
            onDeleteAllocation={onDeleteAllocation}
          />
        )
      })}

      {!addRow.isOpen ? (
        <div>
          <InlineAddRowButton
            label="Add allocation"
            onClick={addRow.open}
            className={RECORD_SECTION_BORDER_CLASS_NAME}
          />
        </div>
      ) : null}

      {addRow.isOpen ? (
        <AllocationRowShell className={hasFieldErrors(draftErrors) ? "bg-rose-500/[0.05]" : undefined}>
          <AllocationCell label="Inventory">
            <div className="space-y-1">
              <select
                value={draft.inventoryId}
                onChange={(event) => onDraftChange("inventoryId", event.target.value)}
                className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-[var(--foreground)]", Boolean(draftErrors.inventoryId))}
              >
                <option value="">Select inventory</option>
                {allocationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {draftErrors.inventoryId ? <FieldErrorText>{draftErrors.inventoryId}</FieldErrorText> : null}
            </div>
          </AllocationCell>
          <AllocationCell label="Qty">
            <div className="space-y-1">
              <input
                value={draft.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onDraftChange("quantity", normalizeEditableDecimalInput(event.target.value))}
                className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-[var(--foreground)]", Boolean(draftErrors.quantity))}
              />
              {draftErrors.quantity ? <FieldErrorText>{draftErrors.quantity}</FieldErrorText> : null}
            </div>
          </AllocationCell>
          <AllocationValueCell label="Unit Cost" value={formatCurrencyValue(readPricePerUnit(allocationOptions, draft.inventoryId))} />
          <AllocationValueCell
            label="Total"
            value={formatCurrencyValue(Number(draft.quantity || 0) * readPricePerUnit(allocationOptions, draft.inventoryId))}
          />
          <AllocationCell label="Notes">
            <input
              value={draft.notes}
              placeholder="Notes"
              onChange={(event) => onDraftChange("notes", event.target.value)}
              className="w-full rounded border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-[var(--foreground)]"
            />
          </AllocationCell>
          <AllocationActionsPanel>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={adding}
                className="rounded-md border border-[rgba(58,58,58,0.72)] px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={adding || loadingOptions}
                className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                {loadingOptions ? "Loading..." : adding ? "Adding..." : "Add"}
              </button>
            </div>
          </AllocationActionsPanel>
        </AllocationRowShell>
      ) : null}
    </div>
  )
}
