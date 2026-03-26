import { formatStableDate } from "../shared/date-format.js"
import { buildFlooringProductDisplayName } from "../shared/product-display-name.js"
import { buildRecordSummary } from "../shared/record-summary.js"
import { calculateLineTotal, formatCurrencyValue } from "../shared/line-totals.js"

export type WorkOrderInvoiceDocumentInput = {
  workOrderId: string
  workOrderNumber: string
  propertyName: string
  propertyAddress: string
  warehouseName: string
  status: string
  isComplete: boolean
  vacancy: string | null
  scheduledFor: string | null
  unitText: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  items: Array<{
    id: string
    name: string
    style: string | null
    color: string | null
    sendUnit: string
    quantity: string
    unitPrice: string
    notes: string
  }>
  serviceItems: Array<{
    id: string
    name: string
    unitName: string
    quantity: string
    unitPrice: string
    notes: string
  }>
}

export type WorkOrderInvoiceHeaderField = {
  label: string
  value: string
}

export type WorkOrderInvoiceLine = {
  description: string
  unit: string
  quantity: string
  unitPriceLabel: string
  lineTotalLabel: string
  notes: string
}

export type WorkOrderInvoiceDocument = {
  headerFields: WorkOrderInvoiceHeaderField[]
  materialLines: WorkOrderInvoiceLine[]
  serviceLines: WorkOrderInvoiceLine[]
  totals: {
    materialTotal: number
    serviceTotal: number
    invoiceTotal: number
    materialTotalLabel: string
    serviceTotalLabel: string
    invoiceTotalLabel: string
  }
}

function formatStatusLabel(status: string, isComplete: boolean) {
  if (isComplete) {
    return "Complete"
  }

  return status
    .split("_")
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ")
}

function buildInvoiceHeaderFields(input: WorkOrderInvoiceDocumentInput): WorkOrderInvoiceHeaderField[] {
  const fields: Array<WorkOrderInvoiceHeaderField | null> = [
    { label: "Work Order", value: input.workOrderNumber },
    { label: "Property", value: input.propertyName },
    input.propertyAddress ? { label: "Property Address", value: input.propertyAddress } : null,
    input.warehouseName ? { label: "Warehouse", value: input.warehouseName } : null,
    { label: "Status", value: formatStatusLabel(input.status, input.isComplete) },
    input.vacancy ? { label: "Vacancy", value: input.vacancy } : null,
    input.scheduledFor ? { label: "Scheduled Date", value: formatStableDate(input.scheduledFor) } : null,
    input.unitText ? { label: "Unit", value: input.unitText } : null,
    input.unitType ? { label: "Unit Type", value: input.unitType } : null,
    input.customAddress ? { label: "Custom Address", value: input.customAddress } : null,
    input.instructions ? { label: "Instructions", value: input.instructions } : null,
    input.notes ? { label: "Notes", value: input.notes } : null,
  ]

  return fields.filter((field): field is WorkOrderInvoiceHeaderField => Boolean(field))
}

export function buildWorkOrderInvoiceDocument(input: WorkOrderInvoiceDocumentInput): WorkOrderInvoiceDocument {
  const materialLines = input.items.map((item) => ({
    description: buildFlooringProductDisplayName({
      name: item.name,
      style: item.style,
      color: item.color,
    }),
    unit: item.sendUnit,
    quantity: item.quantity,
    unitPriceLabel: formatCurrencyValue(item.unitPrice),
    lineTotalLabel: formatCurrencyValue(calculateLineTotal(item)),
    notes: item.notes,
  }))

  const serviceLines = input.serviceItems.map((item) => ({
    description: item.name,
    unit: item.unitName,
    quantity: item.quantity,
    unitPriceLabel: formatCurrencyValue(item.unitPrice),
    lineTotalLabel: formatCurrencyValue(calculateLineTotal(item)),
    notes: item.notes,
  }))

  const summary = buildRecordSummary({
    materialItems: input.items,
    serviceItems: input.serviceItems,
  })

  return {
    headerFields: buildInvoiceHeaderFields(input),
    materialLines,
    serviceLines,
    totals: {
      materialTotal: summary.materialTotal,
      serviceTotal: summary.serviceTotal,
      invoiceTotal: summary.grandTotal,
      materialTotalLabel: formatCurrencyValue(summary.materialTotal),
      serviceTotalLabel: formatCurrencyValue(summary.serviceTotal),
      invoiceTotalLabel: formatCurrencyValue(summary.grandTotal),
    },
  }
}
