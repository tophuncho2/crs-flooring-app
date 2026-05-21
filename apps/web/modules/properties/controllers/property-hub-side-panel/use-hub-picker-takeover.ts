"use client"

import { useCallback, type Dispatch, type SetStateAction } from "react"
import type { HubCreateFormSlice } from "./use-hub-create-form"
import type { HubPropertyEditSlice } from "./use-hub-property-edit"
import type { HubMode, HubPickerKind } from "./types"

export type UseHubPickerTakeoverArgs = {
  mode: HubMode
  setMode: Dispatch<SetStateAction<HubMode>>
  createForm: HubCreateFormSlice
  propertyEdit: HubPropertyEditSlice
}

export type HubPickerTakeoverSlice = {
  openPicker: (pickerKind: HubPickerKind) => void
  closePicker: () => void
  /** MC-link picker preselect — sourced from create draft OR property-edit form depending on returnTo. */
  mcLinkSelectedId: string | null
  mcLinkSelectedLabel: string | null
  /** Commit the picker selection back to the slice it was opened from. */
  commitMcLink: (id: string | null, label: string | null) => void
}

/**
 * Picker-takeover slice. When the user opens an inline picker (mc-link or
 * property-filter), mode flips to `picker-takeover` with a `returnTo`
 * snapshot of the previous mode. `closePicker` pops back to that snapshot.
 *
 * The MC-link picker is shared by both the create flow (writes mcLinkId
 * onto the create draft) and the property-edit flow (writes
 * managementCompanyId onto the property-edit form). `mcLinkSelectedId` /
 * `mcLinkSelectedLabel` read from the right source based on `returnTo`;
 * `commitMcLink` writes to the right destination, then closes the picker.
 */
export function useHubPickerTakeover({
  mode,
  setMode,
  createForm,
  propertyEdit,
}: UseHubPickerTakeoverArgs): HubPickerTakeoverSlice {
  const openPicker = useCallback(
    (pickerKind: HubPickerKind) => {
      setMode((prev) => {
        if (prev.kind === "picker-takeover") return prev
        if (prev.kind === "closed") return prev
        return { kind: "picker-takeover", returnTo: prev, pickerKind }
      })
    },
    [setMode],
  )

  const closePicker = useCallback(() => {
    setMode((prev) => {
      if (prev.kind !== "picker-takeover") return prev
      return prev.returnTo
    })
  }, [setMode])

  const mcLinkPickerReturnTarget =
    mode.kind === "picker-takeover" ? mode.returnTo.kind : null

  const mcLinkSelectedId: string | null =
    mcLinkPickerReturnTarget === "section-edit-property"
      ? propertyEdit.form.managementCompanyId.length > 0
        ? propertyEdit.form.managementCompanyId
        : null
      : createForm.mcLinkId

  const mcLinkSelectedLabel: string | null =
    mcLinkPickerReturnTarget === "section-edit-property"
      ? propertyEdit.managementCompanyLabel
      : createForm.mcLinkLabel

  const commitMcLink = useCallback(
    (id: string | null, label: string | null) => {
      const returnTo = mode.kind === "picker-takeover" ? mode.returnTo : null
      if (returnTo?.kind === "section-edit-property") {
        propertyEdit.setManagementCompany(id, label)
      } else {
        createForm.setMcLink(id, label)
      }
      closePicker()
    },
    [mode, propertyEdit, createForm, closePicker],
  )

  return {
    openPicker,
    closePicker,
    mcLinkSelectedId,
    mcLinkSelectedLabel,
    commitMcLink,
  }
}
