"use client"

import { useMutation } from "@tanstack/react-query"
import type { StagedInventoryRow } from "@builders/domain"
import { createStagedInventoryRowRequest } from "@/modules/imports/data/mutations"
import type { StagedInvRowPanelPatch } from "../types"

type Deps = {
  importId: string
  applyStagedRowPatch: (patch: StagedInvRowPanelPatch) => void
}

/**
 * Inline duplicate of an existing staged inventory row (no side panel —
 * synchronous POST). Caller gates on `row.status === "DRAFT"`. Server
 * returns the new row + refreshed filter row totals, applied via the
 * shared patch path so totals stay in sync.
 */
export function useDuplicateStagedRowMutation({
  importId,
  applyStagedRowPatch,
}: Deps) {
  return useMutation({
    mutationFn: (input: { source: StagedInventoryRow }) =>
      createStagedInventoryRowRequest({
        importId,
        filterRowId: input.source.filterRowId,
        form: {
          rollNumber: input.source.rollNumber,
          dyeLot: input.source.dyeLot,
          location: input.source.location,
          startingStock: input.source.startingStock,
          note: input.source.note,
        },
      }),
    onSuccess: (response) => {
      applyStagedRowPatch({
        kind: "upsert",
        row: response.row,
        filterRow: response.filterRow,
      })
    },
  })
}
