"use client"

import {
  RecordEntityFooter,
  RecordFieldSection,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { Category, CategoryStats } from "@builders/domain"
import { CategoryPrimaryFieldsSection } from "./primary/category-primary-fields-section"

// Read-only panel: static fields + a Close-only footer. No save controller and
// no delete (categories are seed-managed) — the field section's save/dirty are
// inert, mirroring the invites read-only detail.
export function CategoryRecordPanel({
  page,
  category,
  stats,
}: {
  page: RecordDetailClientScaffoldContext
  category: Category
  stats: CategoryStats
}) {
  return (
    <>
      <RecordFieldSection
        title="Category"
        showHeader={false}
        isDirty={false}
        isSaving={false}
        hasConflict={false}
        onSave={() => {}}
        onDiscard={() => {}}
      >
        <CategoryPrimaryFieldsSection category={category} stats={stats} />
      </RecordFieldSection>
      <RecordEntityFooter onClose={page.closePage} />
    </>
  )
}
