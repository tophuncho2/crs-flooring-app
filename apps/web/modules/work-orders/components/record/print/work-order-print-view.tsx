"use client"

import { useEffect } from "react"

/**
 * Generic work-order print view. Receives a pre-built HTML fragment from a
 * domain builder (`buildWorkOrderSlipHtml` / `buildWorkOrderPickingTicketHtml`)
 * and injects it, then auto-fires the print dialog on mount — mirroring the
 * inventory print view. Used by both `/print/work-orders/[id]/slip` and
 * `…/picking-ticket`.
 */
export function WorkOrderPrintView({ html }: { html: string }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = "CRS Floor Covering"
    window.print()
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <main className="mx-auto max-w-4xl bg-white px-8 py-10 text-black print:max-w-none print:p-0">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  )
}
