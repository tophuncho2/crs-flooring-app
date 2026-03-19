import { describe, expect, it, vi } from "vitest"
import { validateInventoryLocationSelection } from "@/server/flooring/location-integrity"

function createDbMock(overrides: Partial<{
  location: unknown
  importEntry: unknown
}> = {}) {
  return {
    flooringLocation: {
      findUnique: vi.fn().mockResolvedValue(overrides.location ?? null),
    },
    flooringImportEntry: {
      findUnique: vi.fn().mockResolvedValue(overrides.importEntry ?? null),
    },
  }
}

describe("validateInventoryLocationSelection", () => {
  it("passes when no locationId and no importEntryId are provided", async () => {
    const db = createDbMock()

    await expect(
      validateInventoryLocationSelection(db as never, { locationId: null, importEntryId: null }),
    ).resolves.toEqual({
      importEntry: null,
      location: null,
    })
  })

  it("throws for an invalid importEntryId", async () => {
    const db = createDbMock({ location: null, importEntry: null })

    await expect(
      validateInventoryLocationSelection(db as never, { locationId: null, importEntryId: "imp-1" }),
    ).rejects.toMatchObject({
      message: "Import entry is invalid",
      field: "importEntryId",
    })
  })

  it("throws for an invalid locationId", async () => {
    const db = createDbMock({ location: null, importEntry: null })

    await expect(
      validateInventoryLocationSelection(db as never, { locationId: "loc-1", importEntryId: null }),
    ).rejects.toMatchObject({
      message: "Location is invalid",
      field: "locationId",
    })
  })

  it("throws when the location has null or empty section linkage", async () => {
    const dbWithNullSection = createDbMock({
      location: { id: "loc-1", warehouseId: "wh-1", sectionId: null },
    })
    const dbWithEmptySection = createDbMock({
      location: { id: "loc-1", warehouseId: "wh-1", sectionId: "" },
    })

    await expect(
      validateInventoryLocationSelection(dbWithNullSection as never, { locationId: "loc-1", importEntryId: null }),
    ).rejects.toMatchObject({
      message: "Location must belong to a section",
      field: "locationId",
    })

    await expect(
      validateInventoryLocationSelection(dbWithEmptySection as never, { locationId: "loc-1", importEntryId: null }),
    ).rejects.toMatchObject({
      message: "Location must belong to a section",
      field: "locationId",
    })
  })

  it("throws when the location warehouse does not match the import warehouse", async () => {
    const db = createDbMock({
      location: { id: "loc-1", warehouseId: "wh-1", sectionId: "sec-1" },
      importEntry: { id: "imp-1", warehouseId: "wh-2" },
    })

    await expect(
      validateInventoryLocationSelection(db as never, { locationId: "loc-1", importEntryId: "imp-1" }),
    ).rejects.toMatchObject({
      message: "Location does not belong to the selected import warehouse",
      field: "locationId",
    })
  })

  it("passes for a valid location and import combination", async () => {
    const db = createDbMock({
      location: { id: "loc-1", warehouseId: "wh-1", sectionId: "sec-1" },
      importEntry: { id: "imp-1", warehouseId: "wh-1" },
    })

    await expect(
      validateInventoryLocationSelection(db as never, { locationId: "loc-1", importEntryId: "imp-1" }),
    ).resolves.toEqual({
      location: { id: "loc-1", warehouseId: "wh-1", sectionId: "sec-1" },
      importEntry: { id: "imp-1", warehouseId: "wh-1" },
    })
  })
})
