import {
  countTemplates,
  createPrismaPageLoadIssue,
  getTemplateById,
  isPrismaNotFoundError,
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

// Property / management-company / job-type options are NOT pre-fetched
// here. Those fields are powered by async pickers (PropertyPicker /
// ManagementCompanyPicker / JobTypePicker) which call
// /api/{properties,management-companies,job-types}/options on demand;
// read-only labels come from joined fields on TemplateDetail.
async function loadTemplateDropdownOptions() {
  const warehouseOptions = await listWarehouseOptions()
  return { warehouseOptions }
}

// Product + category options are NOT pre-fetched here. The templates
// material-items section drives those fields via async pickers
// (CategoryPicker / ProductPicker) which call /api/{categories,products}/options
// on demand; read-only labels come from joined fields on
// TemplateMaterialItemRow (productName + sendUnitAbbrev).
async function loadTemplateDetailOptions() {
  return loadTemplateDropdownOptions()
}

export async function getTemplateCreatePageOptions() {
  return withPrismaConnectivityHandling(() => loadTemplateDropdownOptions())
}

export async function getTemplateDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  template: Awaited<ReturnType<typeof getTemplateById>>
  warehouseOptions: Awaited<ReturnType<typeof loadTemplateDetailOptions>>["warehouseOptions"]
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
