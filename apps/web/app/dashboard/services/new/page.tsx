import { requireServicesAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { ServiceCreateClient } from "@/modules/services/components/record/service-create-client"
import { loadUnitOptions } from "@/modules/services/data/load-unit-options"

export default async function ServiceCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireServicesAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const unitOptions = await loadUnitOptions()

  return (
    <ServiceCreateClient
      unitOptions={unitOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/services")}
    />
  )
}
