"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation } from "@tanstack/react-query"
import type { StagedInventoryForm } from "@builders/domain"
import { createStagedInventoryRowRequest } from "@/modules/imports/data/mutations"
import type { StagedInvRowEditPanelOpenSpec } from "../use-staged-inv-row-edit-panel"
import type { StagedInvRowPanelPatch } from "../types"

type Deps = {
  importId: string
  publish: (patch: StagedInvRowPanelPatch) => void
  setOpen: Dispatch<SetStateAction<StagedInvRowEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<string | null>>
}

/**
 * Create a new staged inventory row from the side panel. On success
 * publishes an upsert patch + closes the panel.
 */
export function useCreateStagedInvRowMutation({
  importId,
  publish,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { filterRowId: string; form: StagedInventoryForm }) =>
      createStagedInventoryRowRequest({
        importId,
        filterRowId: input.filterRowId,
        form: input.form,
      }),
    onSuccess: (response) => {
      publish({ kind: "upsert", row: response.row, filterRow: response.filterRow })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
