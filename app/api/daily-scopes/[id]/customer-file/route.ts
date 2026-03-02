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

  const scope = await prisma.dailyScope.findUnique({
    where: { id },
    select: {
      customerFileData: true,
      customerFileName: true,
      customerFileMime: true,
    },
  })

  if (!scope || !scope.customerFileData) {
    return NextResponse.json({ error: "Daily scope file not found" }, { status: 404 })
  }

  const fileName = scope.customerFileName ?? `daily-scope-${id}-invoice.pdf`
  const mimeType = scope.customerFileMime ?? "application/pdf"
  const sourceBytes = Uint8Array.from(scope.customerFileData)
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
