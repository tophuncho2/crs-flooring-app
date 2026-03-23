"use client"

import { DeleteRowButton, SaveRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { CollapsibleTableSection, InlineAddRowButton, useInlineCreateRow } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { formatCurrencyValue } from "@/features/flooring/shared/domain/line-totals"
import { FieldErrorText, getFieldControlClassName, hasFieldErrors, type FieldErrorMap, type RowFieldErrors } from "./record-field-errors"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "@/features/flooring/shared/ui/table/table-shell"
import { SALES_REP_ITEMS_TABLE_MIN_WIDTH_CLASS } from "@/features/flooring/shared/ui/table/table-size-classes"

export type SalesRepOption = {
  id: string
  name: string
}

export type EditableSalesRepItem = {
  id: string
  contactId: string
  contactName: string
  percent: string
}

export type SalesRepDraft = {
  contactId: string
  percent: string
}

export type SalesRepField = "contactId" | "percent"
export type SalesRepFieldErrors = FieldErrorMap<SalesRepField>

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateSalesRepAmount(customerCost: number, percent: string) {
  return customerCost * (toNumber(percent) / 100)
}

export function validateSalesRepFields(value: Pick<SalesRepDraft, "contactId" | "percent">) {
  const errors: SalesRepFieldErrors = {}

  if (!value.contactId.trim()) {
    errors.contactId = "Select a sales rep."
  }

  if (!value.percent.trim()) {
    errors.percent = "Enter a percent."
  } else {
    const percent = Number(value.percent)
    if (!Number.isFinite(percent)) {
      errors.percent = "Enter a valid percent."
    } else if (percent < 0 || percent > 100) {
      errors.percent = "Percent must be between 0 and 100."
    }
  }

  return errors
}

export function SalesRepItemsEditor({
  title,
  description,
  items,
  draft,
  salesRepOptions,
  customerCost,
  loading,
  adding,
  savingItemId,
  deletingItemId,
  draftErrors = {},
  itemErrors = {},
  onDraftChange,
  onAdd,
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
}: {
  title: string
  description: string
  items: EditableSalesRepItem[]
  draft: SalesRepDraft
  salesRepOptions: SalesRepOption[]
  customerCost: number
  loading: boolean
  adding: boolean
  savingItemId: string | null
  deletingItemId: string | null
  draftErrors?: SalesRepFieldErrors
  itemErrors?: RowFieldErrors<SalesRepField>
  onDraftChange: (field: keyof SalesRepDraft, value: string) => void
  onAdd: () => Promise<boolean> | boolean
  onItemFieldChange: (itemId: string, field: keyof EditableSalesRepItem, value: string) => void
  onSaveItem: (item: EditableSalesRepItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const addRow = useInlineCreateRow(false)

  async function handleAdd() {
    const didAdd = await onAdd()
    if (didAdd !== false) {
      addRow.close()
    }
  }

  return (
    <CollapsibleTableSection title={title} description={description}>
      <ModalTableShell minWidthClass={SALES_REP_ITEMS_TABLE_MIN_WIDTH_CLASS}>
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Sales Rep</TableHeaderCell>
            <TableHeaderCell>Percent</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell>Save</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </tr>
        </ModalTableHead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading sales reps...</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className={`border-t border-[var(--panel-border)] ${hasFieldErrors(itemErrors[item.id]) ? "bg-rose-500/[0.04]" : ""}`}>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <select
                      value={item.contactId}
                      onChange={(event) => {
                        const nextContactId = event.target.value
                        const selected = salesRepOptions.find((option) => option.id === nextContactId)
                        onItemFieldChange(item.id, "contactId", nextContactId)
                        onItemFieldChange(item.id, "contactName", selected?.name ?? "")
                      }}
                      className={getFieldControlClassName("w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(itemErrors[item.id]?.contactId))}
                    >
                      <option value="">Select sales rep</option>
                      {salesRepOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                    {itemErrors[item.id]?.contactId ? <FieldErrorText>{itemErrors[item.id]?.contactId}</FieldErrorText> : null}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <div className={getFieldControlClassName("flex w-28 items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1", Boolean(itemErrors[item.id]?.percent))}>
                      <input value={item.percent} onChange={(event) => onItemFieldChange(item.id, "percent", event.target.value)} className="w-full bg-transparent outline-none" />
                      <span className="text-[var(--foreground)]/60">%</span>
                    </div>
                    {itemErrors[item.id]?.percent ? <FieldErrorText>{itemErrors[item.id]?.percent}</FieldErrorText> : null}
                  </div>
                </td>
                <td className="px-3 py-2 font-medium">{formatCurrencyValue(calculateSalesRepAmount(customerCost, item.percent))}</td>
                <td className="px-3 py-2">
                  <SaveRowButton onClick={() => onSaveItem(item)} disabled={savingItemId === item.id}>
                    {savingItemId === item.id ? "Saving..." : "Save"}
                  </SaveRowButton>
                </td>
                <td className="px-3 py-2">
                  <DeleteRowButton onClick={() => onDeleteItem(item.id)} disabled={deletingItemId === item.id}>
                    {deletingItemId === item.id ? "Deleting..." : "Delete"}
                  </DeleteRowButton>
                </td>
              </tr>
            ))
          )}
          {!loading && !addRow.isOpen ? (
            <tr className="border-t border-[var(--panel-border)]">
              <td colSpan={5} className="px-3 py-3">
                <InlineAddRowButton label={`Add ${title}`} onClick={addRow.open} />
              </td>
            </tr>
          ) : null}
          {addRow.isOpen ? (
            <tr className={`border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/20 ${hasFieldErrors(draftErrors) ? "bg-rose-500/[0.05]" : ""}`}>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <select
                    value={draft.contactId}
                    onChange={(event) => onDraftChange("contactId", event.target.value)}
                    className={getFieldControlClassName("w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.contactId))}
                  >
                    <option value="">Select sales rep</option>
                    {salesRepOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  {draftErrors.contactId ? <FieldErrorText>{draftErrors.contactId}</FieldErrorText> : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <div className={getFieldControlClassName("flex w-28 items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1", Boolean(draftErrors.percent))}>
                    <input value={draft.percent} onChange={(event) => onDraftChange("percent", event.target.value)} className="w-full bg-transparent outline-none" />
                    <span className="text-[var(--foreground)]/60">%</span>
                  </div>
                  {draftErrors.percent ? <FieldErrorText>{draftErrors.percent}</FieldErrorText> : null}
                </div>
              </td>
              <td className="px-3 py-2 font-medium">{formatCurrencyValue(calculateSalesRepAmount(customerCost, draft.percent))}</td>
              <td className="px-3 py-2">
                <SaveRowButton onClick={() => void handleAdd()} disabled={adding}>
                  {adding ? "Adding..." : "Add"}
                </SaveRowButton>
              </td>
              <td className="px-3 py-2">
                <DeleteRowButton onClick={addRow.close} disabled={adding}>Cancel</DeleteRowButton>
              </td>
            </tr>
          ) : null}
        </tbody>
      </ModalTableShell>
    </CollapsibleTableSection>
  )
}
