"use client"

import {
  formatRecordSectionWorkflowPhase,
  type RecordSectionError,
  type RecordSectionWorkflowPhase,
} from "@/features/shared/engines/record-view"
import {
  RecordSectionSubHeader,
  RecordSectionStatusBadge,
  RecordSectionShell,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/features/shared/engines/record-view"
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
  queueButtonLabel = "Generate Invoice",
  onQueueInvoice,
  onOpenInvoice,
  onRefreshStatus,
  onOpenChange,
}: {
  invoice: WorkOrderInvoiceStatusResponse
  error?: RecordSectionError | null
  isLoading?: boolean
  workflowPhase: RecordSectionWorkflowPhase
  isStalled?: boolean
  queueButtonLabel?: string
  onQueueInvoice: () => void
  onOpenInvoice: () => void
  onRefreshStatus?: () => void
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
        <RecordSectionSubHeader
          isDirty={false}
          isSaving={isPending}
          hasConflict={false}
          canManage={false}
          statusExtra={
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
          actions={[
            {
              key: "queue-invoice",
              label: queueButtonLabel,
              onClick: onQueueInvoice,
              disabled: isPending,
            },
            ...(isPending && onRefreshStatus
              ? [{ key: "refresh-invoice-status", label: "Refresh Status", onClick: onRefreshStatus }]
              : []),
            {
              key: "open-invoice",
              label: "Open Invoice",
              onClick: onOpenInvoice,
              disabled: !invoice.canOpen,
            },
          ]}
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
