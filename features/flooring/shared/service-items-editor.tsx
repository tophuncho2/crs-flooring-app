"use client"

import { Plus } from "lucide-react"
import { DeleteRowButton, SaveRowButton } from "./row-action-buttons"
import { CollapsibleTableSection, useInlineCreateRow } from "./collapsible-table-section"
import { formatLineTotal } from "./line-totals"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "./table-shell"

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
  onDraftChange: (field: keyof ServiceItemDraft, value: string) => void
  onAdd: () => void
  onItemFieldChange: (itemId: string, field: keyof EditableServiceItem, value: string) => void
  onSaveItem?: (item: EditableServiceItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const colSpan = onSaveItem ? 8 : 7
  const addRow = useInlineCreateRow(false)

  async function handleAdd() {
    await onAdd()
    addRow.close()
  }

  return (
    <CollapsibleTableSection title={title} description={description}>
      <ModalTableShell minWidthClass="min-w-[1200px]">
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
              <tr key={item.id} className="border-t border-[var(--panel-border)]">
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
                  <input value={item.name} onChange={(event) => onItemFieldChange(item.id, "name", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={item.unitId}
                    onChange={(event) => {
                      const nextUnitId = event.target.value
                      const selected = unitOptions.find((unit) => unit.id === nextUnitId)
                      onItemFieldChange(item.id, "unitId", nextUnitId)
                      onItemFieldChange(item.id, "unitName", selected?.name ?? "")
                    }}
                    className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  >
                    <option value="">Select unit</option>
                    {unitOptions.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input value={item.quantity} onChange={(event) => onItemFieldChange(item.id, "quantity", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
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
                <button
                  type="button"
                  onClick={addRow.open}
                  aria-label={`Add ${title}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
                >
                  <Plus size={16} />
                </button>
              </td>
            </tr>
          ) : null}
          {addRow.isOpen ? (
            <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/20">
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
                <input value={draft.name} onChange={(event) => onDraftChange("name", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
              </td>
              <td className="px-3 py-2">
                <select value={draft.unitId} onChange={(event) => onDraftChange("unitId", event.target.value)} className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                  <option value="">Select unit</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <input value={draft.quantity} onChange={(event) => onDraftChange("quantity", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
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
