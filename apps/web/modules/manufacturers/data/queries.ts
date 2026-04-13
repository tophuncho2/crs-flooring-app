import { createPrismaPageLoadIssue, getManufacturerById, isPrismaNotFoundError, listManufacturers, withPrismaConnectivityHandling, type ManufacturerRecord, type PrismaDetailPageResult } from "@builders/db"

export { listManufacturers, getManufacturerById }

export async function getManufacturersPageData() {
  return withPrismaConnectivityHandling(() => listManufacturers())
}

export async function getManufacturerDetailPageData(id: string): Promise<PrismaDetailPageResult<ManufacturerRecord>> {
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
