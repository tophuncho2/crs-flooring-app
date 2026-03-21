import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/detail-routes"
import { getManagementCompanyById } from "@/features/flooring/management-companies/queries"
import { ManagementCompanyDetailClient } from "@/features/flooring/management-companies/components/management-company-detail-client"

export default async function ManagementCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("properties")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const company = await getManagementCompanyById(id)

    return (
      <ManagementCompanyDetailClient
        company={company}
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/management-companies")}
      />
    )
  } catch {
    notFound()
  }
}
