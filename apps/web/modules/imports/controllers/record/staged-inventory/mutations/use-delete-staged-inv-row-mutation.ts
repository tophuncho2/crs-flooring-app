"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation } from "@tanstack/react-query"
import type { StagedInventoryRow } from "@builders/domain"
import { deleteStagedInventoryRowRequest } from "@/modules/imports/data/mutations"
import type { StagedInvRowEditPanelOpenSpec } from "../use-staged-inv-row-edit-panel"
import type { StagedInvRowPanelPatch } from "../types"

type Deps = {
  importId: string
  publish: (patch: StagedInvRowPanelPatch) => void
  setOpen: Dispatch<SetStateAction<StagedInvRowEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<string | null>>
}

/**
 * Delete a staged inventory row from the side panel. Optimistic
 * concurrency via `expectedUpdatedAt`. Closes the panel on success and
 * emits a delete patch so the parent removes the row from its snapshot.
 */
export function useDeleteStagedInvRowMutation({
  importId,
  publish,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { row: StagedInventoryRow }) =>
      deleteStagedInventoryRowRequest({
        importId,
        rowId: input.row.id,
        expectedUpdatedAt: input.row.updatedAt,
      }),
    onSuccess: (response, variables) => {
      publish({
        kind: "delete",
        rowId: variables.row.id,
        filterRow: response.filterRow,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
