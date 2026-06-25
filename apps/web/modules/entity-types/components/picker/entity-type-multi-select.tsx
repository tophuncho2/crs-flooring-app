"use client"

import { useState } from "react"
import type { EntityTypeOption, EntityTypeRef } from "@builders/domain"
import { AnchoredPanel } from "@/engines/common"
import { PickerList, PickerTrigger } from "@/engines/picker"
import { EntityTypeChips } from "./entity-type-chips"
import {
  toEntityTypePickerOption,
  useEntityTypeMultiSelect,
} from "./use-entity-type-multi-select"

/**
 * The entity-type **array** picker — the multi-select sibling of the standard
 * single-select pickers. Selected types render as removable palette chips; the
 * "+ Add type" trigger opens an {@link AnchoredPanel} whose {@link PickerList}
 * offers the *unlinked* entity-types (already-linked ids are filtered out so the
 * list only ever shows additions). Selecting a row links it and keeps the panel
 * open (multi-pick); a chip's ✕ de-links.
 *
 * Selection is id-driven (the parent stores `string[]`); the pick/remove/label
 * machinery is the shared {@link useEntityTypeMultiSelect} hook, reused by the
 * combo picker's type side.
 *
 * Read-only mode (`editable={false}`) renders chips only — no trigger, no ✕.
 */
export function EntityTypeMultiSelect({
  selectedIds,
  seedRefs,
  editable,
  onChange,
}: {
  selectedIds: string[]
  /** Refs known up front (the record's current types) for chip labels. */
  seedRefs: EntityTypeRef[]
  editable: boolean
  onChange?: (nextIds: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  // The picker's search input portals into this header slot so it stays pinned
  // above the scrolling option list (mirrors ProductCategoryPicker).
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null)

  const { addController, handleSelect, handleRemove, chips } = useEntityTypeMultiSelect({
    selectedIds,
    seedRefs,
    onChange,
    enabled: open,
  })

  return (
    <div className="flex flex-col gap-2">
      <EntityTypeChips chips={chips} editable={editable} onRemove={handleRemove} />

      {editable ? (
        <AnchoredPanel
          trigger={
            <PickerTrigger
              expanded={open}
              onToggle={() => setOpen((previous) => !previous)}
              selectedLabel={null}
              placeholder="Add type"
              ariaLabel="Add entity type"
            />
          }
          open={open}
          onClose={() => setOpen(false)}
          stickyHeader={<div ref={setSearchSlot} />}
        >
          {searchSlot === null ? null : (
            <PickerList<EntityTypeOption>
              controller={addController}
              toOption={toEntityTypePickerOption}
              selectedId={null}
              selectedLabel={null}
              onSelect={handleSelect}
              onClear={() => {}}
              onCancel={() => setOpen(false)}
              searchPlaceholder="Search types"
              emptyMessage="No more types"
              searchPortalTarget={searchSlot}
            />
          )}
        </AnchoredPanel>
      ) : null}
    </div>
  )
}
