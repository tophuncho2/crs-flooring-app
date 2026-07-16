import {
  createPrismaPageLoadIssue,
  getWorkOrderDocumentTypeDetailById,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { WorkOrderDocumentType } from "@builders/domain"

export type WorkOrderDocumentTypeDetailPageData = {
  workOrderDocumentType: WorkOrderDocumentType
  previousWorkOrderDocumentTypeId: string | null
  nextWorkOrderDocumentTypeId: string | null
}

export async function getWorkOrderDocumentTypeDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<WorkOrderDocumentTypeDetailPageData>> {
  try {
    const detail = await getWorkOrderDocumentTypeDetailById(id, { withNeighbors: true })
    if (!detail) {
      return { ok: false, notFound: true }
    }
    const { previousWorkOrderDocumentType, nextWorkOrderDocumentType, ...workOrderDocumentType } =
      detail
    return {
      ok: true,
      data: {
        workOrderDocumentType,
        previousWorkOrderDocumentTypeId: previousWorkOrderDocumentType?.id ?? null,
        nextWorkOrderDocumentTypeId: nextWorkOrderDocumentType?.id ?? null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "WORK_ORDER_DOCUMENT_TYPE_DETAIL_LOAD_FAILED",
        title: "Document Type Unavailable",
        message: "The app could not load this document type.",
        detail: "The document type record could not be loaded.",
      }),
    }
  }
}
