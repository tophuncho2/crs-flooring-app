"use client"

import { useCallback } from "react"
import type { EntityTypeOption, EntityTypeRef } from "@builders/domain"
import { CellChip } from "@/engines/common"
import { PickerList, type PickerListOption } from "@/engines/picker"
import {
  toEntityTypePickerOption,
  useEntityTypeMultiSelect,
} from "./use-entity-type-multi-select"

// The glow rail shows every type with its live color (no seeded chip labels), so
// the ref-cache seed is always empty.
const NO_SEED_REFS: EntityTypeRef[] = []

/**
 * The shared **glow rail** of entity types: every type rendered as its palette
 * chip in a scrolling `PickerList`, multi-select glow-toggle (click to add, click
 * a glowing one to remove). The single home of the type-rail UI, consumed by both
 * the combo picker's type side and the entities list-view Type filter, so the
 * rail logic + chip renderer live in exactly one place.
 *
 * Fills its parent box (the consumer owns the column width + height). Always
 * mounts only while its host popover is open, so the underlying options fetch is
 * unconditionally enabled.
 */
export function EntityTypeRail({
  selectedIds,
  onChange,
  onCancel,
}: {
  selectedIds: string[]
  onChange: (nextIds: string[]) => void
  /** Escape handler — collapse the host popover (combo panel / toolbar menu). */
  onCancel?: () => void
}) {
  const { controller, handleToggle } = useEntityTypeMultiSelect({
    selectedIds,
    seedRefs: NO_SEED_REFS,
    onChange,
    enabled: true,
  })

  // The type's canonical row = its palette chip (matches the chips shown for an
  // entity's types everywhere else). Selection glow is the row chrome's job
  // (`PickerList` owns it via `selectedIds`).
  const renderTypeOption = useCallback(
    (_option: PickerListOption, raw: EntityTypeOption) => (
      <CellChip paletteColor={raw.color ?? undefined}>{raw.type}</CellChip>
    ),
    [],
  )

  return (
    <PickerList<EntityTypeOption>
      controller={controller}
      toOption={toEntityTypePickerOption}
      selectedId={null}
      selectedLabel={null}
      selectedIds={selectedIds}
      onSelect={handleToggle}
      onClear={() => {}}
      onCancel={onCancel ?? (() => {})}
      renderOption={renderTypeOption}
      searchPlaceholder="Search types"
      emptyMessage="No types"
    />
  )
}
