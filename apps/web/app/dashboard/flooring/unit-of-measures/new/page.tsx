import { requireUnitOfMeasuresAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/flooring/shared/record-page/detail-routes"
import { UnitOfMeasureCreateClient } from "@/features/flooring/unit-of-measures/record/create/unit-of-measure-create-client"

export default async function UnitOfMeasureCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireUnitOfMeasuresAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <UnitOfMeasureCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/unit-of-measures")}
    />
  )
}
