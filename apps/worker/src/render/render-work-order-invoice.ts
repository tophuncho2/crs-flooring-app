import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import type { WorkOrderInvoiceDocument } from "@builders/domain"

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN_X = 42
const TOP_Y = 752
const BOTTOM_Y = 52

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

function buildTableRow(parts: Array<[string, number]>) {
  return parts
    .map(([value, width], index) => {
      const normalized = truncate(value || "-", width)
      return index === parts.length - 1 ? normalized.padEnd(width, " ") : normalized.padEnd(width, " ")
    })
    .join(" ")
}

export async function renderWorkOrderInvoicePdf(workOrderNumber: string, invoice: WorkOrderInvoiceDocument) {
  const pdf = await PDFDocument.create()
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const monoFont = await pdf.embedFont(StandardFonts.Courier)
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cursorY = TOP_Y

  function ensureSpace(requiredHeight: number) {
    if (cursorY - requiredHeight >= BOTTOM_Y) {
      return
    }

    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    cursorY = TOP_Y
  }

  function drawTextLine(value: string, options?: { fontSize?: number; font?: typeof bodyFont }) {
    ensureSpace((options?.fontSize ?? 10) + 8)
    page.drawText(value, {
      x: MARGIN_X,
      y: cursorY,
      size: options?.fontSize ?? 10,
      font: options?.font ?? bodyFont,
      color: rgb(0.08, 0.08, 0.08),
      maxWidth: PAGE_WIDTH - MARGIN_X * 2,
    })
    cursorY -= (options?.fontSize ?? 10) + 6
  }

  function drawSpacer(height = 10) {
    ensureSpace(height)
    cursorY -= height
  }

  function drawSectionHeading(label: string) {
    drawSpacer(6)
    drawTextLine(label, { fontSize: 14, font: headingFont })
  }

  function drawTable(label: string, rows: WorkOrderInvoiceDocument["materialLines"]) {
    drawSectionHeading(label)
    drawTextLine(
      buildTableRow([
        ["Description", 30],
        ["Unit", 8],
        ["Qty", 8],
        ["Unit Price", 12],
        ["Line Total", 12],
      ]),
      { font: monoFont, fontSize: 9 },
    )

    if (rows.length === 0) {
      drawTextLine("No rows", { fontSize: 10, font: bodyFont })
      return
    }

    for (const row of rows) {
      drawTextLine(
        buildTableRow([
          [row.description, 30],
          [row.unit || "-", 8],
          [row.quantity, 8],
          [row.unitPriceLabel, 12],
          [row.lineTotalLabel, 12],
        ]),
        { font: monoFont, fontSize: 9 },
      )

      if (row.notes) {
        drawTextLine(`Notes: ${row.notes}`, { fontSize: 9, font: bodyFont })
      }
    }
  }

  drawTextLine(`Invoice - ${workOrderNumber}`, { fontSize: 20, font: headingFont })
  drawTextLine("Generated from the current work-order record.", { fontSize: 10, font: bodyFont })
  drawSpacer(8)

  for (const field of invoice.headerFields) {
    drawTextLine(`${field.label}: ${field.value}`, { fontSize: 10, font: bodyFont })
  }

  drawTable("Material Items", invoice.materialLines)
  drawTable("Service Items", invoice.serviceLines)

  drawSectionHeading("Totals")
  drawTextLine(`Material Total: ${invoice.totals.materialTotalLabel}`, { fontSize: 11, font: bodyFont })
  drawTextLine(`Service Total: ${invoice.totals.serviceTotalLabel}`, { fontSize: 11, font: bodyFont })
  drawTextLine(`Invoice Total: ${invoice.totals.invoiceTotalLabel}`, { fontSize: 12, font: headingFont })

  return Buffer.from(await pdf.save())
}
