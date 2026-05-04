"use client"

import { useCallback, useMemo } from "react"
import { formatInventoryQuantity, type InventoryOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
  searchInventoryOptionsRequest,
} from "@/modules/inventory/data/inventory-options-request"

export type InventoryPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option. Lets callers reflect the picked inventory in adjacent UI
   * (e.g. the cut log's stock unit cell) before save.
   */
  onOptionSelected?: (option: InventoryOption | null) => void
  /**
   * Required scope — inventory rows always belong to a warehouse. Picker
   * renders disabled when null.
   */
  warehouseId: string | null
  /**
   * Optional product narrowing — when set, only inventory rows for that
   * product are returned. Cut-log usages always pass this (a cut log can
   * only reference inventory of the parent material item's product).
   */
  productId?: string | null
  /** Optional section narrowing — picker re-fetches when this changes. */
  sectionId?: string | null
  /** Optional location narrowing — picker re-fetches when this changes. */
  locationId?: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render
   * the selected inventory's label even when it isn't in the latest server
   * result (e.g. on initial render before the user types).
   */
  selectedLabel?: string | null
  placeholder?: string
  disabledPlaceholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  initialOptions?: InventoryOption[]
}

function buildTitle(option: InventoryOption): string {
  return [option.inventoryNumber, option.itemNumber, option.dyeLot]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" · ")
}

function toDropdownOption(option: InventoryOption): AsyncRichDropdownOption {
  const subtitles: string[] = []
  subtitles.push(formatInventoryQuantity(option.stockBalance, option.stockUnitAbbrev))
  if (option.coverageBalance !== null) {
    subtitles.push(
      formatInventoryQuantity(option.coverageBalance, option.itemCoverageUnitAbbrev),
    )
  }
  return {
    id: option.id,
    title: buildTitle(option),
    subtitles,
  }
}

export function InventoryPicker({
  value,
  onChange,
  onOptionSelected,
  warehouseId,
  productId = null,
  sectionId = null,
  locationId = null,
  selectedLabel = null,
  placeholder = "Select Inventory",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search inv #, item #, dye lot",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: InventoryPickerProps) {
  const enabled = warehouseId !== null && !disabled

  const bucketKey = useMemo(
    () =>
      [
        ...INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
        warehouseId ?? null,
        productId ?? null,
        sectionId ?? null,
        locationId ?? null,
      ] as const,
    [warehouseId, productId, sectionId, locationId],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchInventoryOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        ...(productId ? { productId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(locationId ? { locationId } : {}),
      }),
    [warehouseId, productId, sectionId, locationId],
  )

  const controller = useAsyncRichDropdownController<InventoryOption>({
    bucketKey,
    searchFn,
    initialOptions,
    enabled,
  })

  const handleChange = useCallback(
    (id: string | null) => {
      onChange(id)
      if (onOptionSelected) {
        const option = id ? controller.options.find((o) => o.id === id) ?? null : null
        onOptionSelected(option)
      }
    },
    [onChange, onOptionSelected, controller.options],
  )

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    if (selectedLabel) return { id: value, title: selectedLabel }
    return null
  }, [selectedLabel, value])

  return (
    <AsyncRichDropdown
      value={value}
      onChange={handleChange}
      options={options}
      selectedOption={selectedOption}
      query={controller.query}
      onQueryChange={controller.onQueryChange}
      isLoading={controller.isLoading || controller.isFetching}
      errorMessage={controller.errorMessage}
      placeholder={enabled ? placeholder : disabledPlaceholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel}
      disabled={disabled || warehouseId === null}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
