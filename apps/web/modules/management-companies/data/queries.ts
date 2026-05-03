import {
  createPrismaPageLoadIssue,
  getManagementCompanyById,
  isPrismaNotFoundError,
  listManagementCompanyOptions,
  type PrismaDetailPageResult,
} from "@builders/db"

export { listManagementCompanyOptions, getManagementCompanyById }

export async function getManagementCompanyDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  company: Awaited<ReturnType<typeof getManagementCompanyById>>
}>> {
  try {
    return {
      ok: true,
      data: {
        company: await getManagementCompanyById(id),
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "MANAGEMENT_COMPANY_DETAIL_LOAD_FAILED",
        title: "Management Company Unavailable",
        message: "The app could not load this management company.",
        detail: "The management company record could not be loaded.",
      }),
    }
  }
}

