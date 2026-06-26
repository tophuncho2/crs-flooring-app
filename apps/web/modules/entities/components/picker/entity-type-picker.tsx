"use client"

import { useCallback, useMemo, useState } from "react"
import type { EntityOption, EntityTypeOption } from "@builders/domain"
import { AnchoredPanel, CellChip } from "@/engines/common"
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
import {
  toEntityTypePickerOption,
  useEntityTypeMultiSelect,
} from "@/modules/entity-types/components/picker/use-entity-type-multi-select"

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
 * property list filters). The trigger shows the selected entity; on open it
 * anchors a split-pane panel: a **type rail** on the left (every type, always
 * visible, each rendered as its palette chip) and the **entity list** on the
 * right, each column with its own search + scroll.
 *
 * The type rail is **multi-select glow-toggle**: clicking a type glows + filters
 * the entity list to entities carrying at least one selected type (`some/in`);
 * clicking it again clears it. The type-filter state is **internal** (never
 * persisted, not lifted to consumers), so this is a true drop-in for the old
 * single-select entity picker. Changing the type set re-narrows but never clears
 * the chosen entity (an entity may legitimately carry several types).
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
  // Internal type-narrowing selection — drives the entity options' bucketKey;
  // never surfaced to consumers (a find-aid, not a persisted link).
  const [typeIds, setTypeIds] = useState<string[]>([])

  const typeSide = useEntityTypeMultiSelect({
    selectedIds: typeIds,
    seedRefs: [],
    onChange: setTypeIds,
    enabled: open,
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

  // The type's canonical option row = its palette chip (matches the chips shown
  // for an entity's types everywhere else). Selection glow is the row chrome's
  // job (PickerList owns it via `selectedIds`).
  const renderTypeOption = useCallback(
    (_option: PickerListOption, raw: EntityTypeOption) => (
      <CellChip paletteColor={raw.color ?? undefined}>{raw.type}</CellChip>
    ),
    [],
  )

  const stickyHeader = (
    <div className="flex gap-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/55">
      <span className="w-40 shrink-0">Filter by type</span>
      <span className="flex-1">Entities</span>
    </div>
  )

  const trigger = (
    <PickerTrigger
      expanded={open}
      onToggle={() => setOpen((previous) => !previous)}
      selectedLabel={selectedLabel}
      placeholder={placeholder}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  )

  return (
    <AnchoredPanel
      trigger={trigger}
      open={open}
      onClose={closePanel}
      maxHeight={440}
      stickyHeader={stickyHeader}
    >
      <div className="flex h-full min-h-0 w-[30rem] max-w-[calc(100vw-3rem)] gap-3">
        {/* Type rail — every type, always visible, multi-select glow-toggle. */}
        <div className="flex min-h-0 w-40 shrink-0 flex-col">
          <PickerList<EntityTypeOption>
            controller={typeSide.controller}
            toOption={toEntityTypePickerOption}
            selectedId={null}
            selectedLabel={null}
            selectedIds={typeIds}
            onSelect={typeSide.handleToggle}
            onClear={() => {}}
            onCancel={closePanel}
            renderOption={renderTypeOption}
            searchPlaceholder="Search types"
            emptyMessage="No types"
          />
        </div>

        <div className="w-px shrink-0 bg-[var(--panel-border)]" />

        {/* Entity list — narrowed by the selected types. */}
        <div className="flex min-h-0 flex-1 flex-col">
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
          />
        </div>
      </div>
    </AnchoredPanel>
  )
}
