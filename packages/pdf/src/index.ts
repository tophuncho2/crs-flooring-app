import puppeteer from "puppeteer"

export type PdfRenderOptions = {
  format?: "A4" | "Letter"
  margin?: { top?: string; right?: string; bottom?: string; left?: string }
  printBackground?: boolean
}

export async function renderHtmlToPdf(
  html: string,
  options: PdfRenderOptions = {},
): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdf = await page.pdf({
      format: options.format ?? "Letter",
      printBackground: options.printBackground ?? true,
      margin: options.margin,
    })
    return new Uint8Array(pdf)
  } finally {
    await browser.close()
  }
}
