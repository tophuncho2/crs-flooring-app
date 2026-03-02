import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      customerFileData: true,
      customerFileName: true,
      customerFileMime: true,
    },
  })

  if (!invoice || !invoice.customerFileData) {
    return NextResponse.json({ error: "Customer invoice file not found" }, { status: 404 })
  }

  const fileName = invoice.customerFileName ?? `invoice-${id}-invoice.pdf`
  const mimeType = invoice.customerFileMime ?? "application/pdf"
  const sourceBytes = Uint8Array.from(invoice.customerFileData)
  const fileArrayBuffer = new ArrayBuffer(sourceBytes.byteLength)
  new Uint8Array(fileArrayBuffer).set(sourceBytes)
  const fileBlob = new Blob([fileArrayBuffer], { type: mimeType })

  return new NextResponse(fileBlob, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  })
}
