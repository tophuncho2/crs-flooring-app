// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { TemplateRecordModal } from "@/features/flooring/templates/components/template-record-modal"

vi.mock("@/features/flooring/templates/components/template-record-panel", () => ({
  TemplateRecordPanel: ({
    templateId,
    onSummaryChange,
  }: {
    templateId: string
    onSummaryChange?: (summary: {
      materialItems: Array<{ quantity: string; unitPrice: string }>
      serviceItems: Array<{ quantity: string; unitPrice: string }>
    }) => void
  }) => {
    React.useEffect(() => {
      onSummaryChange?.({
        materialItems: [{ quantity: "2", unitPrice: "11.00" }],
        serviceItems: [{ quantity: "1", unitPrice: "9.00" }],
      })
    }, [onSummaryChange])

    return <div>{`Template Modal Body ${templateId}`}</div>
  },
}))

function templateRow() {
  return {
    id: "tpl-1",
    templateNumber: "TP-00001",
    templateTag: "Turn",
    propertyId: "prop-1",
    propertyName: "Oak Apartments",
    warehouseId: "",
    warehouseName: "",
    instructions: "",
    templateNotes: "",
    padProductId: "",
    padTypeLabel: "",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
  }
}

describe("TemplateRecordModal", () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the shared template shell title and header summary", async () => {
    render(
      <TemplateRecordModal
        template={templateRow()}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
        warehouseOptions={[]}
        padProductOptions={[]}
        productOptions={[]}
        serviceOptions={[]}
        unitOptions={[]}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText("Template TP-00001")).toBeTruthy()
    expect(screen.getByText("Template Modal Body tpl-1")).toBeTruthy()
    expect(screen.getByText("Material Rows")).toBeTruthy()
    expect(screen.getByText("Service Rows")).toBeTruthy()
  })
})
