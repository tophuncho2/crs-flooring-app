"use client"

import { useCallback, useState } from "react"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import { canVoidCutLog, type CutLogRow } from "@builders/domain"

/**
 * Per-row Void widget for the cut-logs section. Self-contained — owns
 * its own confirm dialog, mutation lifecycle, and error state. Per
 * sweep-7 placement decision: lives outside `apps/web/modules/...` so
 * the section controller doesn't accumulate per-row state.
 *
 * On 202 success, calls `onSuccess` with an optimistic flip of the row
 * to `status: "QUEUED"` (the worker erases value fields + flips to
 * VOID within ~2s; the page-level state update will catch up on the
 * next refresh). The optimistic flip is the same shape as the section
 * controller's finalize-batch optimistic update.
 */

type VoidCutLogResponse = {
  batch: {
    outboxEventId: string
    wasDuplicate: boolean
  }
}

async function voidCutLogRequest(
  inventoryId: string,
  cutLogId: string,
  revisionKey: string,
): Promise<VoidCutLogResponse> {
  return requestJson<VoidCutLogResponse>(
    `/api/inventory/${inventoryId}/cut-logs/void`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta({ cutLogId }, revisionKey)),
    },
  )
}

export function VoidCutLogButton({
  row,
  inventoryId,
  onSuccess,
}: {
  row: CutLogRow
  inventoryId: string
  onSuccess?: (updatedRow: CutLogRow) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFiring, setIsFiring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAllowed = canVoidCutLog(row)

  const handleConfirm = useCallback(async () => {
    setIsFiring(true)
    setError(null)
    try {
      await voidCutLogRequest(inventoryId, row.id, row.updatedAt)
      onSuccess?.({ ...row, status: "QUEUED" })
      setIsOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Void failed")
    } finally {
      setIsFiring(false)
    }
  }, [inventoryId, row, onSuccess])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!isAllowed}
        aria-label={`Void cut log ${row.cutLogNumber}`}
        className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Void
      </button>
      <ConfirmDialog
        open={isOpen}
        title={`Void ${row.cutLogNumber}?`}
        message={
          <div className="space-y-2 text-sm">
            <p>
              Voiding will erase the cut value, coverage, cost, and freight on
              this cut log. The row stays as a void marker; before / after
              and link history are preserved.
            </p>
            {error ? (
              <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
        }
        confirmLabel={isFiring ? "Voiding..." : "Void cut log"}
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (isFiring) return
          setIsOpen(false)
          setError(null)
        }}
      />
    </>
  )
}
