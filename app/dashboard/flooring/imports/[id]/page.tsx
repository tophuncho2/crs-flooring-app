import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/detail-routes"
import { getImportById, getImportsPageData } from "@/features/flooring/imports/queries"
import { ImportDetailClient } from "@/features/flooring/imports/components/import-detail-client"

export default async function ImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const [entry, pageData] = await Promise.all([
      getImportById(id),
      getImportsPageData(1, {
        searchQuery: "",
        isAscendingSort: false,
        isGroupingEnabled: false,
        groupByKeys: [],
      }),
    ])

    if (!pageData.ok) {
      throw new Error("Failed to load import detail options")
    }

    return (
      <ImportDetailClient
        initialImport={entry}
        productOptions={pageData.data.productOptions}
        warehouseOptions={pageData.data.warehouseOptions}
        locationOptions={pageData.data.locationOptions}
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/imports")}
      />
    )
  } catch {
    notFound()
  }
}
