"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation } from "@tanstack/react-query"
import type {
  StagedInventoryForm,
  StagedInventoryRow,
} from "@builders/domain"
import { updateStagedInventoryRowRequest } from "@/modules/imports/data/mutations"
import type { StagedInvRowEditPanelOpenSpec } from "../use-staged-inv-row-edit-panel"
import type { StagedInvRowPanelPatch } from "../types"

type Deps = {
  importId: string
  publish: (patch: StagedInvRowPanelPatch) => void
  setOpen: Dispatch<SetStateAction<StagedInvRowEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<string | null>>
}

/**
 * Update an existing staged inventory row from the side panel. Optimistic
 * concurrency via `expectedUpdatedAt`. Closes the panel on success.
 */
export function useUpdateStagedInvRowMutation({
  importId,
  publish,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { row: StagedInventoryRow; form: StagedInventoryForm }) =>
      updateStagedInventoryRowRequest({
        importId,
        rowId: input.row.id,
        form: input.form,
        expectedUpdatedAt: input.row.updatedAt,
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
