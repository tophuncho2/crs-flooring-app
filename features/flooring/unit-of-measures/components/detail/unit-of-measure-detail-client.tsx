"use client"

import { UnitOfMeasureRecordPanel } from "./unit-of-measure-record-panel"
import type { UnitOfMeasureRow } from "../../domain/types"

export function UnitOfMeasureDetailClient({
  unitOfMeasure,
  canManage,
  backHref,
}: {
  unitOfMeasure: UnitOfMeasureRow
  canManage: boolean
  backHref: string
}) {
  return (
    <UnitOfMeasureRecordPanel unitOfMeasure={unitOfMeasure} canManage={canManage} backHref={backHref} />
  )
}
