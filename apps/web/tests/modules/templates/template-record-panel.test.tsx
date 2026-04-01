// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
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

vi.mock("@/modules/shared/engines/record-view/line-items/material-items-editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/line-items/material-items-editor")>()

  return {
    ...actual,
    validateMaterialItemFields: vi.fn(() => ({})),
  }
})

vi.mock("@/modules/shared/engines/record-view/line-items/service-items-editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/line-items/service-items-editor")>()

  return {
    ...actual,
    validateServiceItemFields: vi.fn(() => ({})),
  }
})

vi.mock("@/modules/shared/engines/record-view/line-items/sales-rep-items-editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/line-items/sales-rep-items-editor")>()

  return {
    ...actual,
    validateSalesRepFields: vi.fn(() => ({})),
  }
})

vi.mock("@/modules/shared/engines/record-view/line-items/material-items-editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/line-items/material-items-editor")>()

  return {
    ...actual,
    validateMaterialItemFields: vi.fn(() => ({})),
    MaterialItemsEditor: ({
      items,
      onDraftChange,
      onAdd,
      onSaveItem,
      onDeleteItem,
    }: {
      items: Array<{ id: string }>
      onDraftChange: (field: "productId" | "quantity" | "unitPrice" | "notes", value: string) => void
      onAdd: () => void
      onSaveItem: (item: { id: string; productId: string; quantity: string; unitPrice: string; notes: string }) => void
      onDeleteItem: (itemId: string) => void
    }) => (
      <div>
        <div>{`Material count ${items.length}`}</div>
        <button
          type="button"
          onClick={() => {
            onDraftChange("productId", "prod-1")
            onDraftChange("quantity", "2")
            onDraftChange("unitPrice", "4.00")
            void Promise.resolve().then(() => onAdd())
          }}
        >
          Add Material
        </button>
        <button type="button" onClick={() => onSaveItem({ id: items[0]?.id ?? "item-1", productId: "prod-1", quantity: "3", unitPrice: "4.00", notes: "" })}>Save Material</button>
        <button type="button" onClick={() => onDeleteItem(items[0]?.id ?? "item-1")}>Delete Material</button>
      </div>
    ),
  }
})

vi.mock("@/modules/shared/engines/record-view/line-items/service-items-editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/line-items/service-items-editor")>()

  return {
    ...actual,
    validateServiceItemFields: vi.fn(() => ({})),
    ServiceItemsEditor: ({
      items,
      onDraftChange,
      onAdd,
      onSaveItem,
      onDeleteItem,
    }: {
      items: Array<{ id: string }>
      onDraftChange: (field: "serviceId" | "name" | "unitId" | "quantity" | "unitPrice" | "notes", value: string) => void
      onAdd: () => void
      onSaveItem: (item: { id: string; serviceId: string; name: string; unitId: string; quantity: string; unitPrice: string; notes: string }) => void
      onDeleteItem: (itemId: string) => void
    }) => (
      <div>
        <div>{`Service count ${items.length}`}</div>
        <button
          type="button"
          onClick={() => {
            onDraftChange("serviceId", "svc-1")
            onDraftChange("name", "Install")
            onDraftChange("unitId", "unit-1")
            onDraftChange("quantity", "1")
            onDraftChange("unitPrice", "9.00")
            void Promise.resolve().then(() => onAdd())
          }}
        >
          Add Service
        </button>
        <button type="button" onClick={() => onSaveItem({ id: items[0]?.id ?? "svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", quantity: "2", unitPrice: "9.00", notes: "" })}>Save Service</button>
        <button type="button" onClick={() => onDeleteItem(items[0]?.id ?? "svc-1")}>Delete Service</button>
      </div>
    ),
  }
})

vi.mock("@/modules/shared/engines/record-view/line-items/sales-rep-items-editor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/shared/engines/record-view/line-items/sales-rep-items-editor")>()

  return {
    ...actual,
    SalesRepItemsEditor: ({
      items,
      onDraftChange,
      onAdd,
      onSaveItem,
      onDeleteItem,
    }: {
      items: Array<{ id: string }>
      onDraftChange: (field: "contactId" | "percent", value: string) => void
      onAdd: () => void
      onSaveItem: (item: { id: string; contactId: string; contactName: string; percent: string }) => void
      onDeleteItem: (itemId: string) => void
    }) => (
      <div>
        <div>{`Sales rep count ${items.length}`}</div>
        <button
          type="button"
          onClick={() => {
            onDraftChange("contactId", "contact-1")
            onDraftChange("percent", "10.00")
            setTimeout(() => {
              void onAdd()
            }, 0)
          }}
        >
          Add Sales Rep
        </button>
        <button
          type="button"
          onClick={() =>
            onSaveItem({
              id: items[0]?.id ?? "rep-1",
              contactId: "contact-1",
              contactName: "Jordan Case",
              percent: "12.50",
            })
          }
        >
          Save Sales Rep
        </button>
        <button type="button" onClick={() => onDeleteItem(items[0]?.id ?? "rep-1")}>Delete Sales Rep</button>
      </div>
    ),
  }
})

