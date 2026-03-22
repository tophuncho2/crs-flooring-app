import { withPrismaConnectivityHandling, createPrismaPageLoadIssue, isPrismaNotFoundError, type PrismaDetailPageResult } from "@/server/db/prisma-errors"
import { prisma } from "@/server/db/prisma"
import { normalizeManufacturer } from "../domain/services"
import type { ManufacturerRow } from "../domain/types"

async function loadManufacturers() {
  const manufacturers = await prisma.flooringManufacturer.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ companyName: "asc" }, { agentName: "asc" }],
  })

  return manufacturers.map(normalizeManufacturer)
}

export async function listManufacturers() {
  return loadManufacturers()
}

export async function getManufacturersPageData() {
  return withPrismaConnectivityHandling(() => loadManufacturers())
}

export async function getManufacturerById(id: string): Promise<ManufacturerRow> {
  const manufacturer = await prisma.flooringManufacturer.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { products: true } } },
  })

  return normalizeManufacturer(manufacturer)
}

export async function getManufacturerDetailPageData(id: string): Promise<PrismaDetailPageResult<ManufacturerRow>> {
  try {
    const manufacturer = await getManufacturerById(id)
    return { ok: true, data: manufacturer }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "MANUFACTURER_DETAIL_LOAD_FAILED",
        title: "Manufacturer Unavailable",
        message: "The app could not load this manufacturer.",
        detail: "The manufacturer record could not be loaded.",
      }),
    }
  }
}
