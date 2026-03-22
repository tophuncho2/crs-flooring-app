"use client"

import type { ManufacturerRow } from "../../domain/types"
import { ManufacturerRecordPanel } from "./manufacturer-record-panel"

export function ManufacturerDetailClient({
  manufacturer,
  backHref,
}: {
  manufacturer: ManufacturerRow
  backHref: string
}) {
  return <ManufacturerRecordPanel manufacturer={manufacturer} backHref={backHref} />
}
