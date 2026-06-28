"use client"

import { useCallback, useState } from "react"
import type { PropertyOption } from "@builders/domain"
import type { WorkOrderPrimaryDetail } from "./types"

/**
 * Live preview override for the read-only Property Instructions cell.
 * Initializes from the saved detail; flips to the picker's selected option's
 * instructions as soon as the user picks (so the cell tracks the dropdown
 * selection rather than waiting for save). Cleared whenever the saved
 * `propertyId` changes — after save or record swap — so the override doesn't
 * stomp the next record's joined instructions.
 *
 * The property's ADDRESS is no longer previewed here: on pick it is snapshotted
 * into the WO's own editable address cells (see `handlePropertySelected`), which
 * then persist independently of the property.
 */
export function usePropertyJoinedOverride(detail: WorkOrderPrimaryDetail | null) {
  const [picked, setPicked] = useState<string | null>(null)

  // Clear the override when the saved propertyId changes — during render so the
  // next record's joined instructions aren't briefly stomped by the prior pick.
  const [trackedPropertyId, setTrackedPropertyId] = useState(detail?.propertyId)
  if (trackedPropertyId !== detail?.propertyId) {
    setTrackedPropertyId(detail?.propertyId)
    setPicked(null)
  }

  const handlePropertyOption = useCallback((option: PropertyOption | null) => {
    setPicked(option === null ? null : option.instructions)
  }, [])

  const instructions = picked ?? detail?.propertyInstructions ?? null

  return { instructions, handlePropertyOption }
}
