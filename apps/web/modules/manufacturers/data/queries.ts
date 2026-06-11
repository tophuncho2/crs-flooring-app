import {
  createPrismaPageLoadIssue,
  getManufacturerById,
  getManufacturerStats,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { ManufacturerRow, ManufacturerStats } from "@builders/domain"

export type ManufacturerDetailPageData = {
  manufacturer: ManufacturerRow
  stats: ManufacturerStats
}

export async function getManufacturerDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<ManufacturerDetailPageData>> {
  try {
    const manufacturer = await getManufacturerById(id)
    const stats = (await getManufacturerStats(id)) ?? { productsCount: 0, importsCount: 0 }
    return { ok: true, data: { manufacturer, stats } }
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
