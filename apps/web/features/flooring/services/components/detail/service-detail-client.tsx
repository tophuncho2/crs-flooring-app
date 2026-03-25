"use client"

import type { ServiceRow, UnitOption } from "../../domain/types"
import { ServiceRecordPanel } from "./service-record-panel"

export function ServiceDetailClient({
  service,
  unitOptions,
  backHref,
}: {
  service: ServiceRow
  unitOptions: UnitOption[]
  backHref: string
}) {
  return <ServiceRecordPanel service={service} unitOptions={unitOptions} backHref={backHref} />
}
