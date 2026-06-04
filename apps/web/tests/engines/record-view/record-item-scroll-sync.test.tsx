// @vitest-environment jsdom

import React from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render } from "@testing-library/react"
import {
  RecordItemCell,
  RecordItemSection,
  RecordScopedRow,
  RecordSectionGrid,
  RecordSectionGridRow,
  type RecordRowColumnSpec,
  type RecordGridLayout,
} from "@/engines/record-view"

const ITEM_COLUMNS: RecordRowColumnSpec[] = [
  { key: "name", label: "Name", kind: "text", minWidth: 220, preferredWidth: 240, grow: 1 },
]

const ALLOCATION_COLUMNS: RecordRowColumnSpec[] = [
  { key: "inventory", label: "Inventory", kind: "text", minWidth: 220, preferredWidth: 240, grow: 1, tone: "allocation" },
]

const ALLOCATION_LAYOUT: RecordGridLayout = { dataColumns: ALLOCATION_COLUMNS }

function SyncHarness() {
  return (
    <RecordItemSection title="Rows">
      <RecordSectionGrid columns={ITEM_COLUMNS}>
        {[0, 1].map((rowIndex) => (
          <React.Fragment key={rowIndex}>
            <RecordSectionGridRow
              columns={ITEM_COLUMNS}
            >
              <RecordItemCell columnKey="name" chrome="grid">Row {rowIndex + 1}</RecordItemCell>
            </RecordSectionGridRow>
            <RecordScopedRow layout={ALLOCATION_LAYOUT} rowTone="allocation">
              <RecordItemCell columnKey="inventory" chrome="grid" tone="allocation">
                Allocation {rowIndex + 1}
              </RecordItemCell>
            </RecordScopedRow>
          </React.Fragment>
        ))}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}

describe("Record item section scroll sync", () => {
  it("primary and scoped rows share a single scroll container", () => {
    const { container } = render(<SyncHarness />)
    const scrollContainers = Array.from(container.querySelectorAll(".overflow-x-auto")) as HTMLDivElement[]

    expect(scrollContainers).toHaveLength(1)

    const sectionGrid = scrollContainers[0]
    sectionGrid.scrollLeft = 96
    fireEvent.scroll(sectionGrid)

    expect(sectionGrid.scrollLeft).toBe(96)
  })
})
