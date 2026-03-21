// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { resetSimpleTableClientMocks } from "./helpers/simple-table-client-mocks"
import { navigationMocks } from "./helpers/next-navigation-mock"
import { PropertyDetailClient } from "@/features/flooring/properties/components/property-detail-client"

vi.mock("@/features/flooring/properties/components/property-record-panel", () => ({
  PropertyRecordPanel: ({
    onOpenTemplate,
  }: {
    onOpenTemplate: (templateId: string) => void
  }) => (
    <div>
      <div>Property Panel</div>
      <button type="button" onClick={() => onOpenTemplate("tpl-1")}>
        Open Nested Template
      </button>
    </div>
  ),
}))

vi.mock("@/features/flooring/templates/components/template-record-panel", () => ({
  TemplateRecordPanel: ({ templateId }: { templateId: string }) => <div>{`Template Screen ${templateId}`}</div>,
}))

vi.mock("@/features/flooring/shared/primary-record-panel", async () => {
  const ReactModule = await import("react")

  return {
    PRIMARY_RECORD_PANEL_WIDTH_CLASS: "max-w-7xl",
    useGuardedPrimaryRecordPanel: () => {
      const [activeRecordId, setActiveRecordId] = ReactModule.useState<string | null>(null)

      return {
        activeRecordId,
        openRecord: (recordId: string) => setActiveRecordId(recordId),
        closeRecord: () => true,
      }
    },
  }
})

vi.mock("@/features/flooring/shared/use-server-table-query-controls", () => ({
  useServerTableQueryControls: ({
    setSearchQuery,
    setIsAscendingSort,
    isAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
  }: {
    setSearchQuery: (value: string) => void
    setIsAscendingSort: (value: boolean) => void
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    setIsGroupingEnabled: (value: boolean) => void
    groupByKeys: string[]
    setGroupByKeys: (value: string[]) => void
  }) => ({
    onSearchQueryChange: setSearchQuery,
    onToggleSort: () => setIsAscendingSort(!isAscendingSort),
    onToggleGrouping: () => setIsGroupingEnabled(!isGroupingEnabled),
    onGroupByKeyAtIndexChange: (index: number, nextKey: string) => {
      const next = [...groupByKeys]
      next[index] = nextKey
      setGroupByKeys(next)
    },
    onAddGroupBy: () => setGroupByKeys([...groupByKeys, ""]),
    onRemoveGroupBy: (index: number) => setGroupByKeys(groupByKeys.filter((_, currentIndex) => currentIndex !== index)),
    onToggleGroupByKey: () => undefined,
  }),
}))

const fetchMock = vi.fn()

function propertyRow() {
  return {
    id: "prop-1",
    name: "Oak Apartments",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    fullAddress: "",
    managementCompany: null,
    templates: [
      {
        id: "tpl-1",
        templateTag: "Turn",
        warehouseName: "Main Warehouse",
        itemsCount: 3,
      },
    ],
  }
}

function templateRow() {
  return {
    id: "tpl-1",
    templateNumber: "TP-00001",
    templateTag: "Turn",
    propertyId: "prop-1",
    propertyName: "Oak Apartments",
    warehouseId: "wh-1",
    warehouseName: "Main Warehouse",
    instructions: "",
    templateNotes: "",
    padProductId: "",
    padTypeLabel: "",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
  }
}

describe("PropertiesClient", () => {
  beforeEach(() => {
    cleanup()
    resetSimpleTableClientMocks()
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("routes linked templates from the canonical property detail page to the shared template detail route", async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, "", "/dashboard/flooring/properties/prop-1")

    render(
      <PropertyDetailClient
        property={propertyRow()}
        managementOptions={[]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        padProductOptions={[]}
        backHref="/dashboard/flooring/properties"
      />,
    )

    await user.click(screen.getByRole("button", { name: "Open Nested Template" }))

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/flooring/templates/tpl-1?returnTo=%2Fdashboard%2Fflooring%2Fproperties%2Fprop-1",
        { scroll: false },
      )
    })
  })
})
