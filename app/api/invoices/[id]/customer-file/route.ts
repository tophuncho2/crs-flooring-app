import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { prisma } from "@/lib/prisma"
import { getFileFromBucket } from "@/services/s3"

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
      customerFileName: true,
      customerFileMime: true,
    },
  })

  if (!invoice?.customerFileName) {
    return NextResponse.json({ error: "Customer invoice file not found" }, { status: 404 })
  }

  const fileName = invoice.customerFileName
  const mimeType = invoice.customerFileMime ?? "application/pdf"
  const file = await getFileFromBucket(fileName)

  return new NextResponse(file.data, {
    status: 200,
    headers: {
      "Content-Type": file.contentType || mimeType,
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  })
}
