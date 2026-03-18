import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

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

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const name = parseRequiredString(body.name, "name").trim()

    if (id.startsWith("legacy:")) {
      const oldName = id.replace("legacy:", "")
      await prisma.$executeRawUnsafe(
        `
        UPDATE flooring_location
        SET section = $1
        WHERE section = $2
          AND ($3::text IS NULL OR "warehouseId" = $3)
        `,
        name,
        oldName,
        typeof body.warehouseId === "string" ? body.warehouseId : null,
      )

      return NextResponse.json({ section: { id: `legacy:${name}`, name } })
    }

    await ensureRegistryTable()

    const currentRows = (await prisma.$queryRawUnsafe(
      `
      SELECT id, "warehouseId" as "warehouseId", name
      FROM flooring_section_registry
      WHERE id = $1
      `,
      id,
    )) as Array<{ id: string; warehouseId: string; name: string }>

    const current = currentRows[0]
    if (!current) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 })
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE flooring_section_registry
      SET name = $1
      WHERE id = $2
      `,
      name,
      id,
    )

    await prisma.$executeRawUnsafe(
      `
      UPDATE flooring_location
      SET section = $1
      WHERE "warehouseId" = $2
        AND section = $3
      `,
      name,
      current.warehouseId,
      current.name,
    )

    return NextResponse.json({ section: { id, name } })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
