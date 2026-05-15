"use client"

import { Printer } from "lucide-react"
import { RecordHeaderActionLink } from "@/components/panels/record-action-buttons"

export function InventoryPrintButton({ recordId }: { recordId: string }) {
  return (
    <RecordHeaderActionLink
      href={`/print/inventory/${recordId}`}
      target="_blank"
      rel="noopener"
    >
      <Printer size={16} />
      <span>Print</span>
    </RecordHeaderActionLink>
  )
}
