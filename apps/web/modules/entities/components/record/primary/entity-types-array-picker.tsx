"use client"

import { useCallback, useMemo, useState } from "react"
import { X } from "lucide-react"
import type { EntityTypeOption, EntityTypeRef } from "@builders/domain"
import { AnchoredPanel, CellChip } from "@/engines/common"
import {
  PickerList,
  PickerTrigger,
  useAsyncRichDropdownController,
  type PickerListOption,
} from "@/engines/picker"
import {
  ENTITY_TYPE_OPTIONS_QUERY_KEY,
  searchEntityTypeOptionsRequest,
} from "@/modules/entity-types/data/entity-types-options-request"

function toEntityTypeOption(option: EntityTypeOption): PickerListOption {
  return { id: option.id, title: option.type }
}

/**
 * The entity-type **array** picker — the multi-select sibling of the standard
 * single-select pickers. Selected types render as removable palette chips; the
 * "+ Add type" trigger opens an {@link AnchoredPanel} whose {@link PickerList}
 * offers the *unlinked* entity-types (already-linked ids are filtered out so the
 * list only ever shows additions). Selecting a row links it and keeps the panel
 * open (multi-pick); a chip's ✕ de-links.
 *
 * Selection is id-driven (the parent stores `string[]` on the form for clean
 * dirty-tracking); this component keeps a small id→{type,color} cache — seeded
 * from `seedRefs` and topped up on each pick — purely to render chip labels.
 *
 * Read-only mode (`editable={false}`) renders chips only — no trigger, no ✕.
 */
export function EntityTypesArrayPicker({
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
  // id → ref cache for chip labels. Seeded once from the record's types and
  // topped up whenever the user picks an option (the option carries its ref).
  const [refCache, setRefCache] = useState<Map<string, EntityTypeRef>>(
    () => new Map(seedRefs.map((ref) => [ref.id, ref])),
  )

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const controller = useAsyncRichDropdownController<EntityTypeOption>({
    bucketKey: ENTITY_TYPE_OPTIONS_QUERY_KEY,
    pagedSearchFn: useCallback(
      (search: string, signal: AbortSignal | undefined, skip: number) =>
        searchEntityTypeOptionsRequest(search, signal, { skip }),
      [],
    ),
    enabled: open,
  })

  // Hide already-linked types from the add-list (sidesteps the single-select
  // `selectedId` highlight — this picker tracks a set, not one value).
  const addController = useMemo(
    () => ({
      ...controller,
      options: controller.options.filter((option) => !selectedIdSet.has(option.id)),
    }),
    [controller, selectedIdSet],
  )

  const handleSelect = useCallback(
    (_option: PickerListOption, raw: EntityTypeOption) => {
      setRefCache((previous) => {
        if (previous.has(raw.id)) return previous
        const next = new Map(previous)
        next.set(raw.id, { id: raw.id, type: raw.type, color: raw.color })
        return next
      })
      if (!selectedIdSet.has(raw.id)) onChange?.([...selectedIds, raw.id])
    },
    [onChange, selectedIds, selectedIdSet],
  )

  const handleRemove = useCallback(
    (id: string) => onChange?.(selectedIds.filter((entry) => entry !== id)),
    [onChange, selectedIds],
  )

  const chips = selectedIds.map((id) => {
    const ref = refCache.get(id)
    const label = ref?.type ?? "—"
    const color = ref?.color
    return (
      <span key={id} className="inline-flex items-center gap-1">
        <CellChip paletteColor={color}>{label}</CellChip>
        {editable ? (
          <button
            type="button"
            onClick={() => handleRemove(id)}
            aria-label={`Remove ${label}`}
            className="rounded-full p-0.5 text-[var(--foreground)]/55 hover:text-[var(--foreground)]"
          >
            <X size={12} />
          </button>
        ) : null}
      </span>
    )
  })

  return (
    <div className="flex flex-col gap-2">
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">{chips}</div>
      ) : (
        <span className="text-sm text-[var(--foreground)]/45">{editable ? "" : "—"}</span>
      )}

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
              toOption={toEntityTypeOption}
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
