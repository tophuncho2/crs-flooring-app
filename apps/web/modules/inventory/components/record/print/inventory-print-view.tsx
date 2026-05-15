"use client"

import { useEffect } from "react"
import type { InventoryDetail } from "@builders/domain"

function formatReceivedAt(value: string): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export function InventoryPrintView({ record }: { record: InventoryDetail }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = "CRS Floor Covering"
    window.print()
    return () => {
      document.title = previousTitle
    }
  }, [])

  const rows: Array<{ label: string; value: string }> = [
    { label: "Inventory Item", value: record.inventoryItem },
    { label: "Import Number", value: record.importNumber },
    { label: "Purchase Order Number", value: record.purchaseOrderNumber },
    { label: "Product Name", value: record.productName },
    { label: "FIFO Received At", value: formatReceivedAt(record.fifoReceivedAt) },
  ]

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-10 text-black print:p-0">
      <h1 className="text-2xl font-semibold">{record.inventoryNumber}</h1>
      <dl className="mt-8 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="font-medium text-black/70">{row.label}</dt>
            <dd className="text-black">{row.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
