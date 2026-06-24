import {
  createPrismaPageLoadIssue,
  getManagementCompanyById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"

export { getManagementCompanyById }

export async function getManagementCompanyDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  managementCompany: Awaited<ReturnType<typeof getManagementCompanyById>>
}>> {
  try {
    const managementCompany = await getManagementCompanyById(id)

    return {
      ok: true,
      data: { managementCompany },
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
