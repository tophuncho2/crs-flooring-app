import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"

type ManufacturerWithCount = {
  id: string
  name: string
  companyName: string | null
  website: string | null
  phone: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}

export function isMissingColumnError(error: unknown, columnName: string) {
  return error instanceof Error && error.message.includes(`column \`${columnName}\` does not exist`)
}

export async function findFlooringManufacturers() {
  try {
    return (await prisma.flooringManufacturer.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    })) as ManufacturerWithCount[]
  } catch (error) {
    if (!isMissingColumnError(error, "flooring_manufacturer.phone")) throw error

    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT fm.id, fm.name, fm.website, fm."createdAt", fm."updatedAt",
        COALESCE(pc."productsCount", 0) as "productsCount"
      FROM flooring_manufacturer fm
      LEFT JOIN (
        SELECT "manufacturerId", COUNT(*)::int as "productsCount"
        FROM flooring_product
        GROUP BY "manufacturerId"
      ) pc ON pc."manufacturerId" = fm.id
      ORDER BY fm.name ASC
      `,
    )) as Array<{
      id: string
      name: string
      companyName?: string | null
      website: string | null
      createdAt: Date
      updatedAt: Date
      productsCount: number
    }>

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      companyName: row.companyName ?? null,
      website: row.website,
      phone: null,
      email: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: { products: row.productsCount },
    }))
  }
}

export async function createFlooringManufacturer(data: {
  name: string
  companyName: string | null
  website: string | null
  phone: string | null
  email: string | null
}) {
  try {
    return await prisma.flooringManufacturer.create({
      data,
      include: { _count: { select: { products: true } } },
    })
  } catch (error) {
    if (!isMissingColumnError(error, "flooring_manufacturer.phone")) throw error

    const rows = (await prisma.$queryRawUnsafe(
      `
      INSERT INTO flooring_manufacturer (id, name, website, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, now(), now())
      RETURNING id, name, website, "createdAt", "updatedAt"
      `,
      randomUUID(),
      data.name,
      data.website,
    )) as Array<{
      id: string
      name: string
      companyName?: string | null
      website: string | null
      createdAt: Date
      updatedAt: Date
    }>

    const row = rows[0]
    return { ...row, companyName: null, phone: null, email: null, _count: { products: 0 } }
  }
}

export async function updateFlooringManufacturer(
  id: string,
  data: { name: string; companyName: string | null; website: string | null; phone: string | null; email: string | null },
) {
  try {
    return await prisma.flooringManufacturer.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    })
  } catch (error) {
    if (!isMissingColumnError(error, "flooring_manufacturer.phone")) throw error

    const rows = (await prisma.$queryRawUnsafe(
      `
      UPDATE flooring_manufacturer
      SET name = $2, website = $3, "updatedAt" = now()
      WHERE id = $1
      RETURNING id, name, website, "createdAt", "updatedAt"
      `,
      id,
      data.name,
      data.website,
    )) as Array<{
      id: string
      name: string
      companyName?: string | null
      website: string | null
      createdAt: Date
      updatedAt: Date
    }>

    const row = rows[0]
    const countRows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM flooring_product WHERE "manufacturerId" = $1`,
      id,
    )) as Array<{ count: number }>

    return { ...row, companyName: null, phone: null, email: null, _count: { products: countRows[0]?.count ?? 0 } }
  }
}

export async function findFlooringLocationsForImports() {
  const rows = (await prisma.$queryRawUnsafe(
    `
    SELECT fl.id,
      fl."warehouseId" as "warehouseId",
      fl."locationCode" as "locationCode",
      fl.section as "sectionName",
      fw.name as "warehouseName"
    FROM flooring_location fl
    INNER JOIN flooring_warehouse fw ON fw.id = fl."warehouseId"
    ORDER BY fw.name ASC, fl."locationCode" ASC
    `,
  )) as Array<{
    id: string
    warehouseId: string
    locationCode: string
    sectionName: string | null
    warehouseName: string
  }>

  return rows
}
