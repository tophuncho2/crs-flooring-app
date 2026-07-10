"use client"

import { useCallback } from "react"
import { parseAsString, useQueryState } from "nuqs"

/**
 * Sentinel `?indicator` value that opens the "new indicator" create modal. The
 * product record view translates it into the modal and clears the param (mirrors
 * the inventory adjustments `NEW_ADJUSTMENT_ID`).
 */
export const NEW_INDICATOR_ID = "new"

export type ProductIndicatorSelectionController = {
  /** The selected indicator id, the create sentinel, or null (list mode). */
  indicator: string | null
  setIndicator: (indicatorId: string | null) => void
}

/**
 * Owns the product record view's `?indicator` selection. The product itself is
 * fixed by the `[id]` route, so — unlike the inventory selection — there is no
 * cascade; this is a single URL param driving the indicators drilldown face.
 */
export function useProductIndicatorSelection(): ProductIndicatorSelectionController {
  const [indicator, setIndicatorState] = useQueryState(
    "indicator",
    parseAsString.withOptions({ history: "replace" }),
  )

  const setIndicator = useCallback(
    (indicatorId: string | null) => {
      void setIndicatorState(indicatorId)
    },
    [setIndicatorState],
  )

  return { indicator, setIndicator }
}
