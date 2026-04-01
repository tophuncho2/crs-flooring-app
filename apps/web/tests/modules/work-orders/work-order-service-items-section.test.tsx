// @vitest-environment jsdom

import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { WorkOrderServiceItemsSection } from "@/modules/work-orders/record/panel/sections/work-order-service-items-section"
import type { EditableServiceItem } from "@/modules/shared/engines/record-view/line-items/service-items-editor"

const serviceOptions = [
  { id: "service-1", name: "Install", baseCost: "12.50", unitId: "unit-1", unitName: "EA" },
]

const unitOptions = [
  { id: "unit-1", name: "EA" },
  { id: "unit-2", name: "LF" },
]

function buildItem(overrides: Partial<EditableServiceItem> = {}): EditableServiceItem {
  return {
    id: "item-1",
    serviceId: "service-1",
    name: "Install",
    unitId: "unit-1",
    unitName: "EA",
    quantity: "2",
    unitPrice: "12.50",
    notes: "",
    updatedAt: "2026-03-30T00:00:00.000Z",
    ...overrides,
  }
}

describe("WorkOrderServiceItemsSection", () => {
  it("renders qty and unit as separate canonical columns", () => {
    const { container } = render(
      <WorkOrderServiceItemsSection
        title="Service Items"
        items={[buildItem()]}
        serviceOptions={serviceOptions}
        unitOptions={unitOptions}
        loading={false}
        onItemFieldChange={vi.fn()}
        onDeleteItem={vi.fn()}
      />,
    )

    expect(screen.getByText("Qty")).toBeTruthy()
    expect(screen.getAllByText("Unit").length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue("2")).toBeTruthy()
    expect(container.querySelectorAll("select")).toHaveLength(2)
  })
})
