"use client"

import { useCallback, useMemo, useState } from "react"
import type { EntityOption, EntityTypeOption } from "@builders/domain"
import { AnchoredPanel } from "@/engines/common"
import {
  PickerList,
  PickerTrigger,
  useAsyncRichDropdownController,
  type PickerListOption,
} from "@/engines/picker"
import {
  ENTITY_OPTIONS_QUERY_KEY,
  searchEntityOptionsRequest,
} from "@/modules/entities/data/entity-options-request"
import { EntityTypeChips } from "@/modules/entity-types/components/picker/entity-type-chips"
import {
  toEntityTypePickerOption,
  useEntityTypeMultiSelect,
} from "@/modules/entity-types/components/picker/use-entity-type-multi-select"

type ActivePicker = "entity" | "type"

export type EntityTypePickerProps = {
  /** Selected entity id (the cell's value). */
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Fired alongside `onChange` with the full picked option (or null on clear),
   * so callers can snapshot the entity's joined fields before save. Only fires
   * when the option is in the picker's current results.
   */
  onOptionSelected?: (option: EntityOption | null) => void
  /** Pre-resolved label for the current `value` (renders the trigger for already-saved rows). */
  selectedLabel?: string | null
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  clearLabel?: string
  disabled?: boolean
  ariaLabel?: string
  /** Optional initial seed shown before the user types anything (e.g. SSR-loaded top 20). */
  initialOptions?: EntityOption[]
}

function toEntityOption(option: EntityOption): PickerListOption {
  return { id: option.id, title: option.entity }
}

/**
 * The combined **type → entity** combo picker — the single entity picker used
 * everywhere an entity is selected (payments, properties, work-order/template/
 * property list filters). Mirrors {@link ProductCategoryPicker}: the trigger
 * shows the selected entity; on open it anchors an inline panel whose sticky
 * header carries a **Type** trigger and an **Entity** trigger, and whose body
 * shows the active trigger's list.
 *
 * Body defaults to the entity list on open; the type list appears when the Type
 * trigger is clicked. Because an entity holds an *array* of types (m2m), the
 * type side is **multi-select** and narrows the entity options to those carrying
 * at least one selected type (`some/in`). The type-filter state is **internal**
 * (never persisted, not lifted to consumers), so this is a true drop-in for the
 * old single-select EntityPicker. Changing the type set re-narrows but never
 * clears the chosen entity (an entity may legitimately carry several types).
 */
export function EntityTypePicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  placeholder = "Select entity",
  searchPlaceholder = "Search entities",
  emptyMessage = "No matches",
  clearLabel = "Clear selection",
  disabled,
  ariaLabel = "Entity",
  initialOptions,
}: EntityTypePickerProps) {
  const [open, setOpen] = useState(false)
  const [activePicker, setActivePicker] = useState<ActivePicker>("entity")
  // The active picker portals its search input into this header slot so the
  // search bar stays pinned above the scrolling option list.
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null)
  // Internal type-narrowing selection — drives the entity options' bucketKey;
  // never surfaced to consumers (a find-aid, not a persisted link).
  const [typeIds, setTypeIds] = useState<string[]>([])

  const typeSide = useEntityTypeMultiSelect({
    selectedIds: typeIds,
    seedRefs: [],
    onChange: setTypeIds,
    enabled: open && activePicker === "type",
  })

  const entityBucketKey = useMemo(
    () => [...ENTITY_OPTIONS_QUERY_KEY, ...typeIds] as const,
    [typeIds],
  )
  const entitySearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchEntityOptionsRequest(search, signal, {
        typeIds: typeIds.length > 0 ? typeIds : undefined,
        skip,
      }),
    [typeIds],
  )
  const entityController = useAsyncRichDropdownController<EntityOption>({
    bucketKey: entityBucketKey,
    pagedSearchFn: entitySearchFn,
    initialOptions,
    enabled: open,
  })

  const openPanel = useCallback(() => {
    setActivePicker("entity")
    setOpen(true)
  }, [])
  const closePanel = useCallback(() => setOpen(false), [])

  const handleEntitySelect = useCallback(
    (_option: PickerListOption, raw: EntityOption) => {
      onChange(raw.id)
      onOptionSelected?.(raw)
      setOpen(false)
    },
    [onChange, onOptionSelected],
  )
  const handleEntityClear = useCallback(() => {
    onChange(null)
    onOptionSelected?.(null)
  }, [onChange, onOptionSelected])

  const typeTriggerLabel =
    typeIds.length === 0 ? null : `${typeIds.length} type${typeIds.length === 1 ? "" : "s"}`

  const stickyHeader = (
    <div className="flex flex-col gap-2">
      <PickerTrigger
        expanded={activePicker === "type"}
        onToggle={() => setActivePicker("type")}
        selectedLabel={typeTriggerLabel}
        placeholder="All types"
        ariaLabel="Type filter"
      />
      <PickerTrigger
        expanded={activePicker === "entity"}
        onToggle={() => setActivePicker("entity")}
        selectedLabel={selectedLabel}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
      />
      <div ref={setSearchSlot} />
    </div>
  )

  const trigger = (
    <PickerTrigger
      expanded={open}
      onToggle={() => (open ? closePanel() : openPanel())}
      selectedLabel={selectedLabel}
      placeholder={placeholder}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  )

  return (
    <AnchoredPanel trigger={trigger} open={open} onClose={closePanel} stickyHeader={stickyHeader}>
      {searchSlot === null ? null : activePicker === "type" ? (
        <div className="flex flex-col gap-2">
          <EntityTypeChips chips={typeSide.chips} editable onRemove={typeSide.handleRemove} />
          <PickerList<EntityTypeOption>
            controller={typeSide.addController}
            toOption={toEntityTypePickerOption}
            selectedId={null}
            selectedLabel={null}
            onSelect={typeSide.handleSelect}
            onClear={() => {}}
            onCancel={closePanel}
            searchPlaceholder="Search types"
            emptyMessage="No more types"
            searchPortalTarget={searchSlot}
          />
        </div>
      ) : (
        <PickerList<EntityOption>
          controller={entityController}
          toOption={toEntityOption}
          selectedId={value}
          selectedLabel={selectedLabel}
          onSelect={handleEntitySelect}
          onClear={handleEntityClear}
          onCancel={closePanel}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          clearLabel={clearLabel}
          searchPortalTarget={searchSlot}
        />
      )}
    </AnchoredPanel>
  )
}
