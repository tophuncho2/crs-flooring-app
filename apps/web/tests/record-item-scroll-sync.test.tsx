// @vitest-environment jsdom

import React from "react"
import { describe, expect, it } from "vitest"
import { fireEvent, render } from "@testing-library/react"
import {
  RecordAllocationItemRow,
  RecordAllocationItemsPanel,
  RecordItemCell,
  RecordItemSection,
  RecordRowLayout,
  RecordSectionItem,
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
      {[0, 1].map((rowIndex) => (
        <RecordSectionItem
          key={rowIndex}
          nestedContent={(
            <RecordAllocationItemsPanel>
              {[0].map((allocationIndex) => (
                <RecordAllocationItemRow key={allocationIndex}>
                  <RecordRowLayout columns={ALLOCATION_COLUMNS}>
                    <RecordItemCell columnKey="inventory" tone="allocation">
                      Allocation {rowIndex + 1}
                    </RecordItemCell>
                  </RecordRowLayout>
                </RecordAllocationItemRow>
              ))}
            </RecordAllocationItemsPanel>
          )}
        >
          <RecordRowLayout columns={ITEM_COLUMNS}>
            <RecordItemCell columnKey="name">Row {rowIndex + 1}</RecordItemCell>
          </RecordRowLayout>
        </RecordSectionItem>
      ))}
    </RecordItemSection>
  )
}

describe("Record item section scroll sync", () => {
  it("syncs parent rows and allocation rows through one section scroll contract", () => {
    const { container } = render(<SyncHarness />)
    const scrollContainers = Array.from(container.querySelectorAll(".overflow-x-auto")) as HTMLDivElement[]

    expect(scrollContainers).toHaveLength(4)

    const [parentOne, allocationOne, parentTwo, allocationTwo] = scrollContainers

    parentOne.scrollLeft = 96
    fireEvent.scroll(parentOne)

    expect(parentTwo.scrollLeft).toBe(96)
    expect(allocationOne.scrollLeft).toBe(96)
    expect(allocationTwo.scrollLeft).toBe(96)

    allocationOne.scrollLeft = 144
    fireEvent.scroll(allocationOne)

    expect(allocationTwo.scrollLeft).toBe(144)
    expect(parentOne.scrollLeft).toBe(144)
    expect(parentTwo.scrollLeft).toBe(144)
  })
})
