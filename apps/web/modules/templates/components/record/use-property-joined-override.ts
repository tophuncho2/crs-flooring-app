"use client"

import { useCallback, useEffect, useState } from "react"
import type { PropertyJoinedFields } from "@/components/composites/property-fields/property-joined-readonly-cells"
import type { PropertyOption } from "@builders/domain"
import type { TemplatePrimaryDetail } from "./template-primary-fields-section"

function detailToPropertyJoined(
  detail: TemplatePrimaryDetail | null,
): PropertyJoinedFields | null {
  if (!detail) return null
  return {
    streetAddress: detail.propertyStreetAddress,
    city: detail.propertyCity,
    state: detail.propertyState,
    postalCode: detail.propertyPostalCode,
    instructions: detail.propertyInstructions,
  }
}

/**
 * Live preview override for the joined property-readonly cells.
 * Initializes from the saved detail; flips to the picker's selected
 * option as soon as the user picks (so address / instructions cells
 * track the dropdown selection rather than waiting for save). Cleared
 * whenever the saved `propertyId` changes so the override doesn't
 * stomp the next record's joined fields. Mirrors WO's hook.
 */
export function usePropertyJoinedOverride(detail: TemplatePrimaryDetail | null) {
  const [picked, setPicked] = useState<PropertyJoinedFields | null>(null)

  useEffect(() => {
    setPicked(null)
  }, [detail?.propertyId])

  const handlePropertyOption = useCallback((option: PropertyOption | null) => {
    if (option === null) {
      setPicked(null)
      return
    }
    setPicked({
      streetAddress: option.streetAddress,
      city: option.city,
      state: option.state,
      postalCode: option.postalCode,
      instructions: option.instructions,
    })
  }, [])

  const propertyJoined = picked ?? detailToPropertyJoined(detail)

  return { propertyJoined, handlePropertyOption }
}
