import { prisma } from "@/lib/prisma"
import { uploadFileToBucket } from "@/services/s3"

type EstimateItemForFile = {
  room: string
  quantity: unknown
  unitOfMeasure: string
  altUnitOfMeasure: string | null
  product: {
    name: string
    customerCost: unknown
  }
}

type EstimateForFile = {
  id: string
  jobName: string
  jobAddress: string
  propertyAddress: string
  propertyContact: string
  unitNumber: string
  createdAt: Date
  items: EstimateItemForFile[]
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeRoom(room: string): string {
  const trimmed = room.trim()
  return trimmed === "" ? "General" : trimmed
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildCustomerEstimateHtml(estimate: EstimateForFile): { html: string; totalCost: number } {
  const grouped = new Map<string, Array<EstimateItemForFile & { lineTotal: number }>>()
  let totalCost = 0

  for (const item of estimate.items) {
    const lineTotal = toNumber(item.quantity) * toNumber(item.product.customerCost)
    totalCost += lineTotal
    const room = normalizeRoom(item.room)

    if (!grouped.has(room)) {
      grouped.set(room, [])
    }

    grouped.get(room)?.push({ ...item, lineTotal })
  }

  const roomSections = Array.from(grouped.entries())
    .map(([room, items]) => {
      const rows = items
        .map((item) => {
          const quantity = toNumber(item.quantity)
          const altUnit = item.altUnitOfMeasure?.trim() ? ` (${escapeHtml(item.altUnitOfMeasure)})` : ""

          return `
            <tr>
              <td>${escapeHtml(item.product.name)}</td>
              <td>${quantity.toFixed(2)}</td>
              <td>${escapeHtml(item.unitOfMeasure)}${altUnit}</td>
              <td class=\"money\">${formatCurrency(item.lineTotal)}</td>
            </tr>
          `
        })
        .join("")

      const roomTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

      return `
        <section class=\"room\">
          <h2>${escapeHtml(room)}</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit of Measure</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan=\"3\" class=\"subtotal-label\">Room Subtotal</td>
                <td class=\"money\">${formatCurrency(roomTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      `
    })
    .join("")

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset=\"UTF-8\" />
        <title>Estimate ${escapeHtml(estimate.id)}</title>
        <style>
          body { font-family: Helvetica, Arial, sans-serif; margin: 28px; color: #1f2937; }
          header { margin-bottom: 20px; }
          h1 { margin: 0; font-size: 22px; }
          .meta { margin-top: 8px; color: #4b5563; font-size: 12px; line-height: 1.5; }
          .room { margin-top: 16px; }
          h2 { margin: 0 0 8px 0; font-size: 16px; color: #111827; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          thead th { background: #f3f4f6; }
          .money { text-align: right; white-space: nowrap; }
          .subtotal-label { text-align: right; font-weight: 600; }
          .total { margin-top: 18px; border-top: 2px solid #111827; padding-top: 10px; text-align: right; font-size: 18px; font-weight: 700; }
          .note { margin-top: 6px; text-align: right; color: #6b7280; font-size: 11px; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(estimate.jobName || "Estimate")}</h1>
          <div class=\"meta\">
            <div><strong>Job Address:</strong> ${escapeHtml(estimate.jobAddress || "-")}</div>
            <div><strong>Property Address:</strong> ${escapeHtml(estimate.propertyAddress || "-")}</div>
            <div><strong>Property Contact:</strong> ${escapeHtml(estimate.propertyContact || "-")}</div>
            <div><strong>Unit:</strong> ${escapeHtml(estimate.unitNumber || "-")}</div>
            <div><strong>Created:</strong> ${escapeHtml(estimate.createdAt.toLocaleString())}</div>
          </div>
        </header>

        ${roomSections || "<p>No estimate items found.</p>"}

        <div class=\"total\">Total Cost: ${formatCurrency(totalCost)}</div>
        <div class=\"note\">Customer estimate file (markup percentage excluded).</div>
      </body>
    </html>
  `

  return { html, totalCost }
}

async function generatePdfBuffer(html: string): Promise<Buffer> {
  type PdfMargins = {
    top: string
    right: string
    bottom: string
    left: string
  }
  type PdfOptions = {
    format: string
    printBackground: boolean
    margin: PdfMargins
  }
  type BrowserPage = {
    setContent: (content: string, options: { waitUntil: string }) => Promise<void>
    pdf: (options: PdfOptions) => Promise<Uint8Array | Buffer>
  }
  type BrowserInstance = {
    newPage: () => Promise<BrowserPage>
    close: () => Promise<void>
  }
  type PuppeteerLike = {
    launch: (options: { headless: boolean; args: string[] }) => Promise<BrowserInstance>
  }
  type PuppeteerModule = {
    default?: PuppeteerLike
    launch?: PuppeteerLike["launch"]
  }

  let puppeteerModule: PuppeteerModule

  try {
    puppeteerModule = (await (Function("return import('puppeteer')")() as Promise<{
      default?: PuppeteerLike
      launch?: PuppeteerLike["launch"]
    }>))
  } catch {
    throw new Error("Puppeteer is not installed. Install dependency 'puppeteer' to generate estimate files.")
  }

  const puppeteer = puppeteerModule.default ?? puppeteerModule
  if (!puppeteer?.launch) {
    throw new Error("Puppeteer failed to load")
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

function buildFileName(jobName: string, estimateId: string): string {
  const slug = (jobName.trim() || `estimate-${estimateId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${slug || `estimate-${estimateId}`}-customer-estimate.pdf`
}

export async function generateAndStoreCustomerEstimateFile(estimateId: string) {
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    select: {
      id: true,
      jobName: true,
      jobAddress: true,
      propertyAddress: true,
      propertyContact: true,
      unitNumber: true,
      createdAt: true,
      items: {
        orderBy: [{ room: "asc" }, { createdAt: "asc" }],
        select: {
          room: true,
          quantity: true,
          unitOfMeasure: true,
          altUnitOfMeasure: true,
          product: {
            select: {
              name: true,
              customerCost: true,
            },
          },
        },
      },
    },
  })

  if (!estimate) {
    throw new Error("Estimate not found")
  }

  const { html } = buildCustomerEstimateHtml(estimate)
  const pdfBuffer = await generatePdfBuffer(html)
  const fileName = buildFileName(estimate.jobName, estimate.id)
  await uploadFileToBucket(pdfBuffer, fileName, "application/pdf")

  return prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      customerFileName: fileName,
      customerFileMime: "application/pdf",
      customerFileData: null,
      customerFileAt: new Date(),
    },
    select: {
      id: true,
      propertyAddress: true,
      propertyContact: true,
      unitNumber: true,
      jobName: true,
      jobAddress: true,
      notes: true,
      markupPercentage: true,
      createdAt: true,
      updatedAt: true,
      customerFileName: true,
      customerFileMime: true,
      customerFileAt: true,
      items: {
        select: {
          room: true,
          productId: true,
          quantity: true,
          unitOfMeasure: true,
          altUnitOfMeasure: true,
        },
      },
    },
  })
}
