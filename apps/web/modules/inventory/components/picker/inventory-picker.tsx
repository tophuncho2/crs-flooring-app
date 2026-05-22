"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
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
  /**
   * Optional free-text location filter — server-side ILIKE on
   * `inventory.location`. Picker re-fetches when this changes. Use case: the
   * cut-log create form's location filter chip narrows the picker scope.
   */
  location?: string | null
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

function toDropdownOption(option: InventoryOption): AsyncRichDropdownOption {
  const subtitles: string[] = []
  // Location sits first so operators can scan "is this one where I think it
  // is" before comparing balances. `composeInventoryItem` does NOT include
  // location in the title (it joins inv# · roll# · dyeLot · note), so this
  // is the only place location surfaces in the option row.
  if (option.location && option.location.length > 0) {
    subtitles.push(option.location)
  }
  subtitles.push(formatInventoryQuantity(option.stockBalance, option.stockUnitAbbrev))
  if (option.coverageBalance !== null) {
    subtitles.push(
      formatInventoryQuantity(option.coverageBalance, option.itemCoverageUnitAbbrev),
    )
  }
  return {
    id: option.id,
    title: option.inventoryItem,
    subtitles,
  }
}

export function InventoryPicker({
  value,
  onChange,
  onOptionSelected,
  warehouseId,
  productId = null,
  location = null,
  selectedLabel = null,
  placeholder = "Select Inventory",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search inventory item",
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
        location ?? null,
      ] as const,
    [warehouseId, productId, location],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchInventoryOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        ...(productId ? { productId } : {}),
        ...(location ? { location } : {}),
      }),
    [warehouseId, productId, location],
  )

  const controller = useAsyncRichDropdownController<InventoryOption>({
    bucketKey,
    searchFn,
    initialOptions,
    enabled,
  })

  // Sticky option cache. The dropdown's commit path clears the search query
  // right after firing onChange — that triggers an immediate refetch which
  // can replace `controller.options` with a list that no longer contains
  // the picked row. Looking it up in this ref (which accumulates every
  // option ever returned for the current scope) survives the reset so the
  // parent always receives the full option that backed the user's click.
  const optionsByIdRef = useRef<Map<string, InventoryOption>>(new Map())
  useEffect(() => {
    for (const option of controller.options) {
      optionsByIdRef.current.set(option.id, option)
    }
  }, [controller.options])
  useEffect(() => {
    optionsByIdRef.current = new Map()
  }, [bucketKey])

  const handleChange = useCallback(
    (id: string | null) => {
      onChange(id)
      if (onOptionSelected) {
        const option = id ? (optionsByIdRef.current.get(id) ?? null) : null
        onOptionSelected(option)
      }
    },
    [onChange, onOptionSelected],
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
      // Stock balance + coverage balance render in the option subtitles and
      // mutate as other operators cut against the same inventory rows.
      // Refetch on every open so the user sees the freshest balances.
      onOpenChange={(isOpen) => {
        if (isOpen) controller.refetch()
      }}
    />
  )
}
