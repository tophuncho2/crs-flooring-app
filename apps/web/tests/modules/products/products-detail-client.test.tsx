// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMocks, resetNavigationMocks } from "../../helpers/next-navigation-mock"
import { ProductDetailClient } from "@/modules/products/record/detail/product-detail-client"

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
  usePathname: () => "/dashboard/products/prod-1",
  useSearchParams: () => new URLSearchParams(),
}))

function createInventoryRow(overrides: Partial<Parameters<typeof ProductDetailClient>[0]["inventoryRows"][number]> = {}) {
  return {
    id: "inv-1",
    importEntryId: "imp-1",
    importWarehouseId: "wh-1",
    importNumber: "1",
    importTag: "",
    importStatus: "PENDING",
    importTransportType: "PURCHASE_ORDER",
    importWarehouseName: "Main Warehouse",
    productId: "prod-1",
    productName: "Carpet - Plush - Sand",
    stockUnit: "SF",
    itemNumber: "A100",
    dyeLot: "DL-1",
    locationId: "loc-1",
    locationCode: "A1",
    warehouseId: "wh-1",
    warehouseName: "Main Warehouse",
    sectionName: "Showroom",
    stockCount: "20.00",
    cutTotal: "2.00",
    reservedStockCount: "0.00",
    totalAllocated: "0.00",
    unreservedTotal: "0.00",
    availableToAllocate: "0.00",
    runningBalance: "18.00",
    cost: "10.00",
    freight: "5.00",
    pricePerUnit: "0.75",
    notes: "",
    createdAt: "2026-03-23T00:00:00.000Z",
    updatedAt: "2026-03-23T00:00:00.000Z",
    canCreateCutLogs: true,
    cutLogBlockedReason: "",
    cutLogs: [],
    ...overrides,
  }
}

describe("ProductDetailClient", () => {
  afterEach(() => {
    cleanup()
    resetNavigationMocks()
  })

  it("uses the record-view engine shell and canonical inventory row controls", async () => {
    const user = userEvent.setup()

    render(
      <ProductDetailClient
        initialProduct={{
          id: "prod-1",
          name: "Carpet - Plush - Sand",
          categoryId: "cat-1",
          manufacturerId: "man-1",
          manufacturerName: "Acme",
          style: "Plush",
          color: "Sand",
          width: "12ft",
          sheetSize: "",
          thickness: "",
          unitWeight: "",
          baseColor: "Tan",
          coveragePerUnit: "20",
          coverageUnit: "SF",
          photoUrls: [],
          notes: "Primary note",
          createdAt: "2026-03-23T00:00:00.000Z",
          updatedAt: "2026-03-23T00:00:00.000Z",
          category: {
            id: "cat-1",
            name: "Carpet",
            sendUnit: "SY",
            stockUnit: "SF",
            coverageAvailableUnit: "SF",
            itemCoverageUnit: "SF",
          },
        }}
        categoryOptions={[{ id: "cat-1", name: "Carpet", sendUnit: "SY", stockUnit: "SF", coverageAvailableUnit: "SF", itemCoverageUnit: "SF" }]}
        manufacturerOptions={[{ id: "man-1", name: "Acme", website: "", phone: "", email: "" }]}
        inventoryRows={[
          createInventoryRow({
            cutLogs: [
              {
                id: "cut-1",
                inventoryId: "inv-1",
                inventoryLabel: "Main Warehouse / A1 / Item A100",
                itemNumber: "A100",
                before: "20.00",
                cut: "2.00",
                after: "18.00",
                notes: "First cut",
                createdAt: "2026-03-24T00:00:00.000Z",
              },
            ],
          }),
        ]}
        backHref="/dashboard/products"
      />,
    )

    expect(screen.getByText("Product Carpet - Plush - Sand")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Delete Product" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save Product" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Filter" })).toBeNull()
    expect(screen.getByText("Inventory Rows")).toBeTruthy()
    expect(screen.getByText("Main Warehouse / Showroom / A1")).toBeTruthy()
    expect(screen.getByText("IMP-0001")).toBeTruthy()
    expect(screen.queryByText("First cut")).toBeNull()

    await user.click(screen.getByRole("button", { name: "Show cut logs for inventory A100" }))

    expect(screen.getByRole("button", { name: "Hide cut logs for inventory A100" })).toBeTruthy()
    expect(screen.getByText("First cut")).toBeTruthy()
  })

  it("opens inventory rows through the canonical open button", async () => {
    const user = userEvent.setup()

    render(
      <ProductDetailClient
        initialProduct={{
          id: "prod-1",
          name: "Carpet - Plush - Sand",
          categoryId: "cat-1",
          manufacturerId: "man-1",
          manufacturerName: "Acme",
          style: "Plush",
          color: "Sand",
          width: "12ft",
          sheetSize: "",
          thickness: "",
          unitWeight: "",
          baseColor: "Tan",
          coveragePerUnit: "20",
          coverageUnit: "SF",
          photoUrls: [],
          notes: "",
          createdAt: "2026-03-23T00:00:00.000Z",
          updatedAt: "2026-03-23T00:00:00.000Z",
          category: {
            id: "cat-1",
            name: "Carpet",
            sendUnit: "SY",
            stockUnit: "SF",
            coverageAvailableUnit: "SF",
            itemCoverageUnit: "SF",
          },
        }}
        categoryOptions={[{ id: "cat-1", name: "Carpet", sendUnit: "SY", stockUnit: "SF", coverageAvailableUnit: "SF", itemCoverageUnit: "SF" }]}
        manufacturerOptions={[{ id: "man-1", name: "Acme", website: "", phone: "", email: "" }]}
        inventoryRows={[createInventoryRow()]}
        backHref="/dashboard/products"
      />,
    )

    await user.click(screen.getByRole("button", { name: "Open" }))

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/inventory/inv-1?returnTo=%2Fdashboard%2Fproducts%2Fprod-1",
        { scroll: false },
      )
    })
  })
})
