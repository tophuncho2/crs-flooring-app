"use client"

import { useMutation } from "@tanstack/react-query"
import type { StagedInventoryRow } from "@builders/domain"
import { deleteStagedInventoryRowRequest } from "@/modules/imports/data/mutations"
import type { StagedInvRowPanelPatch } from "../types"

type Deps = {
  importId: string
  applyStagedRowPatch: (patch: StagedInvRowPanelPatch) => void
}

/**
 * Inline delete of an existing staged inventory row (no side panel —
 * destructive POST gated by a confirm dialog at the call site). Caller
 * gates on `row.status === "DRAFT"` to mirror the server guard. Server
 * returns the refreshed filter row totals; applied via the shared patch
 * path so the sub-grid + filter row stay in sync.
 */
export function useInlineDeleteStagedRowMutation({
  importId,
  applyStagedRowPatch,
}: Deps) {
  return useMutation({
    mutationFn: (input: { row: StagedInventoryRow }) =>
      deleteStagedInventoryRowRequest({
        importId,
        rowId: input.row.id,
        expectedUpdatedAt: input.row.updatedAt,
      }),
    onSuccess: (response, variables) => {
      applyStagedRowPatch({
        kind: "delete",
        rowId: variables.row.id,
        filterRow: response.filterRow,
      })
    },
  })
}
