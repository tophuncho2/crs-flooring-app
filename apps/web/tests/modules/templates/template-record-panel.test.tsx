// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMocks } from "../../helpers/next-navigation-mock"
import { requestJsonMock } from "../../helpers/simple-table-client-mocks"
import { useRecordPageController } from "@/modules/shared/engines/record-view"
import { TemplateRecordPanel } from "@/modules/templates/record/panel/template-record-panel"

vi.mock("@/modules/shared/engines/common/feedback/feedback-states", () => ({
  CenteredErrorState: ({ message }: { message: string }) => <div>{message}</div>,
  CenteredLoadingState: ({ label }: { label: string }) => <div>{label}</div>,
}))

vi.mock("@builders/domain", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@builders/domain")>()
  return {
    ...actual,
    buildRecordSummary: () => ({ materialTotal: 0, serviceTotal: 0, grandTotal: 0 }),
    emptyRecordSummary: () => ({ materialTotal: 0, serviceTotal: 0, grandTotal: 0 }),
  }
})

vi.mock("@/modules/shared/engines/record-view/contracts/material-item-contracts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/contracts/material-item-contracts")>()
  return { ...actual, validateMaterialItemFields: vi.fn(() => ({})) }
})

vi.mock("@/modules/shared/engines/record-view/contracts/service-item-contracts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/contracts/service-item-contracts")>()
  return { ...actual, validateServiceItemFields: vi.fn(() => ({})) }
})

vi.mock("@/modules/shared/engines/record-view/contracts/sales-rep-item-contracts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/contracts/sales-rep-item-contracts")>()
  return { ...actual, validateSalesRepFields: vi.fn(() => ({})) }
})

vi.mock("@/modules/shared/engines/record-view/client/controllers/use-record-detail-controller", async () => {
  const ReactModule = await import("react")

  return {
    useRecordDetailController: ({ initialRecord, toDraft }: { initialRecord: Record<string, unknown>; toDraft: (record: Record<string, unknown>) => unknown }) => {
      const [record, setRecord] = ReactModule.useState(initialRecord)
      const [draft, setDraft] = ReactModule.useState(toDraft(initialRecord))
      const [error, setError] = ReactModule.useState("")

      return {
        record,
        draft,
        setDraft,
        loading: false,
        error,
        setError,
        syncRecord: (nextRecord: Record<string, unknown>, options?: { syncDraft?: boolean }) => {
          setRecord(nextRecord)
          if (options?.syncDraft !== false) setDraft(toDraft(nextRecord))
        },
        clearRecordCache: vi.fn(),
        isDirty: false,
      }
    },
  }
})

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
    items: [],
    serviceItems: [],
    salesReps: [],
    summary: {
      materialItemsCount: 0,
      serviceItemsCount: 0,
      totalItemsCount: 0,
      materialTotal: 0,
      serviceTotal: 0,
      grandTotal: 0,
    },
    expenseSummary: {
      materialTotal: 0,
      serviceTotal: 0,
      customerCost: 0,
      salesRepExpense: 0,
      expenses: 0,
    },
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
  }
}

function renderPanel() {
  function Harness({
    onTemplateDeleted,
  }: {
    onTemplateDeleted?: (templateId: string, propertyId: string) => void
  }) {
    const page = useRecordPageController({
      backHref: "/dashboard/templates",
      dirtyMessage: "Unsaved template changes",
    })

    return (
      <TemplateRecordPanel
        page={page}
        currentUserId="user-1"
        templateId="tpl-1"
        initialTemplate={templateRow()}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        padProductOptions={[{ id: "pad-1", label: "Pad Product" }]}
        productOptions={[{ id: "prod-1", label: "Pad", sendUnit: "SF" }]}
        serviceOptions={[{ id: "svc-1", name: "Install", baseCost: "9.00", unitId: "unit-1", unitName: "SF" }]}
        salesRepOptions={[{ id: "contact-1", name: "Jordan Case" }]}
        unitOptions={[{ id: "unit-1", name: "SF" }]}
        onTemplateDeleted={onTemplateDeleted}
      />
    )
  }

  return render(<Harness />)
}

describe("TemplateRecordPanel", () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.stubGlobal("confirm", vi.fn(() => true))
  })

  it("record-panel save flow PATCHes expected payload", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValue({
      template: { ...templateRow(), templateTag: "Saved", updatedAt: "2026-03-19T01:00:00.000Z" },
    })

    renderPanel()
    await user.clear(screen.getByLabelText("Template Tag"))
    await user.type(screen.getByLabelText("Template Tag"), "Saved")
    await user.click(screen.getByRole("button", { name: "Save Template" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/templates/tpl-1/primary/section",
        expect.objectContaining({
          method: "PATCH",
        }),
      )
    })
  })

  it("record-panel delete uses shared confirmation behavior and removes on success", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    const onTemplateDeleted = vi.fn()
    requestJsonMock.mockResolvedValue({ ok: true })

    function Harness() {
      const page = useRecordPageController({
        backHref: "/dashboard/templates",
        dirtyMessage: "Unsaved template changes",
      })

      return (
        <TemplateRecordPanel
          page={page}
          currentUserId="user-1"
          templateId="tpl-1"
          initialTemplate={templateRow()}
          propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
          warehouseOptions={[]}
          padProductOptions={[]}
          productOptions={[]}
          serviceOptions={[]}
          salesRepOptions={[]}
          unitOptions={[]}
          onTemplateDeleted={onTemplateDeleted}
        />
      )
    }

    render(<Harness />)

    await user.click(screen.getByRole("button", { name: "Delete Template" }))

    expect(window.confirm).toHaveBeenCalledWith("Delete this template? This cannot be undone.")
    await waitFor(() => {
      expect(onTemplateDeleted).toHaveBeenCalledWith("tpl-1", "prop-1")
    })
    expect(navigationMocks.push).toHaveBeenCalledWith("/dashboard/templates", { scroll: false })
  })

  it("record-panel delete failure surfaces the error", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockRejectedValue(new Error("Failed to delete template"))

    renderPanel()
    await user.click(screen.getByRole("button", { name: "Delete Template" }))

    expect(await screen.findByText("Failed to delete template")).toBeTruthy()
  })
})
