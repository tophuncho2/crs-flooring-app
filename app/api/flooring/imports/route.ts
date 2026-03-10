import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

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

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const entries = await prisma.flooringImportEntry.findMany({
      orderBy: [{ createdAt: "desc" }, { importName: "asc" }],
    })

    return NextResponse.json({ imports: entries.map(normalizeImportEntry) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const entry = await prisma.flooringImportEntry.create({
      data: {
        importName: parseRequiredString(body.importName, "importName"),
        importType: parseRequiredString(body.importType, "importType"),
        status: parseRequiredString(body.status, "status"),
        source: parseOptionalString(body.source),
        notes: parseOptionalString(body.notes),
      },
    })

    return NextResponse.json({ import: normalizeImportEntry(entry) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
