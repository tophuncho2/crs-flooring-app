import {
  createPrismaPageLoadIssue,
  getManufacturerById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { ManufacturerRow } from "@builders/domain"

export type ManufacturerDetailPageData = {
  manufacturer: ManufacturerRow
}

export async function getManufacturerDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<ManufacturerDetailPageData>> {
  try {
    const manufacturer = await getManufacturerById(id)
    return { ok: true, data: { manufacturer } }
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
