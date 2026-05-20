"use client"

import { SidePanelPreview } from "@/components/side-panel-preview"
import { useCutsOnlyPreview } from "@/modules/work-orders/controllers/record/cuts/use-cuts-only-preview"
import { CutsOnlyPreviewRow } from "./cuts-only-preview-row"

/**
 * Right-side read-only preview of every cut log on this work order.
 * Fresh fetch on open (staleTime / gcTime = 0); no footer; no row
 * actions. Lives outside `RecordMultiSectionPanel` and mounts as a
 * sibling of the files panel.
 */
export function CutsOnlyPreviewPanel({
  open,
  onClose,
  workOrderId,
}: {
  open: boolean
  onClose: () => void
  workOrderId: string
}) {
  const preview = useCutsOnlyPreview({ workOrderId, enabled: open })

  return (
    <SidePanelPreview
      open={open}
      side="right"
      onClose={onClose}
      title="Cuts"
      widthClassName="w-[34rem]"
    >
      {preview.error ? (
        <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-800">
          {preview.error}
        </div>
      ) : null}

      {preview.isLoading ? (
        <div className="rounded-md border border-dashed border-[var(--panel-border)] px-3 py-6 text-center text-xs text-[var(--foreground)]/55">
          Loading cuts…
        </div>
      ) : preview.rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--panel-border)] px-3 py-6 text-center text-xs text-[var(--foreground)]/55">
          No cuts yet.
        </div>
      ) : (
        <div className="rounded-md border border-[var(--panel-border)]">
          {preview.rows.map((row) => (
            <CutsOnlyPreviewRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </SidePanelPreview>
  )
}
