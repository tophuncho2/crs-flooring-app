import {
  createPrismaPageLoadIssue,
  getPropertyById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"

export { getPropertyById }

export async function getPropertyDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  property: Awaited<ReturnType<typeof getPropertyById>>
}>> {
  try {
    const property = await getPropertyById(id)

    return {
      ok: true,
      data: { property },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "PROPERTY_DETAIL_LOAD_FAILED",
        title: "Property Unavailable",
        message: "The app could not load this property.",
        detail: "The property record could not be loaded.",
      }),
    }
  }
}
