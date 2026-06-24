import {
  createPrismaPageLoadIssue,
  getEntityTypeDetailById,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { EntityType } from "@builders/domain"

export type EntityTypeDetailPageData = {
  entityType: EntityType
  previousEntityTypeId: string | null
  nextEntityTypeId: string | null
}

export async function getEntityTypeDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<EntityTypeDetailPageData>> {
  try {
    const detail = await getEntityTypeDetailById(id, { withNeighbors: true })
    if (!detail) {
      return { ok: false, notFound: true }
    }
    const { previousEntityType, nextEntityType, ...entityType } = detail
    return {
      ok: true,
      data: {
        entityType,
        previousEntityTypeId: previousEntityType?.id ?? null,
        nextEntityTypeId: nextEntityType?.id ?? null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "ENTITY_TYPE_DETAIL_LOAD_FAILED",
        title: "Entity Type Unavailable",
        message: "The app could not load this entity type.",
        detail: "The entity type record could not be loaded.",
      }),
    }
  }
}
