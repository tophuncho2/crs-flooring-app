import {
  countTemplates,
  createPrismaPageLoadIssue,
  getTemplateById,
  isPrismaNotFoundError,
  listTemplates,
  listTemplateOptions,
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

// All form-option fields are powered by async pickers
// (PropertyPicker / ManagementCompanyPicker / JobTypePicker /
// WarehousePicker / CategoryPicker / ProductPicker) which call
// /api/{...}/options on demand; read-only labels come from joined fields
// on TemplateDetail and TemplateMaterialItemRow. No SSR pre-fetch of
// options is required.

export async function getTemplateDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  template: Awaited<ReturnType<typeof getTemplateById>>
}>> {
  try {
    const template = await getTemplateById(id)

    return {
      ok: true,
      data: { template },
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
        detail: "The template record could not be loaded.",
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
