"use client"

import { useCallback, useMemo, useState } from "react"
import type { EntityOption } from "@builders/domain"
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
import { toEntityOption } from "@/modules/entities/components/picker/entity-option-presentation"
import { EntityTypeRail } from "@/modules/entity-types/components/picker/entity-type-rail"

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

  // Entity row = name on top, the linked type(s) as their palette chips (same
  // chips the type rail shows), then the address. Chips match the type rail so
  // an entity's identity reads identically on both sides of the combo.
  const renderEntityOption = useCallback(
    (_option: PickerListOption, raw: EntityOption) => (
      <div>
        <div className="truncate text-sm font-medium text-[var(--foreground)]">{raw.entity}</div>
        {raw.types.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {raw.types.map((type) => (
              <CellChip key={type.id} paletteColor={type.color ?? undefined}>
                {type.type}
              </CellChip>
            ))}
          </div>
        ) : null}
        {raw.fullAddress ? (
          <div className="mt-0.5 truncate text-xs text-[var(--foreground)]/55">
            {raw.fullAddress}
          </div>
        ) : null}
      </div>
    ),
    [],
  )

  const stickyHeader = (
    <div className="flex gap-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/55">
      <span className="w-52 shrink-0">Filter by type</span>
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
      maxHeight={600}
      align="right"
      bodyScroll={false}
      stickyHeader={stickyHeader}
    >
      {/* Responsive preferred width that tracks the viewport; `max-w-full` clamps
          the body to the panel's own (viewport-clamped) inner width, so the combo
          can never overflow the panel off-screen regardless of trigger position.
          `align="right"` anchors the right edge and grows left. */}
      <div className="flex h-full min-h-0 w-[min(40rem,calc(100vw-3rem))] max-w-full gap-3">
        {/* Type rail — every type, always visible, multi-select glow-toggle. */}
        <div className="flex min-h-0 w-52 shrink-0 flex-col">
          <EntityTypeRail
            selectedIds={typeIds}
            onChange={setTypeIds}
            onCancel={closePanel}
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
            renderOption={renderEntityOption}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
            clearLabel={clearLabel}
          />
        </div>
      </div>
    </AnchoredPanel>
  )
}
