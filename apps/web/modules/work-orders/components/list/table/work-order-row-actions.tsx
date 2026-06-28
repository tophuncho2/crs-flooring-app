import type { ReactNode } from "react"
import { Printer } from "lucide-react"
import type { WorkOrderListRow } from "@builders/domain"
import { RecordOptionsMenu, type RecordOptionsMenuItem } from "@/engines/common"

/**
 * Open the work order's on-demand print configurator in a new tab. The URL
 * mirrors the work-order record panel's Print action (the single source of
 * truth for the route); the document type is picked inside the configurator,
 * so one entry point covers all three documents.
 */
function openWorkOrderPrint(id: string): void {
  if (typeof window === "undefined") return
  window.open(`/print/work-orders/${id}`, "_blank", "noopener,noreferrer")
}

/**
 * Build the shared work-order row ⋮ options menu — a single Print entry that
 * opens the configurator, identical for every `DataTable` host. Slots straight
 * into `DataTable`'s `rowActions`, pairing with the open-↗ button.
 */
export function renderWorkOrderRowActions(row: WorkOrderListRow): ReactNode {
  const items: RecordOptionsMenuItem[] = [
    {
      key: "print",
      label: "Print",
      icon: <Printer size={14} aria-hidden="true" />,
      onClick: () => openWorkOrderPrint(row.id),
    },
  ]

  return (
    <RecordOptionsMenu ariaLabel={`Options for work order ${row.workOrderNumber}`} items={items} />
  )
}
