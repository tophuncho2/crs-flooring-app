import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RegistrySectionRow = {
  id: string
  warehouseId: string
  name: string
}

type LegacyLocationRow = {
  section: string | null
}

async function ensureRegistryTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS flooring_section_registry (
      id text PRIMARY KEY,
      "warehouseId" text NOT NULL,
      name text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("warehouseId", name)
    )
  `)
}

export async function GET(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = parseOptionalString(searchParams.get("warehouseId"))

    await ensureRegistryTable()

    const registryRows = (await prisma.$queryRawUnsafe(
      `
      SELECT id, "warehouseId" as "warehouseId", name
      FROM flooring_section_registry
      WHERE ($1::text IS NULL OR "warehouseId" = $1)
      ORDER BY name ASC
      `,
      warehouseId,
    )) as RegistrySectionRow[]

    let legacyRows: LegacyLocationRow[] = []
    try {
      legacyRows = (await prisma.$queryRawUnsafe(
        `
        SELECT DISTINCT section
        FROM flooring_location
        WHERE section IS NOT NULL
          AND trim(section) <> ''
          AND ($1::text IS NULL OR "warehouseId" = $1)
        `,
        warehouseId,
      )) as LegacyLocationRow[]
    } catch {
      legacyRows = []
    }

    const names = new Set(registryRows.map((row) => row.name.trim()).filter(Boolean))
    for (const row of legacyRows) {
      if (row.section?.trim()) names.add(row.section.trim())
    }

    let locationCounts = new Map<string, number>()
    try {
      const countRows = (await prisma.$queryRawUnsafe(
        `
        SELECT section, COUNT(*)::int AS count
        FROM flooring_location
        WHERE section IS NOT NULL
          AND trim(section) <> ''
          AND ($1::text IS NULL OR "warehouseId" = $1)
        GROUP BY section
        `,
        warehouseId,
      )) as Array<{ section: string; count: number }>

      locationCounts = new Map(countRows.map((row) => [row.section.trim(), Number(row.count)]))
    } catch {
      locationCounts = new Map()
    }

    const sections = Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => {
        const found = registryRows.find((row) => row.name === name)
        return {
          id: found?.id ?? `legacy:${name}`,
          warehouseId: found?.warehouseId ?? warehouseId,
          name,
          locationsCount: locationCounts.get(name) ?? 0,
        }
      })

    return NextResponse.json({ sections })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const warehouseId = parseRequiredString(body.warehouseId, "warehouseId")
    const name = parseRequiredString(body.name, "name").trim()

    await ensureRegistryTable()

    const id = randomUUID()
    const rows = (await prisma.$queryRawUnsafe(
      `
      INSERT INTO flooring_section_registry (id, "warehouseId", name)
      VALUES ($1, $2, $3)
      ON CONFLICT ("warehouseId", name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id, "warehouseId" as "warehouseId", name
      `,
      id,
      warehouseId,
      name,
    )) as RegistrySectionRow[]

    const created = rows[0]
    return NextResponse.json({ section: { id: created.id, warehouseId: created.warehouseId, name: created.name, locationsCount: 0 } }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
