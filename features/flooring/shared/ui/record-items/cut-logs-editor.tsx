"use client"

import { formatStableDateTime } from "@/features/flooring/shared/domain/date-format"
import { CollapsibleTableSection, InlineAddRowButton, useInlineCreateRow } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { DeleteRowButton, SaveRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { ModalTableHead, ModalTableShell, TableEmptyRow, TableHeaderCell } from "@/features/flooring/shared/ui/table/table-shell"
import { CUT_LOGS_TABLE_MIN_WIDTH_CLASS, CUT_LOGS_WITH_ACTIONS_TABLE_MIN_WIDTH_CLASS } from "@/features/flooring/shared/ui/table/table-size-classes"

export type EditableCutLog = {
  id: string
  before: string
  cut: string
  after: string
  notes: string
  createdAt: string
}

export type CutLogDraft = {
  quantityTaken: string
  notes: string
}

function formatValue(value: string, unitLabel?: string) {
  if (!unitLabel) return value
  return `${value} ${unitLabel}`
}

export function CutLogsEditor({
  title = "Cut Logs",
  items,
  draft,
  beforePreview,
  afterPreview,
  unitLabel,
  loading = false,
  adding = false,
  deletingItemId = null,
  onDraftChange,
  onAdd,
  onDeleteItem,
  canSubmit = true,
  submitLabel = "Add",
  emptyMessage = "",
  readOnly = false,
}: {
  title?: string
  items: EditableCutLog[]
  draft?: CutLogDraft
  beforePreview?: string
  afterPreview?: string
  unitLabel?: string
  loading?: boolean
  adding?: boolean
  deletingItemId?: string | null
  onDraftChange?: (field: keyof CutLogDraft, value: string) => void
  onAdd?: () => void | Promise<void>
  onDeleteItem?: (itemId: string) => void
  canSubmit?: boolean
  submitLabel?: string
  emptyMessage?: string
  readOnly?: boolean
}) {
  const addRow = useInlineCreateRow(false)
  const showDelete = !readOnly && Boolean(onDeleteItem)
  const colSpan = showDelete ? 6 : 5

  async function handleAdd() {
    if (!onAdd) return
    await onAdd()
    addRow.close()
  }

  return (
    <CollapsibleTableSection title={title}>
      <ModalTableShell minWidthClass={showDelete ? CUT_LOGS_WITH_ACTIONS_TABLE_MIN_WIDTH_CLASS : CUT_LOGS_TABLE_MIN_WIDTH_CLASS}>
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Before</TableHeaderCell>
            <TableHeaderCell>Cut</TableHeaderCell>
            <TableHeaderCell>After</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
            {showDelete ? <TableHeaderCell>Delete</TableHeaderCell> : null}
          </tr>
        </ModalTableHead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                Loading cut logs...
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--panel-border)]">
                <td className="px-3 py-2">{formatStableDateTime(item.createdAt)}</td>
                <td className="px-3 py-2">{formatValue(item.before, unitLabel)}</td>
                <td className="px-3 py-2">{formatValue(item.cut, unitLabel)}</td>
                <td className="px-3 py-2">{formatValue(item.after, unitLabel)}</td>
                <td className="px-3 py-2">{item.notes || "-"}</td>
                {showDelete ? (
                  <td className="px-3 py-2">
                    <DeleteRowButton onClick={() => onDeleteItem?.(item.id)} disabled={deletingItemId === item.id}>
                      {deletingItemId === item.id ? "Deleting..." : "Delete"}
                    </DeleteRowButton>
                  </td>
                ) : null}
              </tr>
            ))
          )}
          {!loading && !readOnly && !addRow.isOpen ? (
            <tr className="border-t border-[var(--panel-border)]">
              <td colSpan={colSpan} className="px-3 py-3">
                <InlineAddRowButton label="Add Cut Log" onClick={addRow.open} />
              </td>
            </tr>
          ) : null}
          {!loading && !readOnly && addRow.isOpen && draft ? (
            <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/20">
              <td className="px-3 py-2 text-[var(--foreground)]/70">New</td>
              <td className="px-3 py-2 font-medium">{formatValue(beforePreview ?? "0.00", unitLabel)}</td>
              <td className="px-3 py-2">
                <input
                  value={draft.quantityTaken}
                  onChange={(event) => onDraftChange?.("quantityTaken", event.target.value)}
                  placeholder="0.00"
                  className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2 font-medium">{formatValue(afterPreview ?? beforePreview ?? "0.00", unitLabel)}</td>
              <td className="px-3 py-2">
                <input
                  value={draft.notes}
                  onChange={(event) => onDraftChange?.("notes", event.target.value)}
                  className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              {showDelete ? (
                <td className="px-3 py-2">
                  <SaveRowButton onClick={() => void handleAdd()} disabled={adding || !canSubmit}>
                    {adding ? "Adding..." : submitLabel}
                  </SaveRowButton>
                </td>
              ) : null}
            </tr>
          ) : null}
          {!loading && items.length === 0 && emptyMessage && (readOnly || !addRow.isOpen) ? <TableEmptyRow message={emptyMessage} colSpan={colSpan} /> : null}
        </tbody>
      </ModalTableShell>
    </CollapsibleTableSection>
  )
}
