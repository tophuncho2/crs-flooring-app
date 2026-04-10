import { describe, expect, it, vi } from "vitest"
import {
  CATEGORY_BLUEPRINTS,
  DEFAULT_IMPORT_COUNT,
  DEFAULT_MANAGEMENT_COMPANY_COUNT,
  DEFAULT_MANUFACTURER_COUNT,
  DEFAULT_PROPERTY_COUNT,
  DEFAULT_WAREHOUSE_COUNT,
  INVENTORY_ITEMS_PER_IMPORT,
  PRODUCTS_PER_CATEGORY,
  TEMPLATE_ITEMS_PER_TEMPLATE,
  TEMPLATE_SERVICE_ITEMS_PER_TEMPLATE,
  buildReferenceTestData,
  seedReferenceTestData,
} from "../../packages/db/scripts/reference-test-data.js"

function decimalLike(value: string | null | undefined) {
  return value === null || value === undefined
    ? null
    : {
        toString() {
          return String(value)
        },
      }
}

describe("buildReferenceTestData", () => {
  it("builds the expanded flooring test dataset shape", () => {
    const data = buildReferenceTestData()

    expect(data.manufacturers).toHaveLength(DEFAULT_MANUFACTURER_COUNT)
    expect(data.managementCompanies).toHaveLength(DEFAULT_MANAGEMENT_COMPANY_COUNT)
    expect(data.properties).toHaveLength(DEFAULT_PROPERTY_COUNT)
    expect(data.categories).toHaveLength(CATEGORY_BLUEPRINTS.length)
    expect(data.services).toHaveLength(CATEGORY_BLUEPRINTS.length)
    expect(data.products).toHaveLength(CATEGORY_BLUEPRINTS.length * PRODUCTS_PER_CATEGORY)
    expect(data.warehouses).toHaveLength(DEFAULT_WAREHOUSE_COUNT)
    expect(data.imports).toHaveLength(DEFAULT_IMPORT_COUNT)
    expect(data.templates).toHaveLength(DEFAULT_PROPERTY_COUNT)
    expect(data.imports[0]?.items).toHaveLength(INVENTORY_ITEMS_PER_IMPORT)
    expect(data.templates[0]?.items).toHaveLength(TEMPLATE_ITEMS_PER_TEMPLATE)
    expect(data.templates[0]?.serviceItems).toHaveLength(TEMPLATE_SERVICE_ITEMS_PER_TEMPLATE)
  })

  it("supports a custom prefix while keeping cross-domain links deterministic", () => {
    const data = buildReferenceTestData({ prefix: "QA" })

    expect(data.manufacturers[0]?.companyName).toBe("QA Manufacturer 01")
    expect(data.managementCompanies[0]?.name).toBe("QA Management Company 01")
    expect(data.properties[0]?.managementCompanyName).toBe("QA Management Company 01")
    expect(data.services[0]?.name.startsWith("QA ")).toBe(true)
    expect(data.warehouses[0]?.name).toBe("QA North Warehouse")
    expect(data.imports[0]?.tag).toBe("QA Import 01")
    expect(data.templates[0]?.templateTag).toBe("QA Template 01")
    expect(data.products[0]?.name.startsWith(`${data.products[0]?.categoryName} - `)).toBe(true)
  })
})

describe("seedReferenceTestData", () => {
  it("seeds the expanded flooring dataset without duplicating deterministic rows", async () => {
    const summary = await seedReferenceTestData({
      prisma: {
        flooringManufacturer: {
          upsert: vi.fn(async ({ where }) => ({ id: `manufacturer:${where.companyName}`, companyName: where.companyName })),
        },
        flooringManagementCompany: {
          upsert: vi.fn(async ({ where }) => ({ id: `management:${where.name}`, name: where.name })),
        },
        property: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async ({ data }) => ({ id: `property:${data.name}`, name: data.name })),
          update: vi.fn(async ({ where }) => ({ id: where.id, name: "updated-property" })),
        },
        flooringUnitOfMeasure: {
          upsert: vi.fn(async ({ where, create }) => ({ id: `unit:${where.name ?? create?.slug ?? "unknown"}`, name: where.name ?? create?.name ?? "unknown", slug: create?.slug ?? "unknown", abbreviation: create?.abbreviation ?? "unknown" })),
        },
        flooringCategory: {
          findUnique: vi.fn(async () => null),
          create: vi.fn(async ({ data }) => ({ id: `category:${data.name}`, name: data.name })),
          update: vi.fn(async ({ where }) => ({ id: where.id, name: "updated-category" })),
        },
        flooringService: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async ({ data }) => ({
            id: `service:${data.name}`,
            name: data.name,
            unitId: data.unitId,
            baseCost: decimalLike(data.baseCost),
          })),
          update: vi.fn(async ({ where, data }) => ({
            id: where.id,
            name: data.name ?? "updated-service",
            unitId: data.unitId,
            baseCost: decimalLike(data.baseCost),
          })),
        },
        flooringProduct: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async ({ data }) => ({
            id: `product:${data.name}`,
            name: data.name,
            cost: decimalLike(data.cost),
          })),
          update: vi.fn(async ({ where, data }) => ({
            id: where.id,
            name: data.name ?? "updated-product",
            cost: decimalLike(data.cost),
          })),
        },
        flooringWarehouse: {
          upsert: vi.fn(async ({ where }) => ({ id: `warehouse:${where.name}`, name: where.name })),
        },
        flooringSection: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async ({ data }) => ({ id: `section:${data.warehouseId}:${data.name}` })),
          update: vi.fn(async ({ where }) => ({ id: where.id })),
        },
        flooringLocation: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async ({ data }) => ({ id: `location:${data.warehouseId}:${data.locationCode}`, locationCode: data.locationCode })),
          update: vi.fn(async ({ where, data }) => ({ id: where.id, locationCode: data.locationCode })),
        },
        flooringImportEntry: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async ({ data }) => ({ id: `import:${data.tag}`, tag: data.tag })),
          update: vi.fn(async ({ where, data }) => ({ id: where.id, tag: data.tag ?? "updated-import" })),
        },
        flooringInventory: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: "inventory-created" })),
          update: vi.fn(async ({ where }) => ({ id: where.id })),
        },
        flooringTemplate: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async ({ data }) => ({ id: `template:${data.templateTag}` })),
          update: vi.fn(async ({ where }) => ({ id: where.id })),
        },
        flooringTemplateItem: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: "template-item-created" })),
          update: vi.fn(async ({ where }) => ({ id: where.id })),
        },
        flooringTemplateServiceItem: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: "template-service-item-created" })),
          update: vi.fn(async ({ where }) => ({ id: where.id })),
        },
      },
      logger: { log: vi.fn() },
    })

    expect(summary).toEqual({
      prefix: "TEST",
      manufacturers: 5,
      managementCompanies: 5,
      properties: 10,
      units: 6,
      categories: 6,
      services: 6,
      products: 12,
      warehouses: 3,
      sections: 3,
      locations: 9,
      imports: 3,
      inventories: 9,
      templates: 10,
      templateItems: 20,
      templateServiceItems: 20,
    })
  })
})
