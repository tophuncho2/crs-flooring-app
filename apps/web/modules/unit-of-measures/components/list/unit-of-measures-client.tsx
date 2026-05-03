"use client"

import { SectionHeader } from "@/components/headers"
import type { UnitOfMeasureRow } from "../../types"
import { UnitOfMeasuresTable } from "./unit-of-measures-table"

export type UnitOfMeasuresClientProps = {
  initialRows: UnitOfMeasureRow[]
}

export default function UnitOfMeasuresClient({ initialRows }: UnitOfMeasuresClientProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader title="Unit Of Measures" />
        <UnitOfMeasuresTable rows={initialRows} />
      </div>
    </div>
  )
}
