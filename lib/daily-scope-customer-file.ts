import { prisma } from "@/lib/prisma"

type DailyScopeItemForFile = {
  room: string
  description: string
}

type DailyScopeForFile = {
  id: string
  jobName: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  createdAt: Date
  items: DailyScopeItemForFile[]
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

function buildDailyScopeHtml(scope: DailyScopeForFile): string {
  const grouped = new Map<string, DailyScopeItemForFile[]>()

  for (const item of scope.items) {
    const room = normalizeRoom(item.room)

    if (!grouped.has(room)) {
      grouped.set(room, [])
    }

    grouped.get(room)?.push(item)
  }

  const roomSections = Array.from(grouped.entries())
    .map(([room, items]) => {
      const rows = items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.description)}</td>
            </tr>
          `,
        )
        .join("")

      return `
        <section class="room">
          <h2>${escapeHtml(room)}</h2>
          <table>
            <thead>
              <tr>
                <th>Scope Line Item</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      `
    })
    .join("")

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Daily Scope ${escapeHtml(scope.id)}</title>
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
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(scope.jobName || "Daily Scope")}</h1>
          <div class="meta">
            <div><strong>Address:</strong> ${escapeHtml(scope.address || "-")}</div>
            <div><strong>Property Name:</strong> ${escapeHtml(scope.propertyName || "-")}</div>
            <div><strong>Contact Name:</strong> ${escapeHtml(scope.contactName || "-")}</div>
            <div><strong>Contact Number:</strong> ${escapeHtml(scope.contactNumber || "-")}</div>
            <div><strong>Created:</strong> ${escapeHtml(scope.createdAt.toLocaleString())}</div>
          </div>
        </header>

        ${roomSections || "<p>No scope line items found.</p>"}
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
    throw new Error("Puppeteer is not installed. Install dependency 'puppeteer' to generate daily scope files.")
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

function buildFileName(jobName: string, scopeId: string): string {
  const slug = (jobName.trim() || `daily-scope-${scopeId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${slug || `daily-scope-${scopeId}`}-daily-scope-invoice.pdf`
}

export async function generateAndStoreDailyScopeFile(dailyScopeId: string) {
  const scope = await prisma.dailyScope.findUnique({
    where: { id: dailyScopeId },
    select: {
      id: true,
      jobName: true,
      address: true,
      propertyName: true,
      contactName: true,
      contactNumber: true,
      createdAt: true,
      items: {
        orderBy: [{ room: "asc" }, { createdAt: "asc" }],
        select: {
          room: true,
          description: true,
        },
      },
    },
  })

  if (!scope) {
    throw new Error("Daily scope not found")
  }

  const html = buildDailyScopeHtml(scope)
  const pdfBuffer = await generatePdfBuffer(html)
  const fileName = buildFileName(scope.jobName, scope.id)

  return prisma.dailyScope.update({
    where: { id: scope.id },
    data: {
      customerFileName: fileName,
      customerFileMime: "application/pdf",
      customerFileData: pdfBuffer,
      customerFileAt: new Date(),
    },
    select: {
      id: true,
      jobId: true,
      jobName: true,
      address: true,
      propertyName: true,
      contactName: true,
      contactNumber: true,
      createdAt: true,
      updatedAt: true,
      customerFileName: true,
      customerFileMime: true,
      customerFileAt: true,
      items: {
        select: {
          room: true,
          description: true,
        },
      },
    },
  })
}
