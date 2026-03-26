// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useRecordLineItemsController } from "@/features/flooring/shared/controllers/record-items/use-record-line-items-controller"
import { useRecordSalesRepsController } from "@/features/flooring/shared/controllers/record-items/use-record-sales-reps-controller"

type SalesRepItem = {
  id: string
  contactId: string
  contactName: string
  percent: string
}

type MaterialItem = {
  id: string
  productId: string
  productName: string
  quantity: string
  unitPrice: string
  notes: string
}

type ServiceItem = {
  id: string
  serviceId: string
  name: string
  unitId: string
  quantity: string
  unitPrice: string
  notes: string
}

type RecordShape = {
  salesReps: SalesRepItem[]
  items: MaterialItem[]
  serviceItems: ServiceItem[]
}

const notices = {
  clearNotices: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}

describe("record item controller sync effects", () => {
  it("does not repopulate sales reps when only the extractor callback identity changes", () => {
    const record: RecordShape = {
      salesReps: [{ id: "rep-1", contactId: "contact-1", contactName: "Jordan Case", percent: "10.00" }],
      items: [],
      serviceItems: [],
    }
    const setItems = vi.fn()

    const { rerender } = renderHook(
      ({ getItemsFromRecord }) =>
        useRecordSalesRepsController({
          record,
          notices,
          clearParentError: vi.fn(),
          salesRepCollection: {
            items: [],
            setItems,
            loading: false,
            adding: false,
            savingItemId: null,
            deletingItemId: null,
            createItem: vi.fn(),
            updateItem: vi.fn(),
            deleteItem: vi.fn(),
          },
          initialDraft: { contactId: "", percent: "" },
          getItemsFromRecord,
          onItemsChanged: vi.fn(),
        }),
      {
        initialProps: {
          getItemsFromRecord: (nextRecord: RecordShape) => nextRecord.salesReps,
        },
      },
    )

    expect(setItems).toHaveBeenCalledTimes(1)
    expect(setItems).toHaveBeenCalledWith(record.salesReps)

    rerender({
      getItemsFromRecord: (nextRecord: RecordShape) => nextRecord.salesReps,
    })

    expect(setItems).toHaveBeenCalledTimes(1)
  })

  it("does not repopulate line items when only the extractor callback identity changes", () => {
    const record: RecordShape = {
      salesReps: [],
      items: [{ id: "item-1", productId: "prod-1", productName: "Oak", quantity: "2", unitPrice: "4.00", notes: "" }],
      serviceItems: [{ id: "svc-1", serviceId: "service-1", name: "Install", unitId: "unit-1", quantity: "1", unitPrice: "9.00", notes: "" }],
    }
    const setMaterialItems = vi.fn()
    const setServiceItems = vi.fn()

    const { rerender } = renderHook(
      ({ getCollectionsFromRecord }) =>
        useRecordLineItemsController({
          record,
          notices,
          clearParentError: vi.fn(),
          materialCollection: {
            items: [],
            setItems: setMaterialItems,
            loading: false,
            adding: false,
            savingItemId: null,
            deletingItemId: null,
            createItem: vi.fn(),
            updateItem: vi.fn(),
            deleteItem: vi.fn(),
          },
          serviceCollection: {
            items: [],
            setItems: setServiceItems,
            loading: false,
            adding: false,
            savingItemId: null,
            deletingItemId: null,
            createItem: vi.fn(),
            updateItem: vi.fn(),
            deleteItem: vi.fn(),
          },
          initialMaterialDraft: { productId: "", quantity: "", unitPrice: "", notes: "" },
          initialServiceDraft: { serviceId: "", name: "", unitId: "", quantity: "", unitPrice: "", notes: "" },
          getCollectionsFromRecord,
          onCollectionsChanged: vi.fn(),
        }),
      {
        initialProps: {
          getCollectionsFromRecord: (nextRecord: RecordShape) => ({
            materialItems: nextRecord.items,
            serviceItems: nextRecord.serviceItems,
          }),
        },
      },
    )

    expect(setMaterialItems).toHaveBeenCalledTimes(1)
    expect(setMaterialItems).toHaveBeenCalledWith(record.items)
    expect(setServiceItems).toHaveBeenCalledTimes(1)
    expect(setServiceItems).toHaveBeenCalledWith(record.serviceItems)

    rerender({
      getCollectionsFromRecord: (nextRecord: RecordShape) => ({
        materialItems: nextRecord.items,
        serviceItems: nextRecord.serviceItems,
      }),
    })

    expect(setMaterialItems).toHaveBeenCalledTimes(1)
    expect(setServiceItems).toHaveBeenCalledTimes(1)
  })
})
