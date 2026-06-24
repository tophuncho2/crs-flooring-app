"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { EntityType } from "@builders/domain"
import { EntityTypeRecordPanel } from "./entity-type-record-panel"

export function EntityTypeDetailClient({
  initialEntityType,
  backHref,
  previousEntityTypeId,
  nextEntityTypeId,
}: {
  initialEntityType: EntityType
  backHref: string
  previousEntityTypeId: string | null
  nextEntityTypeId: string | null
}) {
  return (
    <RecordDetailClientScaffold
      title="Entity Types Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved entity type changes. Leave this page without saving?"
    >
      {(page) => (
        <EntityTypeRecordPanel
          page={page}
          entry={initialEntityType}
          previousEntityTypeId={previousEntityTypeId}
          nextEntityTypeId={nextEntityTypeId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
