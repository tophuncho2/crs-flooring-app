import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function normalizeImportEntry(entry: {
  id: string
  importName: string
  importType: string
  status: string
  source: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: entry.id,
    importName: entry.importName,
    importType: entry.importType,
    status: entry.status,
    source: entry.source ?? "",
    notes: entry.notes ?? "",
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const entry = await prisma.flooringImportEntry.update({
      where: { id },
      data: {
        importName: parseRequiredString(body.importName, "importName"),
        importType: parseRequiredString(body.importType, "importType"),
        status: parseRequiredString(body.status, "status"),
        source: parseOptionalString(body.source),
        notes: parseOptionalString(body.notes),
      },
    })

    return NextResponse.json({ import: normalizeImportEntry(entry) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    await prisma.flooringImportEntry.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
