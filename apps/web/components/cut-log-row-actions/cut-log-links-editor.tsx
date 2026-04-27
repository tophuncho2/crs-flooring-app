"use client"

import { useCallback, useState } from "react"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import { canEditCutLogLinks, type CutLogRow } from "@builders/domain"

/**
 * Per-row work-order / work-order-item link widget for the cut-logs
 * section. Sweep-7 ships this at MVP scope:
 *
 *  - "Clear Links" button: enabled when the cut log currently has links
 *    AND `canEditCutLogLinks(row)` (i.e. status !== "QUEUED"). Clicking
 *    fires the PATCH route with `{ workOrderId: null, workOrderItemId:
 *    null }`. Useful as-is for un-linking a cut log from a work order.
 *
 *  - Set Links UI (work-order picker + work-order-item picker): NOT
 *    SHIPPED in sweep 7. The picker requires loading work-orders +
 *    items via a queries.ts addition + threading options through the
 *    section component. Deferred to a follow-up sweep — the route
 *    accepts a non-null pair already, so the follow-up is purely UI.
 *
 * Self-contained per sweep-7 placement decision: lives outside
 * `apps/web/modules/...` so the section controller stays focused on
 * section-level state.
 */

type UpdateCutLogLinksResponse = {
  row: CutLogRow
}

async function updateCutLogLinksRequest(
  inventoryId: string,
  cutLogId: string,
  workOrderId: string | null,
  workOrderItemId: string | null,
  expectedUpdatedAt: string,
): Promise<UpdateCutLogLinksResponse> {
  return requestJson<UpdateCutLogLinksResponse>(
    `/api/inventory/${inventoryId}/cut-logs/links`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        withMutationMeta(
          { cutLogId, workOrderId, workOrderItemId },
          expectedUpdatedAt,
        ),
      ),
    },
  )
}

export function CutLogLinksEditor({
  row,
  inventoryId,
  onSuccess,
}: {
  row: CutLogRow
  inventoryId: string
  onSuccess?: (updatedRow: CutLogRow) => void
}) {
  const [isFiring, setIsFiring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAllowed = canEditCutLogLinks(row)
  const hasLinks = Boolean(row.workOrderId || row.workOrderItemId)

  const handleClear = useCallback(async () => {
    if (!hasLinks) return
    setIsFiring(true)
    setError(null)
    try {
      const response = await updateCutLogLinksRequest(
        inventoryId,
        row.id,
        null,
        null,
        row.updatedAt,
      )
      onSuccess?.(response.row)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clear links failed")
    } finally {
      setIsFiring(false)
    }
  }, [inventoryId, row, hasLinks, onSuccess])

  // The "set links" path needs a work-order + work-order-item picker UI
  // not shipped in sweep 7. For now: only the clear-links action is
  // wired. A "Edit" placeholder button is shown disabled to signal the
  // future feature without fooling the user.
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled
        aria-label={`Set links on cut log ${row.cutLogNumber} (coming soon)`}
        title="Set links — coming in next sweep"
        className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-xs text-[var(--foreground)]/50"
      >
        Set Links
      </button>
      <button
        type="button"
        onClick={handleClear}
        disabled={!isAllowed || !hasLinks || isFiring}
        aria-label={`Clear links on cut log ${row.cutLogNumber}`}
        title={hasLinks ? "Clear work-order link" : "No links to clear"}
        className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-xs text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isFiring ? "..." : "Clear"}
      </button>
      {error ? (
        <span className="text-xs text-rose-700" title={error}>
          ⚠
        </span>
      ) : null}
    </div>
  )
}
