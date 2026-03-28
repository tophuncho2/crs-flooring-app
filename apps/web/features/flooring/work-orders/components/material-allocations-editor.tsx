"use client"

import type { ReactNode } from "react"
import { formatCurrencyValue } from "@/features/flooring/shared/line-items/line-totals"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import { DeleteRowButton, SaveRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { InlineAddRowButton, useInlineCreateRow } from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import {
  FieldErrorText,
  getFieldControlClassName,
  hasFieldErrors,
  type FieldErrorMap,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { useRowAutosave } from "@/features/flooring/shared/line-items/use-row-autosave"
import type { InventoryAllocationOption, WorkOrderItemAllocationRow } from "../types"

export type AllocationDraft = {
  inventoryId: string
  quantity: string
  cutSize: string
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
    <div className={joinClasses("min-w-0 px-3 py-2", className)}>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--foreground)]/45">{label}</div>
      <div>{children}</div>
    </div>
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
      <div className="rounded border border-[var(--panel-border)] px-2 py-1 text-sm">{value}</div>
    </AllocationCell>
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
        "grid overflow-hidden rounded-lg border border-[var(--panel-border)] bg-transparent xl:grid-cols-[minmax(18rem,1.9fr)_minmax(6.5rem,.7fr)_minmax(7rem,.75fr)_minmax(8rem,.75fr)_minmax(8rem,.75fr)_minmax(7.5rem,.7fr)_minmax(12rem,1.2fr)_auto_auto]",
        "[&>*+*]:border-l [&>*+*]:border-[var(--panel-border)]",
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
  savingAllocationId,
  deletingAllocationId,
  rowErrors,
  onAllocationFieldChange,
  onSaveAllocation,
  onDeleteAllocation,
}: {
  allocation: WorkOrderItemAllocationRow
  allocationOptions: InventoryAllocationOption[]
  savingAllocationId: string | null
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
        cutSize: currentAllocation.cutSize,
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
            className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(rowErrors?.inventoryId))}
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
            className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(rowErrors?.quantity))}
          />
          {rowErrors?.quantity ? <FieldErrorText>{rowErrors.quantity}</FieldErrorText> : null}
        </div>
      </AllocationCell>
      <AllocationCell label="Cut Size">
        <input
          value={allocation.cutSize}
          placeholder="Cut Size"
          onChange={(event) => onAllocationFieldChange(allocation.id, "cutSize", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
      </AllocationCell>
      <AllocationValueCell label="Unit Cost" value={formatCurrencyValue(rowPricePerUnit)} />
      <AllocationValueCell label="Total" value={formatCurrencyValue(quantityValue * rowPricePerUnit)} />
      <AllocationValueCell label="Method" value={allocation.method} />
      <AllocationCell label="Notes">
        <input
          value={allocation.notes}
          placeholder="Notes"
          onChange={(event) => onAllocationFieldChange(allocation.id, "notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
      </AllocationCell>
      <AllocationCell label="Save">
        <SaveRowButton onClick={() => void onSaveAllocation(allocation)} disabled={savingAllocationId === allocation.id}>
          {savingAllocationId === allocation.id ? "Saving..." : "Save"}
        </SaveRowButton>
      </AllocationCell>
      <AllocationCell label="Delete">
        <DeleteRowButton onClick={() => onDeleteAllocation(allocation.id)} disabled={deletingAllocationId === allocation.id}>
          {deletingAllocationId === allocation.id ? "Deleting..." : "Delete"}
        </DeleteRowButton>
      </AllocationCell>
    </AllocationRowShell>
  )
}

export function MaterialAllocationsEditor({
  allocations,
  draft,
  allocationOptions,
  loadingOptions,
  adding,
  savingAllocationId,
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
  savingAllocationId: string | null
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

  return (
    <div className="space-y-3">
      {allocations.map((allocation) => {
        return (
          <AllocationEditorRow
            key={allocation.id}
            allocation={allocation}
            allocationOptions={allocationOptions}
            savingAllocationId={savingAllocationId}
            deletingAllocationId={deletingAllocationId}
            rowErrors={itemErrors[allocation.id]}
            onAllocationFieldChange={onAllocationFieldChange}
            onSaveAllocation={onSaveAllocation}
            onDeleteAllocation={onDeleteAllocation}
          />
        )
      })}

      {!addRow.isOpen ? (
        <div className="pt-1">
          <InlineAddRowButton label="Add allocation" onClick={addRow.open} />
        </div>
      ) : null}

      {addRow.isOpen ? (
        <AllocationRowShell className={hasFieldErrors(draftErrors) ? "bg-rose-500/[0.05]" : undefined}>
          <AllocationCell label="Inventory">
            <div className="space-y-1">
              <select
                value={draft.inventoryId}
                onChange={(event) => onDraftChange("inventoryId", event.target.value)}
                className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.inventoryId))}
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
                className={getFieldControlClassName("w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.quantity))}
              />
              {draftErrors.quantity ? <FieldErrorText>{draftErrors.quantity}</FieldErrorText> : null}
            </div>
          </AllocationCell>
          <AllocationCell label="Cut Size">
            <input
              value={draft.cutSize}
              placeholder="Cut Size"
              onChange={(event) => onDraftChange("cutSize", event.target.value)}
              className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
            />
          </AllocationCell>
          <AllocationValueCell label="Unit Cost" value={formatCurrencyValue(readPricePerUnit(allocationOptions, draft.inventoryId))} />
          <AllocationValueCell
            label="Total"
            value={formatCurrencyValue(Number(draft.quantity || 0) * readPricePerUnit(allocationOptions, draft.inventoryId))}
          />
          <AllocationValueCell label="Method" value="MANUAL" />
          <AllocationCell label="Notes">
            <input
              value={draft.notes}
              placeholder="Notes"
              onChange={(event) => onDraftChange("notes", event.target.value)}
              className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
            />
          </AllocationCell>
          <AllocationCell label="Save" />
          <AllocationCell label="Add">
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={adding || loadingOptions}
              className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
            >
              {loadingOptions ? "Loading..." : adding ? "Adding..." : "Add"}
            </button>
          </AllocationCell>
        </AllocationRowShell>
      ) : null}
    </div>
  )
}
