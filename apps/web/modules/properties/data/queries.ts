import {
  createPrismaPageLoadIssue,
  getPropertyById,
  isPrismaNotFoundError,
  listPropertyOptions,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"

export { listPropertyOptions, getPropertyById }

// Management-company options are NOT pre-fetched here. The properties
// record view drives that field via ManagementCompanyPicker which calls
// /api/management-companies/options on demand; the saved label comes
// from the joined `managementCompany` field on PropertyDetailRecord.
export async function getPropertyCreatePageOptions() {
  return withPrismaConnectivityHandling(async () => ({}))
}

export async function getPropertyDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<{
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
        detail: "The property record or its supporting options could not be loaded.",
      }),
    }
  }
}
