import {
  countManagementCompanies,
  createPrismaPageLoadIssue,
  getManagementCompanyById,
  isPrismaNotFoundError,
  listManagementCompanies,
  listManagementCompanyOptions,
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

export { listManagementCompanies, listManagementCompanyOptions, getManagementCompanyById }

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

async function loadManagementCompaniesPageData(page: number, tableState: ServerTableQueryState) {
  const totalItems = await countManagementCompanies({ searchQuery: tableState.searchQuery })
  const pagination = createServerPagination({ page, totalItems })
  const initialCompanies = await listManagementCompanies({
    searchQuery: tableState.searchQuery,
    sort: toListSort(tableState),
    pagination: { skip: pagination.skip, take: pagination.take },
  })

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    initialCompanies,
  }
}

export async function getManagementCompaniesPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming(
      {
        loader: "flooring.management-companies.list",
        details: {
          page,
          searchQuery: tableState.searchQuery,
          groupCount: tableState.groupByKeys.length,
        },
      },
      () => loadManagementCompaniesPageData(page, tableState),
    ),
  )
}
