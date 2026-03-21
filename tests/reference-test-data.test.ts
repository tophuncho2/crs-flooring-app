import { describe, expect, it, vi } from "vitest"
import {
  DEFAULT_MANAGEMENT_COMPANY_COUNT,
  DEFAULT_MANUFACTURER_COUNT,
  DEFAULT_PROPERTY_COUNT,
  buildReferenceTestData,
  seedReferenceTestData,
} from "../prisma/reference-test-data.js"

describe("buildReferenceTestData", () => {
  it("builds the requested default dataset shape", () => {
    const data = buildReferenceTestData()

    expect(data.manufacturers).toHaveLength(DEFAULT_MANUFACTURER_COUNT)
    expect(data.managementCompanies).toHaveLength(DEFAULT_MANAGEMENT_COMPANY_COUNT)
    expect(data.properties).toHaveLength(DEFAULT_PROPERTY_COUNT)
    expect(new Set(data.properties.map((property) => property.managementCompanyName)).size).toBe(
      DEFAULT_MANAGEMENT_COMPANY_COUNT,
    )
  })

  it("supports a custom prefix while keeping property links deterministic", () => {
    const data = buildReferenceTestData({ prefix: "QA" })

    expect(data.manufacturers[0]?.companyName).toBe("QA Manufacturer 01")
    expect(data.managementCompanies[0]?.name).toBe("QA Management Company 01")
    expect(data.properties[0]?.managementCompanyName).toBe("QA Management Company 01")
  })
})

describe("seedReferenceTestData", () => {
  it("upserts manufacturers, management companies, and linked properties", async () => {
    const manufacturerUpsert = vi.fn().mockResolvedValue(null)
    const managementCompanyUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: "mc-1", name: "TEST Management Company 01" })
      .mockResolvedValueOnce({ id: "mc-2", name: "TEST Management Company 02" })
      .mockResolvedValueOnce({ id: "mc-3", name: "TEST Management Company 03" })
      .mockResolvedValueOnce({ id: "mc-4", name: "TEST Management Company 04" })
      .mockResolvedValueOnce({ id: "mc-5", name: "TEST Management Company 05" })
    const propertyFindFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "property-2" })
      .mockResolvedValue(null)
      .mockResolvedValue(null)
      .mockResolvedValue(null)
      .mockResolvedValue(null)
      .mockResolvedValue(null)
      .mockResolvedValue(null)
      .mockResolvedValue(null)
      .mockResolvedValue(null)
    const propertyCreate = vi.fn().mockResolvedValue(null)
    const propertyUpdate = vi.fn().mockResolvedValue(null)
    const logger = { log: vi.fn() }

    await expect(
      seedReferenceTestData({
        prisma: {
          flooringManufacturer: { upsert: manufacturerUpsert },
          flooringManagementCompany: { upsert: managementCompanyUpsert },
          property: {
            findFirst: propertyFindFirst,
            create: propertyCreate,
            update: propertyUpdate,
          },
        },
        logger,
      }),
    ).resolves.toEqual({
      prefix: "TEST",
      manufacturers: 5,
      managementCompanies: 5,
      properties: 10,
    })

    expect(manufacturerUpsert).toHaveBeenCalledTimes(5)
    expect(managementCompanyUpsert).toHaveBeenCalledTimes(5)
    expect(propertyFindFirst).toHaveBeenCalledTimes(10)
    expect(propertyCreate).toHaveBeenCalledTimes(9)
    expect(propertyUpdate).toHaveBeenCalledTimes(1)
    expect(propertyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "TEST Property 01",
          managementCompanyId: "mc-1",
        }),
      }),
    )
    expect(propertyUpdate).toHaveBeenCalledWith({
      where: { id: "property-2" },
      data: expect.objectContaining({
        managementCompanyId: "mc-2",
      }),
    })
  })
})
