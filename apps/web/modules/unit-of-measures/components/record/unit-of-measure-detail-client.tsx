"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { UnitOfMeasure, UnitOfMeasureStats } from "@builders/domain"
import { UnitOfMeasureRecordPanel } from "./unit-of-measure-record-panel"

export function UnitOfMeasureDetailClient({
  initialUnitOfMeasure,
  stats,
  backHref,
}: {
  initialUnitOfMeasure: UnitOfMeasure
  stats: UnitOfMeasureStats
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Unit of Measure"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="Leave this page?"
    >
      {(page) => (
        <UnitOfMeasureRecordPanel page={page} unitOfMeasure={initialUnitOfMeasure} stats={stats} />
      )}
    </RecordDetailClientScaffold>
  )
}
