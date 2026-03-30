"use client"

import { createWarehouseDetail, type LocationRow, type SectionRow, type WarehouseDetail, type WarehouseRow } from "../types"
import { WarehouseDetailClient as CanonicalWarehouseDetailClient } from "../record/detail/warehouse-detail-client"

export function WarehouseDetailClient({
  warehouse,
  sections,
  locations,
  backHref,
}: {
  warehouse: WarehouseRow | WarehouseDetail
  sections?: SectionRow[]
  locations?: LocationRow[]
  backHref: string
}) {
  const detail =
    "sections" in warehouse && "locations" in warehouse
      ? warehouse
      : createWarehouseDetail(warehouse, sections ?? [], locations ?? [])

  return <CanonicalWarehouseDetailClient warehouse={detail} backHref={backHref} />
}
