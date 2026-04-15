import { createPrismaPageLoadIssue, getServiceById, isPrismaNotFoundError, listServices, withPrismaConnectivityHandling, type PrismaDetailPageResult, type PrismaPageDataResult } from "@builders/db"
import type { ServiceRow } from "@builders/domain"

export async function getServicesPageData(): Promise<PrismaPageDataResult<ServiceRow[]>> {
  return withPrismaConnectivityHandling(() => listServices())
}

export async function getServiceDetailPageData(id: string): Promise<PrismaDetailPageResult<ServiceRow>> {
  try {
    const service = await getServiceById(id)
    return { ok: true, data: service }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "SERVICE_DETAIL_LOAD_FAILED",
        title: "Service Unavailable",
        message: "The app could not load this service.",
        detail: "The service record could not be loaded.",
      }),
    }
  }
}
