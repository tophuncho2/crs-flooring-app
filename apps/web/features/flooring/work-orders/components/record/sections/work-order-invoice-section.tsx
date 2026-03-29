"use client"

import {
  formatRecordSectionWorkflowPhase,
  type RecordSectionWorkflowPhase,
} from "@/features/dashboard/shared/record-view/client/use-record-section-workflow"
import {
  RecordSectionActionPanel,
  RecordSectionStatusBadge,
} from "@/features/dashboard/shared/record-view/sections/record-section-action-panel"
import { RecordSectionShell } from "@/features/dashboard/shared/record-view/sections/record-section-shell"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "@/features/dashboard/shared/record-view/sections/record-section-tokens"
import type { WorkOrderInvoiceStatusResponse } from "@/features/flooring/work-orders/transport/invoice"

function readInvoiceStatusLabel(invoice: WorkOrderInvoiceStatusResponse) {
  if (invoice.generation?.status) {
    return invoice.generation.status.replaceAll("_", " ")
  }

  if (invoice.canOpen) {
    return "READY"
  }

  return "NOT GENERATED"
}

export function WorkOrderInvoiceSection({
  invoice,
  error,
  isLoading,
  workflowPhase,
  isStalled = false,
  onQueueInvoice,
  onOpenInvoice,
  onOpenChange,
}: {
  invoice: WorkOrderInvoiceStatusResponse
  error?: string | null
  isLoading?: boolean
  workflowPhase: RecordSectionWorkflowPhase
  isStalled?: boolean
  onQueueInvoice: () => void
  onOpenInvoice: () => void
  onOpenChange?: (open: boolean) => void
}) {
  const statusLabel = readInvoiceStatusLabel(invoice)
  const isPending = workflowPhase === "requested" || workflowPhase === "queued" || workflowPhase === "processing"
  const workflowTone =
    workflowPhase === "completed"
      ? "success"
      : workflowPhase === "failed" || workflowPhase === "superseded"
        ? "error"
        : isPending
          ? "processing"
          : "neutral"

  return (
    <RecordSectionShell
      title="Invoice"
      bodyClassName="space-y-4"
      defaultOpen={false}
      onOpenChange={onOpenChange}
      statusPanel={
        <RecordSectionActionPanel
          summary="Invoice generation is worker-backed. Generate when needed, then open the current invoice artifact from this section."
          status={
            <>
              <RecordSectionStatusBadge tone={workflowTone}>
                Invoice: {formatRecordSectionWorkflowPhase(workflowPhase)}
              </RecordSectionStatusBadge>
              <RecordSectionStatusBadge tone={invoice.canOpen ? "success" : "neutral"}>
                {invoice.canOpen ? "Ready to open" : "No current invoice"}
              </RecordSectionStatusBadge>
              <RecordSectionStatusBadge tone={invoice.generation?.status === "FAILED" ? "error" : "neutral"}>
                Status: {statusLabel}
              </RecordSectionStatusBadge>
              {isStalled ? <RecordSectionStatusBadge tone="warning">Polling Slowed</RecordSectionStatusBadge> : null}
            </>
          }
          error={error}
          actions={
            <>
              <button
                type="button"
                onClick={onQueueInvoice}
                disabled={isPending}
                className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium transition hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                {isPending ? "Generating Invoice..." : "Generate Invoice"}
              </button>
              <button
                type="button"
                onClick={onOpenInvoice}
                disabled={!invoice.canOpen}
                className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium transition hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                Open Invoice
              </button>
            </>
          }
        />
      }
    >
      {isLoading ? (
        <p className="text-sm text-[var(--foreground)]/70">Loading invoice status...</p>
      ) : null}
      {invoice.artifact?.fileName ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} flex flex-wrap items-center gap-3 border px-4 py-3 text-sm`}>
          <span className="font-medium text-[var(--foreground)]">Current Artifact</span>
          <span className="text-[var(--foreground)]/75">{invoice.artifact.fileName}</span>
        </div>
      ) : (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border border-dashed px-4 py-6 text-sm text-[var(--foreground)]/65`}>
          No current invoice artifact is available for this work order version.
        </div>
      )}
    </RecordSectionShell>
  )
}
