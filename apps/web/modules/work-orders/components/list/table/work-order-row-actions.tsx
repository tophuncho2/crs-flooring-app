import type { ReactNode } from "react"
import { ClipboardList, FileText, Printer } from "lucide-react"
import type { WorkOrderListRow } from "@builders/domain"
import { RecordOptionsMenu, type RecordOptionsMenuItem } from "@/engines/common"

type WorkOrderPrintKind = "picking-ticket" | "slip" | "requested-materials"

/**
 * Open one of the work order's on-demand print views in a new tab. URLs mirror
 * the work-order record panel's print actions (the single source of truth for
 * the routes); both items are self-contained by the row's id, so no per-host
 * handler threading is needed.
 */
function openWorkOrderPrint(id: string, kind: WorkOrderPrintKind): void {
  if (typeof window === "undefined") return
  window.open(`/print/work-orders/${id}/${kind}`, "_blank", "noopener,noreferrer")
}

/**
 * Build the shared work-order row ⋮ options menu — the two print views
 * (Picking Ticket → Work Order Slip), identical for every `DataTable` host.
 * Slots straight into `DataTable`'s `rowActions`, pairing with the open-↗ button.
 */
export function renderWorkOrderRowActions(row: WorkOrderListRow): ReactNode {
  const items: RecordOptionsMenuItem[] = [
    {
      key: "print-picking-ticket",
      label: "Picking Ticket",
      icon: <Printer size={14} aria-hidden="true" />,
      onClick: () => openWorkOrderPrint(row.id, "picking-ticket"),
    },
    {
      key: "print-slip",
      label: "Work Order Slip",
      icon: <FileText size={14} aria-hidden="true" />,
      onClick: () => openWorkOrderPrint(row.id, "slip"),
    },
    {
      key: "print-requested-materials",
      label: "Requested Materials",
      icon: <ClipboardList size={14} aria-hidden="true" />,
      onClick: () => openWorkOrderPrint(row.id, "requested-materials"),
    },
  ]

  return (
    <RecordOptionsMenu ariaLabel={`Options for work order ${row.workOrderNumber}`} items={items} />
  )
}
