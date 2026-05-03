import {
  createPrismaPageLoadIssue,
  getPropertyById,
  isPrismaNotFoundError,
  listManagementCompanyOptions,
  listPropertyOptions,
  listWarehouseOptions,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"

export { listPropertyOptions, getPropertyById }

async function loadPropertyDetailOptions() {
  const [managementOptions, warehouseOptions] = await Promise.all([
    listManagementCompanyOptions(),
    listWarehouseOptions(),
  ])

  return { managementOptions, warehouseOptions }
}

export async function getPropertyCreatePageOptions() {
  return withPrismaConnectivityHandling(() => loadPropertyDetailOptions())
}

export async function getPropertyDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  property: Awaited<ReturnType<typeof getPropertyById>>
  managementOptions: Awaited<ReturnType<typeof loadPropertyDetailOptions>>["managementOptions"]
  warehouseOptions: Awaited<ReturnType<typeof loadPropertyDetailOptions>>["warehouseOptions"]
}>> {
  try {
    const [property, options] = await Promise.all([
      getPropertyById(id),
      loadPropertyDetailOptions(),
    ])

    return {
      ok: true,
      data: {
        property,
        managementOptions: options.managementOptions,
        warehouseOptions: options.warehouseOptions,
      },
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

