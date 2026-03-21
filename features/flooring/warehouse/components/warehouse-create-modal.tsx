"use client"

import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME } from "@/features/flooring/shared/accent-styles"
import { FormStatusNotices } from "@/features/flooring/shared/notices"
import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/record-form"
import type { WarehouseDraft } from "../types"

export function WarehouseCreateModal({
  draft,
  error,
  onClose,
  onFieldChange,
  onCreate,
}: {
  draft: WarehouseDraft
  error?: string
  onClose: () => void
  onFieldChange: (field: keyof WarehouseDraft, value: string) => void
  onCreate: () => void | Promise<void>
}) {
  return (
    <RecordModalShell title="Add Warehouse" onClose={onClose} sizeClass="max-w-3xl">
      <div className="space-y-4">
        <FormStatusNotices error={error} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <RecordFormField label="Warehouse Name">
            <input
              value={draft.name}
              onChange={(event) => onFieldChange("name", event.target.value)}
              placeholder="Warehouse"
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Store Phone">
            <input
              value={draft.phone}
              onChange={(event) => onFieldChange("phone", event.target.value)}
              placeholder="Store Phone"
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Address">
            <textarea
              value={draft.address}
              onChange={(event) => onFieldChange("address", event.target.value)}
              placeholder="Address"
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg border border-[var(--panel-border)] px-4 py-2 transition hover:bg-[var(--panel-hover)]"
          >
            Cancel
          </button>
          <button onClick={() => void onCreate()} type="button" className={FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME}>
            Create Warehouse
          </button>
        </div>
      </div>
    </RecordModalShell>
  )
}
