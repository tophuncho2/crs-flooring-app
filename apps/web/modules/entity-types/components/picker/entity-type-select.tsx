"use client"

import { useCallback, useMemo, useState } from "react"
import type { EntityTypeOption, EntityTypeRef } from "@builders/domain"
import { CellChip } from "@/engines/common"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
import {
  ENTITY_TYPE_OPTIONS_QUERY_KEY,
  searchEntityTypeOptionsRequest,
} from "@/modules/entity-types/data/entity-types-options-request"

function toDropdownOption(option: EntityTypeOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.type }
}

/**
 * The entity-type **single-select** — the standard `AsyncOptionPicker` sibling of
 * the module entity pickers, wired to `/api/entity-types/options`. An entity
 * carries at most one type (a direct FK), so this replaced the former array
 * `EntityTypeMultiSelect` at every per-entity assignment/display seam.
 *
 * Selection is id-driven: the parent stores `string | null` and this owns a small
 * id→ref cache (seeded from `seedRef`, topped up on pick) so the colored-chip
 * trigger keeps its label/color even when the picked type isn't in the latest
 * server page (honoring the picker label contract).
 *
 * Read-only mode (`editable={false}`) renders one {@link CellChip} — the linked
 * entity's type — with a muted dash when unassigned.
 */
export function EntityTypeSelect({
  value,
  seedRef,
  editable,
  onChange,
  placeholder = "Select a type",
  searchPlaceholder = "Search types",
  emptyMessage = "No matches",
  clearLabel = "Clear type",
  ariaLabel = "Entity type",
  className,
}: {
  value: string | null
  /** The known ref for the current value — seeds the trigger label + read-only chip. */
  seedRef?: EntityTypeRef | null
  editable: boolean
  onChange?: (nextId: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  clearLabel?: string
  ariaLabel?: string
  className?: string
}) {
  // id → ref cache for the trigger label/color. Seeded from the known ref and
  // topped up whenever the user picks an option (the option carries its ref).
  const [picked, setPicked] = useState<EntityTypeRef | null>(seedRef ?? null)

  // Resolve the ref for the CURRENT value: a fresh `seedRef` (parent re-seed, e.g.
  // a re-selected entity) wins, else the just-picked ref. Null when unmatched.
  const ref = useMemo<EntityTypeRef | null>(() => {
    if (!value) return null
    if (seedRef && seedRef.id === value) return seedRef
    if (picked && picked.id === value) return picked
    return null
  }, [value, seedRef, picked])

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchEntityTypeOptionsRequest(search, signal, { skip }),
    [],
  )

  const handleOptionSelected = useCallback((option: EntityTypeOption | null) => {
    setPicked(
      option ? { id: option.id, type: option.type, color: option.color } : null,
    )
  }, [])

  if (!editable) {
    if (!ref) {
      return <span className="text-sm text-[var(--foreground)]/45">—</span>
    }
    return <CellChip paletteColor={ref.color}>{ref.type}</CellChip>
  }

  return (
    <AsyncOptionPicker<EntityTypeOption>
      value={value}
      onChange={onChange ?? (() => {})}
      onOptionSelected={handleOptionSelected}
      selectedLabel={ref?.type ?? null}
      selectedColor={ref?.color ?? null}
      bucketKey={ENTITY_TYPE_OPTIONS_QUERY_KEY}
      pagedSearchFn={pagedSearchFn}
      toOption={toDropdownOption}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      clearLabel={clearLabel}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
