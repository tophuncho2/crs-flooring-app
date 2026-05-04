import {
  countTemplates,
  createPrismaPageLoadIssue,
  getProductPickerOptionsByIds,
  getTemplateById,
  isPrismaNotFoundError,
  listJobTypeOptions,
  listManagementCompanyOptions,
  listPropertyOptions,
  listTemplates,
  listTemplateOptions,
  listWarehouseOptions,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { ProductPickerOption, TemplateMaterialItemRow } from "@builders/domain"
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

async function loadTemplateDropdownOptions() {
  const [managementOptions, propertyOptions, jobTypeOptions, warehouseOptions] = await Promise.all([
    listManagementCompanyOptions(),
    listPropertyOptions(),
    listJobTypeOptions(),
    listWarehouseOptions(),
  ])

  return { managementOptions, propertyOptions, jobTypeOptions, warehouseOptions }
}

async function getMaterialItemPickerOptions(
  items: ReadonlyArray<TemplateMaterialItemRow>,
): Promise<Record<string, ProductPickerOption>> {
  const productIds = items
    .map((row) => row.productId)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  if (productIds.length === 0) return {}
  const options = await getProductPickerOptionsByIds(productIds)
  const optionById = new Map(options.map((option) => [option.id, option]))
  const result: Record<string, ProductPickerOption> = {}
  for (const row of items) {
    const option = optionById.get(row.productId)
    if (option) result[row.id] = option
  }
  return result
}

export async function getTemplateCreatePageOptions() {
  return withPrismaConnectivityHandling(() => loadTemplateDropdownOptions())
}

export async function getTemplateDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  template: Awaited<ReturnType<typeof getTemplateById>>
  managementOptions: Awaited<ReturnType<typeof loadTemplateDropdownOptions>>["managementOptions"]
  propertyOptions: Awaited<ReturnType<typeof loadTemplateDropdownOptions>>["propertyOptions"]
  jobTypeOptions: Awaited<ReturnType<typeof loadTemplateDropdownOptions>>["jobTypeOptions"]
  warehouseOptions: Awaited<ReturnType<typeof loadTemplateDropdownOptions>>["warehouseOptions"]
  productPickerOptionsByItemId: Record<string, ProductPickerOption>
}>> {
  try {
    const [template, options] = await Promise.all([
      getTemplateById(id),
      loadTemplateDropdownOptions(),
    ])

    const productPickerOptionsByItemId = await getMaterialItemPickerOptions(template.items)

    return {
      ok: true,
      data: {
        template,
        managementOptions: options.managementOptions,
        propertyOptions: options.propertyOptions,
        jobTypeOptions: options.jobTypeOptions,
        warehouseOptions: options.warehouseOptions,
        productPickerOptionsByItemId,
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
