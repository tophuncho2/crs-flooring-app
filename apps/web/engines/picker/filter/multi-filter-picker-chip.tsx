"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import { AnchoredPanel } from "@/engines/common"
import { PickerList, PickerTrigger } from "../chrome"
import {
  useAsyncRichDropdownController,
  type AsyncRichDropdownPagedPage,
} from "../client"
import type { PickerOption } from "../contracts/picker-option"

export type MultiFilterPickerChipProps<TOption extends { id: string }> = {
  /** Selected ids (the filter's `string[]` value). */
  values: string[]
  onChange: (ids: string[]) => void
  /** Labels aligned index-for-index to `values` — from `useMultiPickedOptionLabels`. */
  labels: Array<string | null>
  /** Picked-option capture — from `useMultiPickedOptionLabels`. */
  onOptionSelected: (option: TOption | null) => void
  /** Singular noun, capitalized — drives the aria label (e.g. "Warehouse"). */
  nounSingular: string
  /** Plural noun, lowercase — drives the summary + search/empty copy (e.g. "warehouses"). */
  nounPlural: string
  /** The list subject for the aria label (e.g. "work orders"). */
  subject: string
  // --- options wiring (mirrors AsyncOptionPicker) ---
  /** Stable cache-key prefix. */
  bucketKey: ReadonlyArray<unknown>
  /** Single-page fetch. Mutually exclusive with `pagedSearchFn`. */
  searchFn?: (query: string, signal: AbortSignal | undefined) => Promise<TOption[]>
  /** Paginated fetch (infinite scroll). Mutually exclusive with `searchFn`. */
  pagedSearchFn?: (
    query: string,
    signal: AbortSignal | undefined,
    skip: number,
  ) => Promise<AsyncRichDropdownPagedPage<TOption>>
  /** Maps a domain option to the picker-list presentation shape. */
  toOption: (raw: TOption) => PickerOption
  /** Optional initial seed shown before the user types anything. */
  initialOptions?: TOption[]
  /** Optional custom row renderer, passed through to PickerList. */
  renderOption?: (option: PickerOption, raw: TOption) => ReactNode
  /** Trigger placeholder when nothing is selected. Defaults to "All". */
  placeholder?: string
}

/**
 * The shared toolbar **multi-select** filter chip — the many-select sibling of
 * {@link FilterPickerChip}. It assembles existing engine machinery
 * (`PickerTrigger` + `AnchoredPanel` + `PickerList` in `selectedIds` toggle
 * mode + `useAsyncRichDropdownController`) into a self-contained chip; it does
 * NOT reuse `AsyncRichDropdown`/`AsyncOptionPicker`, which close on select.
 *
 * The trigger shows a summary — greyed placeholder ("All") when empty, the one
 * name when a single value is picked, else "N {nounPlural}". Selecting a row
 * toggles its membership and keeps the panel open (multi-pick).
 *
 * Like the single chip, it does NOT own the picked-label state
 * (`useMultiPickedOptionLabels`): the popover body unmounts on close, so that
 * state lives in the always-mounted list client and is passed in via `labels` +
 * `onOptionSelected`.
 */
export function MultiFilterPickerChip<TOption extends { id: string }>({
  values,
  onChange,
  labels,
  onOptionSelected,
  nounSingular,
  nounPlural,
  subject,
  bucketKey,
  searchFn,
  pagedSearchFn,
  toOption,
  initialOptions,
  renderOption,
  placeholder = "All",
}: MultiFilterPickerChipProps<TOption>) {
  const [open, setOpen] = useState(false)
  // The picker's search input portals into this header slot so it stays pinned
  // above the scrolling option list (mirrors the entity-type rail picker).
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null)

  const controller = useAsyncRichDropdownController<TOption>({
    bucketKey,
    searchFn,
    pagedSearchFn,
    initialOptions,
    enabled: open,
  })

  const selectedLabel = useMemo(() => {
    if (values.length === 0) return null
    if (values.length === 1) return labels[0] ?? `1 ${nounPlural}`
    return `${values.length} ${nounPlural}`
  }, [values.length, labels, nounPlural])

  const handleToggle = useCallback(
    (option: PickerOption, raw: TOption) => {
      onOptionSelected(raw)
      onChange(
        values.includes(option.id)
          ? values.filter((id) => id !== option.id)
          : [...values, option.id],
      )
    },
    [onChange, onOptionSelected, values],
  )

  const handleClear = useCallback(() => onChange([]), [onChange])

  return (
    <AnchoredPanel
      trigger={
        <PickerTrigger
          expanded={open}
          onToggle={() => setOpen((previous) => !previous)}
          selectedLabel={selectedLabel}
          placeholder={placeholder}
          ariaLabel={`Filter ${subject} by ${nounSingular.toLowerCase()}`}
        />
      }
      open={open}
      onClose={() => setOpen(false)}
      stickyHeader={<div ref={setSearchSlot} />}
    >
      {searchSlot === null ? null : (
        <div className="flex h-full min-h-0 flex-col gap-2">
          {values.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="flex shrink-0 items-center gap-2 rounded-md border border-[var(--panel-border)] px-3 py-2 text-left text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/15 hover:text-[var(--foreground)]"
            >
              <span aria-hidden="true">✕</span>
              <span>Clear filter</span>
            </button>
          ) : null}
          <PickerList<TOption>
            controller={controller}
            toOption={toOption}
            selectedId={null}
            selectedLabel={null}
            selectedIds={values}
            onSelect={handleToggle}
            onClear={() => {}}
            onCancel={() => setOpen(false)}
            renderOption={renderOption}
            searchPlaceholder={`Search ${nounPlural}`}
            emptyMessage={`No ${nounPlural} match`}
            searchPortalTarget={searchSlot}
          />
        </div>
      )}
    </AnchoredPanel>
  )
}
