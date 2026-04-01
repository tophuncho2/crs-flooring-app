import { requireUnitOfMeasuresAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { UnitOfMeasureCreateClient } from "@/modules/unit-of-measures/record/create/unit-of-measure-create-client"

export default async function UnitOfMeasureCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireUnitOfMeasuresAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <UnitOfMeasureCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/unit-of-measures")}
    />
  )
}
