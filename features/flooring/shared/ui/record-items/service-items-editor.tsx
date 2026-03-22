"use client"

import { DeleteRowButton, SaveRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { CollapsibleTableSection, InlineAddRowButton, useInlineCreateRow } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { formatLineTotal } from "@/features/flooring/shared/domain/line-totals"
import { FieldErrorText, getFieldControlClassName, hasFieldErrors, type FieldErrorMap, type RowFieldErrors } from "./record-field-errors"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "@/features/flooring/shared/ui/table/table-shell"
import { SERVICE_ITEMS_TABLE_MIN_WIDTH_CLASS } from "@/features/flooring/shared/ui/table/table-size-classes"

export type ServiceOption = {
  id: string
  name: string
  baseCost: string
  unitId: string
  unitName: string
}

export type UnitOption = {
  id: string
  name: string
}

export type EditableServiceItem = {
  id: string
  serviceId: string
  name: string
  unitId: string
  unitName: string
  quantity: string
  unitPrice: string
  notes: string
}

export type ServiceItemDraft = {
  serviceId: string
  name: string
  unitId: string
  quantity: string
  unitPrice: string
  notes: string
}

export type ServiceItemField = "name" | "unitId" | "quantity"
export type ServiceItemFieldErrors = FieldErrorMap<ServiceItemField>

export function validateServiceItemFields(value: Pick<ServiceItemDraft, "serviceId" | "name" | "unitId" | "quantity">) {
  const errors: ServiceItemFieldErrors = {}

  if (!value.serviceId.trim() && !value.name.trim()) {
    errors.name = "Enter a service name or select a service."
  }

  if (!value.unitId.trim()) {
    errors.unitId = "Select a unit."
  }

  if (!value.quantity.trim()) {
    errors.quantity = "Enter a quantity."
  } else if (Number(value.quantity) <= 0) {
    errors.quantity = "Enter a quantity greater than 0."
  }

  return errors
}

export function ServiceItemsEditor({
  title,
  description,
  items,
  draft,
  serviceOptions,
  unitOptions,
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
  items: EditableServiceItem[]
  draft: ServiceItemDraft
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  loading: boolean
  adding: boolean
  savingItemId: string | null
  deletingItemId: string | null
  draftErrors?: ServiceItemFieldErrors
  itemErrors?: RowFieldErrors<ServiceItemField>
  onDraftChange: (field: keyof ServiceItemDraft, value: string) => void
  onAdd: () => Promise<boolean> | boolean
  onItemFieldChange: (itemId: string, field: keyof EditableServiceItem, value: string) => void
  onSaveItem?: (item: EditableServiceItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const colSpan = onSaveItem ? 8 : 7
  const addRow = useInlineCreateRow(false)

  async function handleAdd() {
    const didAdd = await onAdd()
    if (didAdd !== false) {
      addRow.close()
    }
  }

  return (
    <CollapsibleTableSection title={title} description={description}>
      <ModalTableShell minWidthClass={SERVICE_ITEMS_TABLE_MIN_WIDTH_CLASS}>
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Service</TableHeaderCell>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Unit</TableHeaderCell>
            <TableHeaderCell>Qty</TableHeaderCell>
            <TableHeaderCell>Unit Price</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
            {onSaveItem ? <TableHeaderCell>Save</TableHeaderCell> : null}
            <TableHeaderCell>Delete</TableHeaderCell>
          </tr>
        </ModalTableHead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading services...</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className={`border-t border-[var(--panel-border)] ${hasFieldErrors(itemErrors[item.id]) ? "bg-rose-500/[0.04]" : ""}`}>
                <td className="px-3 py-2">
                  <select
                    value={item.serviceId}
                    onChange={(event) => {
                      const nextServiceId = event.target.value
                      const selected = serviceOptions.find((service) => service.id === nextServiceId)
                      onItemFieldChange(item.id, "serviceId", nextServiceId)
                      if (selected) {
                        onItemFieldChange(item.id, "name", selected.name)
                        onItemFieldChange(item.id, "unitId", selected.unitId)
                        onItemFieldChange(item.id, "unitName", selected.unitName)
                        onItemFieldChange(item.id, "unitPrice", selected.baseCost)
                      }
                    }}
                    className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  >
                    <option value="">Custom service</option>
                    {serviceOptions.map((service) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <input
                      value={item.name}
                      onChange={(event) => onItemFieldChange(item.id, "name", event.target.value)}
                      className={getFieldControlClassName("w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(itemErrors[item.id]?.name))}
                    />
                    {itemErrors[item.id]?.name ? <FieldErrorText>{itemErrors[item.id]?.name}</FieldErrorText> : null}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <select
                      value={item.unitId}
                      onChange={(event) => {
                        const nextUnitId = event.target.value
                        const selected = unitOptions.find((unit) => unit.id === nextUnitId)
                        onItemFieldChange(item.id, "unitId", nextUnitId)
                        onItemFieldChange(item.id, "unitName", selected?.name ?? "")
                      }}
                      className={getFieldControlClassName("w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(itemErrors[item.id]?.unitId))}
                    >
                      <option value="">Select unit</option>
                      {unitOptions.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                    {itemErrors[item.id]?.unitId ? <FieldErrorText>{itemErrors[item.id]?.unitId}</FieldErrorText> : null}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <input
                      value={item.quantity}
                      onChange={(event) => onItemFieldChange(item.id, "quantity", event.target.value)}
                      className={getFieldControlClassName("w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(itemErrors[item.id]?.quantity))}
                    />
                    {itemErrors[item.id]?.quantity ? <FieldErrorText>{itemErrors[item.id]?.quantity}</FieldErrorText> : null}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1">
                    <span className="text-[var(--foreground)]/60">$</span>
                    <input value={item.unitPrice} onChange={(event) => onItemFieldChange(item.id, "unitPrice", event.target.value)} className="w-20 bg-transparent outline-none" />
                    <span className="text-xs text-[var(--foreground)]/50">/ {item.unitName || "unit"}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium">{formatLineTotal(item)}</td>
                <td className="px-3 py-2">
                  <input value={item.notes} onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                </td>
                {onSaveItem ? (
                  <td className="px-3 py-2">
                    <SaveRowButton onClick={() => onSaveItem(item)} disabled={savingItemId === item.id}>
                      {savingItemId === item.id ? "Saving..." : "Save"}
                    </SaveRowButton>
                  </td>
                ) : null}
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
              <td colSpan={colSpan} className="px-3 py-3">
                <InlineAddRowButton label={`Add ${title}`} onClick={addRow.open} />
              </td>
            </tr>
          ) : null}
          {addRow.isOpen ? (
            <tr className={`border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/20 ${hasFieldErrors(draftErrors) ? "bg-rose-500/[0.05]" : ""}`}>
              <td className="px-3 py-2">
                <select
                  value={draft.serviceId}
                  onChange={(event) => {
                    const nextServiceId = event.target.value
                    const selected = serviceOptions.find((service) => service.id === nextServiceId)
                    onDraftChange("serviceId", nextServiceId)
                    if (selected) {
                      onDraftChange("name", selected.name)
                      onDraftChange("unitId", selected.unitId)
                      onDraftChange("unitPrice", selected.baseCost)
                    }
                  }}
                  className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                >
                  <option value="">Custom service</option>
                  {serviceOptions.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <input
                    value={draft.name}
                    onChange={(event) => onDraftChange("name", event.target.value)}
                    className={getFieldControlClassName("w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.name))}
                  />
                  {draftErrors.name ? <FieldErrorText>{draftErrors.name}</FieldErrorText> : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <select
                    value={draft.unitId}
                    onChange={(event) => onDraftChange("unitId", event.target.value)}
                    className={getFieldControlClassName("w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.unitId))}
                  >
                    <option value="">Select unit</option>
                    {unitOptions.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                  {draftErrors.unitId ? <FieldErrorText>{draftErrors.unitId}</FieldErrorText> : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="space-y-1">
                  <input
                    value={draft.quantity}
                    onChange={(event) => onDraftChange("quantity", event.target.value)}
                    className={getFieldControlClassName("w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1", Boolean(draftErrors.quantity))}
                  />
                  {draftErrors.quantity ? <FieldErrorText>{draftErrors.quantity}</FieldErrorText> : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1">
                  <span className="text-[var(--foreground)]/60">$</span>
                  <input value={draft.unitPrice} onChange={(event) => onDraftChange("unitPrice", event.target.value)} className="w-20 bg-transparent outline-none" />
                  <span className="text-xs text-[var(--foreground)]/50">/ {unitOptions.find((unit) => unit.id === draft.unitId)?.name || "unit"}</span>
                </div>
              </td>
              <td className="px-3 py-2 font-medium">{formatLineTotal(draft)}</td>
              <td className="px-3 py-2">
                <input value={draft.notes} onChange={(event) => onDraftChange("notes", event.target.value)} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
              </td>
              {onSaveItem ? <td className="px-3 py-2" /> : null}
              <td className="px-3 py-2">
                <button type="button" onClick={() => void handleAdd()} disabled={adding} className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">
                  {adding ? "Adding..." : "Add"}
                </button>
              </td>
            </tr>
          ) : null}
        </tbody>
      </ModalTableShell>
    </CollapsibleTableSection>
  )
}
