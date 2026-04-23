import {
  countProperties,
  createPrismaPageLoadIssue,
  getPropertyById,
  isPrismaNotFoundError,
  listManagementCompanyOptions,
  listProperties,
  listPropertyOptions,
  listWarehouseOptions,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"
import { createServerPagination, type ServerTableQueryState } from "@/server/pagination"

function toListSort(tableState: ServerTableQueryState) {
  return {
    direction: tableState.isAscendingSort ? ("asc" as const) : ("desc" as const),
    groupByKeys: tableState.groupByKeys,
    isGroupingEnabled: tableState.isGroupingEnabled,
  }
}

export { listProperties, listPropertyOptions, getPropertyById }

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

async function loadPropertiesPageData(page: number, tableState: ServerTableQueryState) {
  const totalItems = await countProperties({ searchQuery: tableState.searchQuery })
  const pagination = createServerPagination({ page, totalItems })
  const [initialProperties, managementOptions] = await Promise.all([
    listProperties({
      searchQuery: tableState.searchQuery,
      sort: toListSort(tableState),
      pagination: { skip: pagination.skip, take: pagination.take },
    }),
    listManagementCompanyOptions(),
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    initialProperties,
    managementOptions,
  }
}

export async function getPropertiesPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming(
      {
        loader: "flooring.properties.list",
        details: {
          page,
          searchQuery: tableState.searchQuery,
          groupCount: tableState.groupByKeys.length,
        },
      },
      () => loadPropertiesPageData(page, tableState),
    ),
  )
}