vi.mock("@/modules/shared/engines/record-view/controllers/use-record-sales-reps-controller", async () => {
  const ReactModule = await import("react")

  return {
    useRecordSalesRepsController: () => {
      const [salesReps, setSalesReps] = ReactModule.useState<Array<{ id: string; contactId: string; contactName: string; percent: string }>>([])
      const [draft, setDraft] = ReactModule.useState({ contactId: "", percent: "" })

      return {
        draft,
        draftErrors: {},
        itemErrors: {},
        salesReps,
        salesRepCollection: {
          loading: false,
          adding: false,
          savingItemId: null,
          deletingItemId: null,
        },
        handleDraftChange: (field: "contactId" | "percent", value: string) => {
          setDraft((previous) => ({ ...previous, [field]: value }))
        },
        handleItemFieldChange: (itemId: string, field: "contactId" | "contactName" | "percent", value: string) => {
          setSalesReps((previous) =>
            previous.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
          )
        },
        addItem: async () => {
          setSalesReps((previous) => [
            ...previous,
            {
              id: `rep-${previous.length + 1}`,
              contactId: draft.contactId || "contact-1",
              contactName: "Jordan Case",
              percent: draft.percent || "10.00",
            },
          ])
          setDraft({ contactId: "", percent: "" })
          return true
        },
        saveItem: async (item: { id: string; contactId: string; contactName: string; percent: string }) => {
          setSalesReps((previous) => previous.map((current) => (current.id === item.id ? item : current)))
        },
        deleteItem: async (itemId: string) => {
          setSalesReps((previous) => previous.filter((item) => item.id !== itemId))
        },
      }
    },
  }
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

function getSection(collapseLabel: string) {
  const section = screen.getByRole("button", { name: collapseLabel }).closest("section")

  if (!section) {
    throw new Error(`Section not found for ${collapseLabel}`)
  }

  return section
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

  it("adding, saving, and deleting material items keeps the template panel open and updates panel state", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValueOnce({
      template: {
        ...templateRow(),
        items: [{ id: "item-1", productId: "prod-1", productName: "Pad", sendUnit: "SF", quantity: "2", unitPrice: "4.00", notes: "", createdAt: "", updatedAt: "2026-03-19T00:00:00.000Z" }],
        summary: {
          ...templateRow().summary,
          materialItemsCount: 1,
          totalItemsCount: 1,
        },
      },
    })

    renderPanel()
    const materialSection = getSection("Collapse Material Items")

    await user.click(within(materialSection).getByRole("button", { name: "Add Material Item" }))
    expect(within(materialSection).getByText("1 item")).toBeTruthy()

    await user.click(within(materialSection).getByRole("button", { name: "Save" }))
    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/templates/tpl-1/items/section",
        expect.objectContaining({ method: "PATCH" }),
      )
    })

    await user.click(within(materialSection).getByRole("button", { name: "Remove" }))
    expect(window.confirm).toHaveBeenCalledWith("Delete this material item? This cannot be undone.")
    expect(within(materialSection).getByText("0 items")).toBeTruthy()
    expect(within(materialSection).getByRole("button", { name: "Add Material Item" })).toBeTruthy()
  })

  it("adding, saving, and deleting service items keeps the template panel open and updates panel state", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValueOnce({
      template: {
        ...templateRow(),
        serviceItems: [{ id: "svc-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", unitName: "SF", quantity: "1", unitPrice: "9.00", notes: "", createdAt: "", updatedAt: "2026-03-19T00:00:00.000Z" }],
        summary: {
          ...templateRow().summary,
          serviceItemsCount: 1,
          totalItemsCount: 1,
        },
      },
    })

    renderPanel()
    const serviceSection = getSection("Collapse Service Items")

    await user.click(within(serviceSection).getByRole("button", { name: "Add Service Item" }))
    expect(within(serviceSection).getByText("1 item")).toBeTruthy()

    await user.click(within(serviceSection).getByRole("button", { name: "Save" }))
    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/templates/tpl-1/service-items/section",
        expect.objectContaining({ method: "PATCH" }),
      )
    })

    await user.click(within(serviceSection).getByRole("button", { name: "Remove" }))
    expect(window.confirm).toHaveBeenCalledWith("Delete this service item? This cannot be undone.")
    expect(within(serviceSection).getByText("0 items")).toBeTruthy()
    expect(within(serviceSection).getByRole("button", { name: "Add Service Item" })).toBeTruthy()
  })

  it("adding, saving, and deleting sales reps keeps the template panel open and updates panel state", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockResolvedValueOnce({
      template: {
        ...templateRow(),
        salesReps: [{ id: "rep-1", contactId: "contact-1", contactName: "Jordan Case", percent: "10.00", createdAt: "", updatedAt: "2026-03-19T00:00:00.000Z" }],
        summary: {
          ...templateRow().summary,
          totalItemsCount: 0,
        },
      },
    })

    renderPanel()
    const salesSection = getSection("Collapse Sales Reps")

    await user.click(within(salesSection).getByRole("button", { name: "Add Sales Rep" }))
    expect(within(salesSection).getByText("1 item")).toBeTruthy()

    await user.click(within(salesSection).getByRole("button", { name: "Save" }))
    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/templates/tpl-1/sales-reps/section",
        expect.objectContaining({ method: "PATCH" }),
      )
    })

    await user.click(within(salesSection).getByRole("button", { name: "Remove" }))
    expect(window.confirm).toHaveBeenCalledWith("Delete this sales rep? This cannot be undone.")
    expect(within(salesSection).getByText("0 items")).toBeTruthy()
    expect(within(salesSection).getByRole("button", { name: "Add Sales Rep" })).toBeTruthy()
  })
})
