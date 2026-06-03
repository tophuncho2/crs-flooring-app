"use client"

import { useCallback, useMemo, useState } from "react"
import {
  formatInventoryQuantity,
  type InventoryOption,
} from "@builders/domain"
import { HubSidePanelPicker, type HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { DebouncedSearchControl } from "@/components/features/search"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
  searchInventoryOptionsRequest,
} from "@/modules/inventory/data/inventory-options-request"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"

type IdentityTerms = {
  invNumber: string
  rollNumber: string
  dyeLot: string
  note: string
}

const EMPTY_TERMS: IdentityTerms = { invNumber: "", rollNumber: "", dyeLot: "", note: "" }

const SEARCH_BARS: ReadonlyArray<{
  key: keyof IdentityTerms
  placeholder: string
  ariaLabel: string
}> = [
  { key: "invNumber", placeholder: "Inv #", ariaLabel: "Search inventory by inventory number" },
  { key: "rollNumber", placeholder: "Roll #", ariaLabel: "Search inventory by roll number" },
  { key: "dyeLot", placeholder: "Dye lot", ariaLabel: "Search inventory by dye lot" },
  { key: "note", placeholder: "Note", ariaLabel: "Search inventory by note" },
]

function toPickerOption(option: InventoryOption): HubSidePanelPickerOption {
  // Subtitles disambiguate same-product rows on one warehouse: location
  // first (so operators can scan "is this one where I think it is"),
  // then stock balance and (when applicable) coverage balance.
  const subtitles: string[] = []
  if (option.location && option.location.length > 0) subtitles.push(option.location)
  subtitles.push(formatInventoryQuantity(option.stockBalance, option.stockUnitAbbrev))
  if (option.coverageBalance !== null) {
    subtitles.push(formatInventoryQuantity(option.coverageBalance, option.itemCoverageUnitAbbrev))
  }
  return {
    id: option.id,
    title: option.inventoryItem,
    subtitle: subtitles.join(" · "),
  }
}

/**
 * Body-takeover inventory picker for the adjustment create form. Scoped to
 * the parent WO's warehouse + the parent WOMI's product, narrowed further by
 * the panel's free-text location filter and the four identity search bars
 * (inv# / roll# / dye lot / note), each an independent server-side ILIKE
 * AND'd together — parity with the inventory list view. Commit hands the full
 * option to the controller so form id + the four identity fields move in one
 * render.
 */
export function AdjustmentInventoryPickerTakeover({
  controller,
}: {
  controller: AdjustmentEditPanelController
}) {
  const { warehouseId, productId, form, local, closePicker, selectInventoryOption } =
    controller

  const location = local.locationFilter || null

  // The four debounced search terms are takeover-local scaffolding (reset when
  // the takeover unmounts), not adjustment form state. Committing a bar re-keys
  // the query (the terms ride in `bucketKey`).
  const [terms, setTerms] = useState<IdentityTerms>(EMPTY_TERMS)

  const commitTerm = useCallback(
    (key: keyof IdentityTerms, value: string) =>
      setTerms((prev) => ({ ...prev, [key]: value })),
    [],
  )

  const bucketKey = useMemo(
    () =>
      [
        ...INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
        warehouseId,
        productId,
        location,
        terms.invNumber,
        terms.rollNumber,
        terms.dyeLot,
        terms.note,
      ] as const,
    [warehouseId, productId, location, terms],
  )

  const pagedSearchFn = useCallback(
    (_query: string, signal: AbortSignal | undefined, skip: number) =>
      searchInventoryOptionsRequest(signal, {
        warehouseId: warehouseId ?? "",
        ...(productId ? { productId } : {}),
        ...(location ? { location } : {}),
        ...(terms.invNumber ? { invNumber: terms.invNumber } : {}),
        ...(terms.rollNumber ? { rollNumber: terms.rollNumber } : {}),
        ...(terms.dyeLot ? { dyeLot: terms.dyeLot } : {}),
        ...(terms.note ? { note: terms.note } : {}),
        skip,
      }),
    [warehouseId, productId, location, terms],
  )

  const dropdown = useAsyncRichDropdownController<InventoryOption>({
    bucketKey,
    pagedSearchFn,
    enabled: warehouseId !== null,
  })

  const toOption = useMemo(() => toPickerOption, [])

  const handleSelect = useCallback(
    (_option: HubSidePanelPickerOption, raw: InventoryOption) => {
      selectInventoryOption(raw)
    },
    [selectInventoryOption],
  )

  const handleClear = useCallback(() => {
    selectInventoryOption(null)
  }, [selectInventoryOption])

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="grid shrink-0 grid-cols-2 gap-2">
        {SEARCH_BARS.map(({ key, placeholder, ariaLabel }) => (
          <DebouncedSearchControl
            key={key}
            value={terms[key]}
            onCommit={(next) => commitTerm(key, next)}
            placeholder={placeholder}
            ariaLabel={ariaLabel}
          />
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <HubSidePanelPicker
          controller={dropdown}
          toOption={toOption}
          selectedId={form.inventoryId || null}
          selectedLabel={local.pickedInventoryItem || null}
          onSelect={handleSelect}
          onClear={handleClear}
          onCancel={closePicker}
          hideSearchInput
          emptyMessage={warehouseId ? "No matches" : "Select warehouse first"}
          loadingMessage="Searching…"
          clearLabel="Clear selection"
        />
      </div>
    </div>
  )
}
