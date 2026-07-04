"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { Category, CategoryStats } from "@builders/domain"
import { CategoryRecordPanel } from "./category-record-panel"

export function CategoryDetailClient({
  initialCategory,
  stats,
  backHref,
}: {
  initialCategory: Category
  stats: CategoryStats
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Category"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="Leave this page?"
    >
      {(page) => <CategoryRecordPanel page={page} category={initialCategory} stats={stats} />}
    </RecordDetailClientScaffold>
  )
}
