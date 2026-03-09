import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { getFileFromBucket } from "@/services/s3"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "estimator" })
  if (authError) return authError

  const { id } = await params

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    select: {
      customerFileName: true,
      customerFileMime: true,
    },
  })

  if (!estimate?.customerFileName) {
    return NextResponse.json({ error: "Customer estimate file not found" }, { status: 404 })
  }

  const fileName = estimate.customerFileName
  const mimeType = estimate.customerFileMime ?? "application/pdf"
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
