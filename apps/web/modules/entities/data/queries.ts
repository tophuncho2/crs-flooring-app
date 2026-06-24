import {
  createPrismaPageLoadIssue,
  getEntityById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"

export { getEntityById }

export async function getEntityDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  entity: Awaited<ReturnType<typeof getEntityById>>
}>> {
  try {
    const entity = await getEntityById(id)

    return {
      ok: true,
      data: { entity },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "ENTITY_DETAIL_LOAD_FAILED",
        title: "Entity Unavailable",
        message: "The app could not load this entity.",
        detail: "The entity record could not be loaded.",
      }),
    }
  }
}
