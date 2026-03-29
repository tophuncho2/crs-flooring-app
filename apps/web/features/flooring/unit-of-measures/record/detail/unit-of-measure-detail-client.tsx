"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/features/shared/engines/record-view"
import { UnitOfMeasureRecordPanel } from "../panel/unit-of-measure-record-panel"
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
    <RecordDetailClientScaffold
      title={`Unit Of Measure ${unitOfMeasure.name}`}
      backHref={backHref}
      dirtyMessage="You have unsaved unit of measure changes. Leave this unit of measure without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <UnitOfMeasureRecordPanel page={page} unitOfMeasure={unitOfMeasure} canManage={canManage} />
      )}
    </RecordDetailClientScaffold>
  )
}
