// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMocks, resetNavigationMocks } from "./helpers/next-navigation-mock"
import { ProductDetailClient } from "@/features/flooring/products/components/detail/product-detail-client"

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
  usePathname: () => "/dashboard/flooring/test",
  useSearchParams: () => new URLSearchParams(),
}))

describe("ProductDetailClient", () => {
  afterEach(() => {
    cleanup()
    resetNavigationMocks()
  })

  it("uses the shared record width, footer actions, and inventory child-table shell", () => {
    resetNavigationMocks()

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
          photoUrls: ["https://storage.example.com/builders-app/uploads/photo-1.png"],
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
        inventoryRows={[
          {
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
            stockCount: "20",
            cutTotal: "2",
            runningBalance: "18",
            cost: "10",
            freight: "5",
            notes: "",
            createdAt: "2026-03-23T00:00:00.000Z",
            updatedAt: "2026-03-23T00:00:00.000Z",
            cutLogs: [],
          },
        ]}
        backHref="/dashboard/flooring/products"
      />,
    )

    expect(screen.getByRole("heading", { name: "Carpet - Plush - Sand" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save Product" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Delete Product" })).toBeTruthy()
    expect(screen.queryByText("Open an inventory row to manage cuts and running balance in its own detail page.")).toBeNull()
    expect(screen.getByRole("heading", { name: "Inventory Rows" })).toBeTruthy()
    expect(screen.getByText("$15.00")).toBeTruthy()
    expect(within(screen.getByRole("table")).getByText("Main Warehouse")).toBeTruthy()
    expect(within(screen.getByRole("table")).getByText("Cost")).toBeTruthy()
    expect(within(screen.getByRole("table")).getByText("Freight")).toBeTruthy()
    expect(screen.getByAltText("Product photo 1")).toBeTruthy()

    fireEvent.click(screen.getByText("A100"))
    expect(navigationMocks.push).not.toHaveBeenCalled()
  })

  it("filters child inventory rows locally by status and warehouse", async () => {
    resetNavigationMocks()
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
        inventoryRows={[
          {
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
            stockCount: "20",
            cutTotal: "2",
            runningBalance: "18",
            cost: "10",
            freight: "5",
            notes: "",
            createdAt: "2026-03-23T00:00:00.000Z",
            updatedAt: "2026-03-23T00:00:00.000Z",
            cutLogs: [],
          },
          {
            id: "inv-2",
            importEntryId: "",
            importWarehouseId: "",
            importNumber: "",
            importTag: "",
            importStatus: "FINAL",
            importTransportType: "",
            importWarehouseName: "",
            productId: "prod-1",
            productName: "Carpet - Plush - Sand",
            stockUnit: "SF",
            itemNumber: "B200",
            dyeLot: "DL-2",
            locationId: "loc-2",
            locationCode: "B2",
            warehouseId: "wh-2",
            warehouseName: "Overflow Warehouse",
            sectionName: "Reserve",
            stockCount: "15",
            cutTotal: "1",
            runningBalance: "14",
            cost: "12",
            freight: "3",
            notes: "",
            createdAt: "2026-03-23T00:00:00.000Z",
            updatedAt: "2026-03-23T00:00:00.000Z",
            cutLogs: [],
          },
        ]}
        backHref="/dashboard/flooring/products"
      />,
    )

    const inventorySection = screen.getAllByRole("heading", { name: "Inventory Rows" })[0]?.closest("section")
    if (!inventorySection) {
      throw new Error("Inventory Rows section not found")
    }
    const inventoryTable = within(inventorySection).getAllByRole("table")[0]!

    await user.click(within(inventorySection).getAllByRole("button", { name: "Pending" })[0]!)
    expect(within(inventoryTable).getByText("A100")).toBeTruthy()
    expect(within(inventoryTable).queryByText("B200")).toBeNull()

    await user.click(within(inventorySection).getAllByRole("button", { name: "All" })[0]!)
    fireEvent.change(within(inventorySection).getByLabelText("Warehouse"), { target: { value: "wh-2" } })
    expect(within(inventoryTable).queryByText("A100")).toBeNull()
    expect(within(inventoryTable).getByText("B200")).toBeTruthy()
  })
})
