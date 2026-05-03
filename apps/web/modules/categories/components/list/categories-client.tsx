"use client"

import { SectionHeader } from "@/components/headers"
import type { CategoryRow } from "../../types"
import { CategoriesTable } from "./categories-table"

export type CategoriesClientProps = {
  initialRows: CategoryRow[]
}

export default function CategoriesClient({ initialRows }: CategoriesClientProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader title="Categories" />
        <CategoriesTable rows={initialRows} />
      </div>
    </div>
  )
}
