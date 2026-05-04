import {
  countTemplates,
  createPrismaPageLoadIssue,
  getTemplateById,
  isPrismaNotFoundError,
  listCategories,
  listJobTypeOptions,
  listProductOptions,
  listTemplates,
  listTemplateOptions,
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

export { listTemplates, listTemplateOptions, getTemplateById }

// Property + management-company options are NOT pre-fetched here. The
// templates record view drives those two fields via async pickers
// (PropertyPicker / ManagementCompanyPicker) which call
// /api/{properties,management-companies}/options on demand; read-only
// labels come from joined fields on TemplateDetail.
async function loadTemplateDropdownOptions() {
  const [jobTypeOptions, warehouseOptions] = await Promise.all([
    listJobTypeOptions(),
    listWarehouseOptions(),
  ])

  return { jobTypeOptions, warehouseOptions }
}

async function loadTemplateDetailOptions() {
  const [dropdowns, productOptions, categoryOptions] = await Promise.all([
    loadTemplateDropdownOptions(),
    listProductOptions(),
    listCategories(),
  ])

  return { ...dropdowns, productOptions, categoryOptions }
}

export async function getTemplateCreatePageOptions() {
  return withPrismaConnectivityHandling(() => loadTemplateDropdownOptions())
}

export async function getTemplateDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  template: Awaited<ReturnType<typeof getTemplateById>>
  jobTypeOptions: Awaited<ReturnType<typeof loadTemplateDetailOptions>>["jobTypeOptions"]
  warehouseOptions: Awaited<ReturnType<typeof loadTemplateDetailOptions>>["warehouseOptions"]
  productOptions: Awaited<ReturnType<typeof loadTemplateDetailOptions>>["productOptions"]
  categoryOptions: Awaited<ReturnType<typeof loadTemplateDetailOptions>>["categoryOptions"]
}>> {
  try {
    const [template, options] = await Promise.all([
      getTemplateById(id),
      loadTemplateDetailOptions(),
    ])

    return {
      ok: true,
      data: {
        template,
        jobTypeOptions: options.jobTypeOptions,
        warehouseOptions: options.warehouseOptions,
        productOptions: options.productOptions,
        categoryOptions: options.categoryOptions,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "TEMPLATE_DETAIL_LOAD_FAILED",
        title: "Template Unavailable",
        message: "The app could not load this template.",
        detail: "The template record or its supporting options could not be loaded.",
      }),
    }
  }
}

async function loadTemplatesPageData(page: number, tableState: ServerTableQueryState) {
  const totalItems = await countTemplates({ searchQuery: tableState.searchQuery })
  const pagination = createServerPagination({ page, totalItems })
  const initialTemplates = await listTemplates({
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
    initialTemplates,
  }
}

export async function getTemplatesPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming(
      {
        loader: "flooring.templates.list",
        details: {
          page,
          searchQuery: tableState.searchQuery,
          groupCount: tableState.groupByKeys.length,
        },
      },
      () => loadTemplatesPageData(page, tableState),
    ),
  )
}
