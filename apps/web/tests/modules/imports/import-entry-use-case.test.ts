import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createImportEntryUseCase,
  updateImportEntryUseCase,
} from "@/modules/imports/application/import-entry"

const {
  createImportEntryMock,
  updateImportEntryMock,
  normalizeImportEntryMock,
} = vi.hoisted(() => ({
  createImportEntryMock: vi.fn(),
  updateImportEntryMock: vi.fn(),
  normalizeImportEntryMock: vi.fn((value) => value),
}))

vi.mock("@/modules/imports/data/api", () => ({
  createImportEntry: createImportEntryMock,
  updateImportEntry: updateImportEntryMock,
  removeImportEntryIfEmpty: vi.fn(),
  normalizeImportEntry: normalizeImportEntryMock,
}))

vi.mock("@/modules/imports/data/queries", () => ({
  getImportFormOptions: vi.fn(),
}))

describe("import entry use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows creating imports before any inventory rows exist", async () => {
    createImportEntryMock.mockResolvedValue({ id: "imp-1", inventories: [] })

    const result = await createImportEntryUseCase({
      transportType: "PURCHASE_ORDER",
      status: "PENDING",
      warehouseId: "wh-1",
      items: [],
    })

    expect(createImportEntryMock).toHaveBeenCalledWith({
      transportType: "PURCHASE_ORDER",
      status: "PENDING",
      warehouseId: "wh-1",
      items: [],
    })
    expect(result).toEqual({ id: "imp-1", inventories: [] })
  })

  it("allows updating imports after all inventory rows are removed", async () => {
    updateImportEntryMock.mockResolvedValue({ id: "imp-1", inventories: [] })

    const result = await updateImportEntryUseCase("imp-1", {
      transportType: "PURCHASE_ORDER",
      status: "FINAL",
      warehouseId: "wh-1",
      items: [],
    })

    expect(updateImportEntryMock).toHaveBeenCalledWith("imp-1", {
      transportType: "PURCHASE_ORDER",
      status: "FINAL",
      warehouseId: "wh-1",
      items: [],
    })
    expect(result).toEqual({ id: "imp-1", inventories: [] })
  })
})
