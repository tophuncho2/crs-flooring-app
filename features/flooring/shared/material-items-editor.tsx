"use client"

import { DeleteRowButton, SaveRowButton } from "./row-action-buttons"
import { RecordFormField } from "./record-form"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "./table-shell"

export type MaterialItemOption = {
  id: string
  label: string
  sendUnit: string
}

export type EditableMaterialItem = {
  id: string
  productId: string
  productName: string
  sendUnit: string
  quantity: string
  unitPrice: string
  notes: string
  extraValue?: string
}

export type MaterialItemDraft = {
  productId: string
  quantity: string
  unitPrice: string
  notes: string
  extraValue?: string
}

export function MaterialItemsEditor({
  title,
  description,
  items,
  draft,
  productOptions,
  loading,
  adding,
  savingItemId,
  deletingItemId,
  extraFieldLabel,
  onDraftChange,
  onAdd,
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
}: {
  title: string
  description: string
  items: EditableMaterialItem[]
  draft: MaterialItemDraft
  productOptions: MaterialItemOption[]
  loading: boolean
  adding: boolean
  savingItemId: string | null
  deletingItemId: string | null
  extraFieldLabel?: string
  onDraftChange: (field: keyof MaterialItemDraft, value: string) => void
  onAdd: () => void
  onItemFieldChange: (itemId: string, field: keyof EditableMaterialItem, value: string) => void
  onSaveItem?: (item: EditableMaterialItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const colSpan = onSaveItem ? 8 : 7

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-[var(--foreground)]/70">{description}</p>
      </div>

      <div className={`grid gap-3 rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] ${extraFieldLabel ? "md:grid-cols-[minmax(0,1.5fr),120px,120px,160px,minmax(0,1fr),auto]" : "md:grid-cols-[minmax(0,1.5fr),120px,120px,minmax(0,1fr),auto]"} md:items-end`}>
        <RecordFormField label="Product">
          <select value={draft.productId} onChange={(event) => onDraftChange("productId", event.target.value)} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2">
            <option value="">Select product</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>{product.label}</option>
            ))}
          </select>
        </RecordFormField>
        <RecordFormField label="Qty">
          <input value={draft.quantity} onChange={(event) => onDraftChange("quantity", event.target.value)} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
        </RecordFormField>
        <RecordFormField label="Unit Price">
          <input value={draft.unitPrice} onChange={(event) => onDraftChange("unitPrice", event.target.value)} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
        </RecordFormField>
        {extraFieldLabel ? (
          <RecordFormField label={extraFieldLabel}>
            <input value={draft.extraValue ?? ""} onChange={(event) => onDraftChange("extraValue", event.target.value)} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
          </RecordFormField>
        ) : null}
        <RecordFormField label="Notes">
          <input value={draft.notes} onChange={(event) => onDraftChange("notes", event.target.value)} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
        </RecordFormField>
        <button type="button" onClick={onAdd} disabled={adding} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">
          {adding ? "Adding..." : "Add Item"}
        </button>
      </div>

      <ModalTableShell minWidthClass="min-w-[980px]">
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Qty</TableHeaderCell>
            <TableHeaderCell>Unit</TableHeaderCell>
            <TableHeaderCell>Unit Price</TableHeaderCell>
            {extraFieldLabel ? <TableHeaderCell>{extraFieldLabel}</TableHeaderCell> : null}
            <TableHeaderCell>Notes</TableHeaderCell>
            {onSaveItem ? <TableHeaderCell>Save</TableHeaderCell> : null}
            <TableHeaderCell>Delete</TableHeaderCell>
          </tr>
        </ModalTableHead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading items...</td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-[var(--foreground)]/70">No items yet.</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--panel-border)]">
                <td className="px-3 py-2">
                  <select value={item.productId} onChange={(event) => onItemFieldChange(item.id, "productId", event.target.value)} className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>{product.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input value={item.quantity} onChange={(event) => onItemFieldChange(item.id, "quantity", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                </td>
                <td className="px-3 py-2">{productOptions.find((product) => product.id === item.productId)?.sendUnit || item.sendUnit || "-"}</td>
                <td className="px-3 py-2">
                  <input value={item.unitPrice} onChange={(event) => onItemFieldChange(item.id, "unitPrice", event.target.value)} className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                </td>
                {extraFieldLabel ? (
                  <td className="px-3 py-2">
                    <input value={item.extraValue ?? ""} onChange={(event) => onItemFieldChange(item.id, "extraValue", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                  </td>
                ) : null}
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
        </tbody>
      </ModalTableShell>
    </div>
  )
}
