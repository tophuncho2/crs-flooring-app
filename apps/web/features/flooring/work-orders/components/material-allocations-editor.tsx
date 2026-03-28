"use client"

import { formatCurrencyValue } from "@/features/flooring/shared/domain/line-totals"
import { isEditableDecimalInput, normalizeEditableDecimalInput } from "@/features/flooring/shared/domain/child-item-validation"
import { DeleteRowButton, SaveRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { InlineAddRowButton, useInlineCreateRow } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { ModalTableHead, RecordChildTableShell } from "@/features/flooring/shared/line-items/record-child-table-section"
import { TableHeaderCell } from "@/features/dashboard/shared/table/table-shell"
import { FieldErrorText, getFieldControlClassName, hasFieldErrors, type FieldErrorMap, type RowFieldErrors } from "@/features/flooring/shared/line-items/record-field-errors"
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

function readPricePerUnit(options: InventoryAllocationOption[], inventoryId: string) {
  return options.find((option) => option.id === inventoryId)?.pricePerUnit ?? 0
}

function readInventoryLabel(options: InventoryAllocationOption[], inventoryId: string) {
  return options.find((option) => option.id === inventoryId)?.label ?? ""
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function allocationCellClassName(columnIndex: number, className?: string) {
  return joinClasses(
    "px-2 py-2 align-top",
    columnIndex > 0 && "border-l border-[var(--panel-border)]",
    className,
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
  onSaveAllocation: (allocation: WorkOrderItemAllocationRow) => void
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
      <RecordChildTableShell minWidthClass="min-w-[64rem]" bleedVariant="none" surface="plain">
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Inventory</TableHeaderCell>
            <TableHeaderCell>Qty</TableHeaderCell>
            <TableHeaderCell>Cut Size</TableHeaderCell>
            <TableHeaderCell>Unit Cost</TableHeaderCell>
            <TableHeaderCell>Total Cost</TableHeaderCell>
            <TableHeaderCell>Method</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
            <TableHeaderCell>Save</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </tr>
        </ModalTableHead>
        <tbody>
          {allocations.map((allocation) => {
            const rowPricePerUnit = readPricePerUnit(allocationOptions, allocation.inventoryId) || Number(allocation.unitCost)
            const quantityValue = Number(allocation.quantity || 0)
            return (
              <tr
                key={allocation.id}
                className={`border-t border-[var(--panel-border)] ${hasFieldErrors(itemErrors[allocation.id]) ? "bg-rose-500/[0.04]" : ""}`}
              >
                <td className={allocationCellClassName(0)}>
                  <div className="space-y-1">
                    <select
                      value={allocation.inventoryId}
                      onChange={(event) => onAllocationFieldChange(allocation.id, "inventoryId", event.target.value)}
                      className={getFieldControlClassName("w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(itemErrors[allocation.id]?.inventoryId))}
                    >
                      <option value="">Select inventory</option>
                      {allocationOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {itemErrors[allocation.id]?.inventoryId ? <FieldErrorText>{itemErrors[allocation.id]?.inventoryId}</FieldErrorText> : null}
                  </div>
                </td>
                <td className={allocationCellClassName(1)}>
                  <div className="space-y-1">
                    <input
                      value={allocation.quantity}
                      inputMode="decimal"
                      spellCheck={false}
                      onChange={(event) => onAllocationFieldChange(allocation.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
                      className={getFieldControlClassName("w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(itemErrors[allocation.id]?.quantity))}
                    />
                    {itemErrors[allocation.id]?.quantity ? <FieldErrorText>{itemErrors[allocation.id]?.quantity}</FieldErrorText> : null}
                  </div>
                </td>
                <td className={allocationCellClassName(2)}>
                  <input
                    value={allocation.cutSize}
                    onChange={(event) => onAllocationFieldChange(allocation.id, "cutSize", event.target.value)}
                    className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  />
                </td>
                <td className={allocationCellClassName(3, "whitespace-nowrap")}>{formatCurrencyValue(rowPricePerUnit)}</td>
                <td className={allocationCellClassName(4, "whitespace-nowrap")}>{formatCurrencyValue(quantityValue * rowPricePerUnit)}</td>
                <td className={allocationCellClassName(5, "text-sm")}>{allocation.method}</td>
                <td className={allocationCellClassName(6)}>
                  <input
                    value={allocation.notes}
                    onChange={(event) => onAllocationFieldChange(allocation.id, "notes", event.target.value)}
                    className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  />
                </td>
                <td className={allocationCellClassName(7)}>
                  <SaveRowButton onClick={() => onSaveAllocation(allocation)} disabled={savingAllocationId === allocation.id}>
                    {savingAllocationId === allocation.id ? "Saving..." : "Save"}
                  </SaveRowButton>
                </td>
                <td className={allocationCellClassName(8)}>
                  <DeleteRowButton onClick={() => onDeleteAllocation(allocation.id)} disabled={deletingAllocationId === allocation.id}>
                    {deletingAllocationId === allocation.id ? "Deleting..." : "Delete"}
                  </DeleteRowButton>
                </td>
              </tr>
            )
          })}

          {!addRow.isOpen ? (
            <tr className="border-t border-[var(--panel-border)]">
              <td colSpan={9} className="px-2 py-3">
                <InlineAddRowButton label="Add allocation" onClick={addRow.open} />
              </td>
            </tr>
          ) : null}

          {addRow.isOpen ? (
            <tr className={`border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/20 ${hasFieldErrors(draftErrors) ? "bg-rose-500/[0.05]" : ""}`}>
              <td className={allocationCellClassName(0)}>
                <div className="space-y-1">
                  <select
                    value={draft.inventoryId}
                    onChange={(event) => onDraftChange("inventoryId", event.target.value)}
                    className={getFieldControlClassName("w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.inventoryId))}
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
              </td>
              <td className={allocationCellClassName(1)}>
                <div className="space-y-1">
                  <input
                    value={draft.quantity}
                    inputMode="decimal"
                    spellCheck={false}
                    onChange={(event) => onDraftChange("quantity", normalizeEditableDecimalInput(event.target.value))}
                    className={getFieldControlClassName("w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.quantity))}
                  />
                  {draftErrors.quantity ? <FieldErrorText>{draftErrors.quantity}</FieldErrorText> : null}
                </div>
              </td>
              <td className={allocationCellClassName(2)}>
                <input
                  value={draft.cutSize}
                  onChange={(event) => onDraftChange("cutSize", event.target.value)}
                  className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className={allocationCellClassName(3, "whitespace-nowrap")}>{formatCurrencyValue(readPricePerUnit(allocationOptions, draft.inventoryId))}</td>
              <td className={allocationCellClassName(4, "whitespace-nowrap")}>
                {formatCurrencyValue(Number(draft.quantity || 0) * readPricePerUnit(allocationOptions, draft.inventoryId))}
              </td>
              <td className={allocationCellClassName(5, "text-sm")}>MANUAL</td>
              <td className={allocationCellClassName(6)}>
                <input
                  value={draft.notes}
                  onChange={(event) => onDraftChange("notes", event.target.value)}
                  className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className={allocationCellClassName(7)} />
              <td className={allocationCellClassName(8)}>
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={adding || loadingOptions}
                  className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
                >
                  {loadingOptions ? "Loading..." : adding ? "Adding..." : "Add"}
                </button>
              </td>
            </tr>
          ) : null}
        </tbody>
      </RecordChildTableShell>

      {allocationOptions.length === 0 && !loadingOptions ? (
        <p className="text-sm text-[var(--foreground)]/60">
          No eligible inventory rows are currently available for this material item.
        </p>
      ) : null}
      {loadingOptions ? <p className="text-sm text-[var(--foreground)]/60">Loading inventory options...</p> : null}
      {!loadingOptions && draft.inventoryId ? (
        <p className="text-xs text-[var(--foreground)]/55">
          Selected inventory: {readInventoryLabel(allocationOptions, draft.inventoryId)}
        </p>
      ) : null}
    </div>
  )
}
