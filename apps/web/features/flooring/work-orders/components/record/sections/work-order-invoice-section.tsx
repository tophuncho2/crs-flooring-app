"use client"

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
  isGenerating,
  onQueueInvoice,
  onOpenInvoice,
  onOpenChange,
}: {
  invoice: WorkOrderInvoiceStatusResponse
  error?: string | null
  isLoading?: boolean
  isGenerating: boolean
  onQueueInvoice: () => void
  onOpenInvoice: () => void
  onOpenChange?: (open: boolean) => void
}) {
  const statusLabel = readInvoiceStatusLabel(invoice)

  return (
    <RecordSectionShell title="Invoice" bodyClassName="space-y-4" defaultOpen={false} onOpenChange={onOpenChange}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onQueueInvoice}
          disabled={isGenerating}
          className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium transition hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {isGenerating ? "Generating Invoice..." : "Generate Invoice"}
        </button>
        <button
          type="button"
          onClick={onOpenInvoice}
          disabled={!invoice.canOpen}
          className="rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm font-medium transition hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          Open Invoice
        </button>
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} inline-flex items-center border px-3 py-2 text-sm font-medium`}>
          Status: {statusLabel}
        </div>
        {invoice.artifact?.fileName ? (
          <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} inline-flex items-center border px-3 py-2 text-sm text-[var(--foreground)]/75`}>
            {invoice.artifact.fileName}
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <p className="text-sm text-[var(--foreground)]/70">Loading invoice status...</p>
      ) : null}
      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      <p className="text-sm text-[var(--foreground)]/70">
        Use <span className="font-medium text-[var(--foreground)]">Open Invoice</span> to view a generated invoice.
      </p>
    </RecordSectionShell>
  )
}
