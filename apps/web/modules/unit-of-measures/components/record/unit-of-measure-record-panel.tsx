"use client"

import {
  RecordEntityFooter,
  RecordFieldSection,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { UnitOfMeasure, UnitOfMeasureStats } from "@builders/domain"
import { UnitOfMeasurePrimaryFieldsSection } from "./primary/unit-of-measure-primary-fields-section"

// Read-only panel: static fields + a Close-only footer. No save controller and
// no delete (units are seed-managed) — the field section's save/dirty are
// inert, mirroring the invites read-only detail.
export function UnitOfMeasureRecordPanel({
  page,
  unitOfMeasure,
  stats,
}: {
  page: RecordDetailClientScaffoldContext
  unitOfMeasure: UnitOfMeasure
  stats: UnitOfMeasureStats
}) {
  return (
    <>
      <RecordFieldSection
        title="Unit of Measure"
        showHeader={false}
        isDirty={false}
        isSaving={false}
        hasConflict={false}
        onSave={() => {}}
        onDiscard={() => {}}
      >
        <UnitOfMeasurePrimaryFieldsSection unitOfMeasure={unitOfMeasure} stats={stats} />
      </RecordFieldSection>
      <RecordEntityFooter onClose={page.closePage} />
    </>
  )
}
