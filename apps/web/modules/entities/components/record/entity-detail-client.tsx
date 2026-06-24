"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { EntityDetail } from "@builders/domain"
import { EntityRecordView } from "./entity-record-view"

export function EntityDetailClient({
  entity,
  backHref,
}: {
  entity: EntityDetail
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Entity Hub"
      backHref={backHref}
      dirtyMessage="You have unsaved entity changes. Leave without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <EntityRecordView page={page} entry={entity} />
      )}
    </RecordDetailClientScaffold>
  )
}
