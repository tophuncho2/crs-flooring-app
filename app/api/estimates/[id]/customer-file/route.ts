import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  const { id } = await params

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    select: {
      customerFileData: true,
      customerFileName: true,
      customerFileMime: true,
    },
  })

  if (!estimate || !estimate.customerFileData) {
    return NextResponse.json({ error: "Customer estimate file not found" }, { status: 404 })
  }

  const fileName = estimate.customerFileName ?? `estimate-${id}-customer-estimate.pdf`
  const mimeType = estimate.customerFileMime ?? "application/pdf"

  return new NextResponse(estimate.customerFileData, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  })
}
