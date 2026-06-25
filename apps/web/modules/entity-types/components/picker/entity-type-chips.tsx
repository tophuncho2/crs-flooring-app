"use client"

import { X } from "lucide-react"
import { CellChip } from "@/engines/common"
import type { EntityTypeChip } from "./use-entity-type-multi-select"

/**
 * Renders selected entity-types as palette chips. In `editable` mode each chip
 * carries a ✕ that de-links it; otherwise it's read-only. The empty state shows
 * a muted dash in read-only mode and nothing while editing (the add trigger
 * stands in). Shared by the standalone multi-select and the combo picker.
 */
export function EntityTypeChips({
  chips,
  editable,
  onRemove,
}: {
  chips: EntityTypeChip[]
  editable: boolean
  onRemove?: (id: string) => void
}) {
  if (chips.length === 0) {
    return (
      <span className="text-sm text-[var(--foreground)]/45">{editable ? "" : "—"}</span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span key={chip.id} className="inline-flex items-center gap-1">
          <CellChip paletteColor={chip.color}>{chip.label}</CellChip>
          {editable ? (
            <button
              type="button"
              onClick={() => onRemove?.(chip.id)}
              aria-label={`Remove ${chip.label}`}
              className="rounded-full p-0.5 text-[var(--foreground)]/55 hover:text-[var(--foreground)]"
            >
              <X size={12} />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  )
}
