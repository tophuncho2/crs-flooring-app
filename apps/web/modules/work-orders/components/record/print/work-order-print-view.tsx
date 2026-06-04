"use client"

import { useEffect, useRef } from "react"

/**
 * Generic work-order print view. Receives a pre-built HTML fragment from a
 * domain builder (`buildWorkOrderSlipHtml` / `buildWorkOrderPickingTicketHtml`)
 * and injects it, then auto-fires the print dialog on mount — mirroring the
 * inventory print view. Used by both `/print/work-orders/[id]/slip` and
 * `…/picking-ticket`.
 *
 * The fragment can include a remote brand logo (a presigned bucket URL), so we
 * wait for any injected images to finish loading before printing — otherwise
 * the auto-print can race the logo fetch and print a blank spot. A short
 * timeout keeps a slow/broken asset from blocking the dialog indefinitely.
 */
export function WorkOrderPrintView({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = "CRS Floor Covering"

    let cancelled = false

    const printWhenReady = async () => {
      const container = containerRef.current
      if (container) {
        const pending = Array.from(container.querySelectorAll("img"))
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true })
                img.addEventListener("error", () => resolve(), { once: true })
              }),
          )
        if (pending.length > 0) {
          const timeout = new Promise<void>((resolve) => {
            setTimeout(resolve, 1500)
          })
          await Promise.race([Promise.all(pending), timeout])
        }
      }
      if (!cancelled) {
        window.print()
      }
    }

    void printWhenReady()

    return () => {
      cancelled = true
      document.title = previousTitle
    }
  }, [])

  return (
    <main className="mx-auto max-w-4xl bg-white px-8 py-10 text-black print:max-w-none print:p-0">
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  )
}
