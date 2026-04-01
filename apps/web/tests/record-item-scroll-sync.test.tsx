// @vitest-environment jsdom

import React from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render } from "@testing-library/react"
import {
  RecordItemCell,
  RecordItemSection,
  RecordRowLayout,
  RecordSectionGrid,
  RecordSectionGridRow,
  type RecordRowColumnSpec,
} from "@/features/shared/engines/record-view"

const ITEM_COLUMNS: RecordRowColumnSpec[] = [
  { key: "name", label: "Name", kind: "text", minWidth: 220, preferredWidth: 240, grow: 1 },
]

const ALLOCATION_COLUMNS: RecordRowColumnSpec[] = [
  { key: "inventory", label: "Inventory", kind: "text", minWidth: 220, preferredWidth: 240, grow: 1, tone: "allocation" },
]

function SyncHarness() {
  return (
    <RecordItemSection title="Rows">
      <RecordSectionGrid columns={ITEM_COLUMNS}>
        {[0, 1].map((rowIndex) => (
          <RecordSectionGridRow
            key={rowIndex}
            columns={ITEM_COLUMNS}
            scopedContent={(
              <RecordSectionGrid columns={ALLOCATION_COLUMNS} surface="scoped">
                {[0].map((allocationIndex) => (
                  <RecordSectionGridRow
                    key={allocationIndex}
                    columns={ALLOCATION_COLUMNS}
                    rowTone="allocation"
                  >
                    <RecordRowLayout columns={ALLOCATION_COLUMNS}>
                      <RecordItemCell columnKey="inventory" chrome="grid" tone="allocation">
                        Allocation {rowIndex + 1}
                      </RecordItemCell>
                    </RecordRowLayout>
                  </RecordSectionGridRow>
                ))}
              </RecordSectionGrid>
            )}
          >
            <RecordRowLayout columns={ITEM_COLUMNS}>
              <RecordItemCell columnKey="name" chrome="grid">Row {rowIndex + 1}</RecordItemCell>
            </RecordRowLayout>
          </RecordSectionGridRow>
        ))}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}

describe("Record item section scroll sync", () => {
  it("syncs parent rows and allocation rows through one section scroll contract", () => {
    const { container } = render(<SyncHarness />)
    const scrollContainers = Array.from(container.querySelectorAll(".overflow-x-auto")) as HTMLDivElement[]

    expect(scrollContainers).toHaveLength(3)

    const [sectionGrid, allocationOne, allocationTwo] = scrollContainers

    sectionGrid.scrollLeft = 96
    fireEvent.scroll(sectionGrid)

    expect(allocationOne.scrollLeft).toBe(96)
    expect(allocationTwo.scrollLeft).toBe(96)

    allocationOne.scrollLeft = 144
    fireEvent.scroll(allocationOne)

    expect(allocationTwo.scrollLeft).toBe(144)
    expect(sectionGrid.scrollLeft).toBe(144)
  })
})
