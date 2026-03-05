import { prisma } from "@/lib/prisma"
import { uploadFileToBucket } from "@/services/s3"

type InvoiceItemForFile = {
  description: string
  price: unknown
}

type InvoiceForFile = {
  id: string
  jobName: string
  jobAddress: string
  propertyAddress: string
  propertyContact: string
  unitNumber: string
  notes: string | null
  totalCost: unknown
  createdAt: Date
  items: InvoiceItemForFile[]
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildCustomerInvoiceHtml(invoice: InvoiceForFile): string {
  const rows = invoice.items
    .map((item) => {
      const description = item.description.trim() || "Labor"
      const price = toNumber(item.price)

      return `
        <tr>
          <td>${escapeHtml(description)}</td>
          <td class="money">${formatCurrency(price)}</td>
        </tr>
      `
    })
    .join("")

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Invoice ${escapeHtml(invoice.id)}</title>
        <style>
          body { font-family: Helvetica, Arial, sans-serif; margin: 28px; color: #1f2937; }
          header { margin-bottom: 20px; }
          h1 { margin: 0; font-size: 22px; }
          .meta { margin-top: 8px; color: #4b5563; font-size: 12px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          thead th { background: #f3f4f6; }
          .money { text-align: right; white-space: nowrap; }
          .total { margin-top: 18px; border-top: 2px solid #111827; padding-top: 10px; text-align: right; font-size: 18px; font-weight: 700; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(invoice.jobName || "Invoice")}</h1>
          <div class="meta">
            <div><strong>Job Address:</strong> ${escapeHtml(invoice.jobAddress || "-")}</div>
            <div><strong>Property Address:</strong> ${escapeHtml(invoice.propertyAddress || "-")}</div>
            <div><strong>Property Contact:</strong> ${escapeHtml(invoice.propertyContact || "-")}</div>
            <div><strong>Unit:</strong> ${escapeHtml(invoice.unitNumber || "-")}</div>
            <div><strong>Notes:</strong> ${escapeHtml(invoice.notes || "-")}</div>
            <div><strong>Created:</strong> ${escapeHtml(invoice.createdAt.toLocaleString())}</div>
          </div>
        </header>

        <table>
          <thead>
            <tr>
              <th>Labor Item</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>${rows || "<tr><td colspan=\"2\">No labor line items.</td></tr>"}</tbody>
        </table>

        <div class="total">Total Cost: ${formatCurrency(toNumber(invoice.totalCost))}</div>
      </body>
    </html>
  `
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
    throw new Error("Puppeteer is not installed. Install dependency 'puppeteer' to generate invoice files.")
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

function buildFileName(jobName: string, invoiceId: string): string {
  const slug = (jobName.trim() || `invoice-${invoiceId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${slug || `invoice-${invoiceId}`}-invoice.pdf`
}

export async function generateAndStoreCustomerInvoiceFile(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      jobName: true,
      jobAddress: true,
      propertyAddress: true,
      propertyContact: true,
      unitNumber: true,
      notes: true,
      totalCost: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          description: true,
          price: true,
        },
      },
    },
  })

  if (!invoice) {
    throw new Error("Invoice not found")
  }

  const html = buildCustomerInvoiceHtml(invoice)
  const pdfBuffer = await generatePdfBuffer(html)
  const fileName = buildFileName(invoice.jobName, invoice.id)
  await uploadFileToBucket(pdfBuffer, fileName, "application/pdf")

  return prisma.invoice.update({
    where: { id: invoice.id },
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
      totalCost: true,
      createdAt: true,
      updatedAt: true,
      customerFileName: true,
      customerFileMime: true,
      customerFileAt: true,
      items: {
        select: {
          description: true,
          price: true,
        },
      },
    },
  })
}
