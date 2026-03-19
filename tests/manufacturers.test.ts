import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { normalizeManufacturer } from "@/features/flooring/manufacturers/services"
import { normalizeCatalogProduct } from "@/features/flooring/products/services"
import { POST } from "@/app/api/flooring/manufacturers/route"
import { DELETE } from "@/app/api/flooring/manufacturers/[id]/route"

const { prismaMock, createManufacturerMock, ensureBuilderOrAdminMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringManufacturer: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    flooringProduct: {
      count: vi.fn(),
    },
  },
  createManufacturerMock: vi.fn(),
  ensureBuilderOrAdminMock: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/server/auth/route-auth", () => ({
  ensureBuilderOrAdmin: ensureBuilderOrAdminMock,
}))

vi.mock("@/features/flooring/manufacturers/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/features/flooring/manufacturers/mutations")>(
    "@/features/flooring/manufacturers/mutations",
  )

  return {
    ...actual,
    createManufacturer: createManufacturerMock,
  }
})

function manufacturerRecord(overrides: Partial<{
  id: string
  companyName: string
  agentName: string | null
  website: string | null
  phone: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
  _count: { products: number }
}> = {}) {
  return {
    id: "mfg-1",
    companyName: "Acme Flooring",
    agentName: null,
    website: null,
    phone: null,
    email: null,
    createdAt: new Date("2026-03-18T00:00:00Z"),
    updatedAt: new Date("2026-03-18T00:00:00Z"),
    _count: { products: 0 },
    ...overrides,
  }
}

describe("manufacturers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureBuilderOrAdminMock.mockResolvedValue(null)
  })

  it("manufacturer POST route accepts missing agentName and returns normalized payload", async () => {
    createManufacturerMock.mockResolvedValue(
      manufacturerRecord({
        companyName: "Acme Flooring",
        agentName: null,
      }),
    )

    const response = await POST(
      new Request("http://localhost/api/flooring/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Acme Flooring",
          website: "",
          phone: "",
          email: "",
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(createManufacturerMock).toHaveBeenCalledWith({
      companyName: "Acme Flooring",
      agentName: null,
      website: null,
      phone: null,
      email: null,
    })
    expect(payload.manufacturer).toEqual(
      normalizeManufacturer(
        manufacturerRecord({
          companyName: "Acme Flooring",
          agentName: null,
        }),
      ),
    )
  })

  it("products resolve manufacturer display names from company name", () => {
    const normalized = normalizeCatalogProduct({
      id: "prod-1",
      name: "Acme Flooring - Plush - Sand",
      categoryId: "cat-1",
      manufacturerId: "mfg-1",
      manufacturerName: "stale manufacturer name",
      style: "Plush",
      color: "Sand",
      width: null,
      sheetSize: null,
      thickness: null,
      unitWeight: null,
      baseColor: null,
      coveragePerUnit: new Prisma.Decimal("12.5"),
      photoUrls: [],
      notes: null,
      createdAt: new Date("2026-03-18T00:00:00Z"),
      updatedAt: new Date("2026-03-18T00:00:00Z"),
      category: {
        id: "cat-1",
        name: "Carpet",
        sendUnit: { id: "u1", name: "SY" },
        stockUnit: { id: "u2", name: "Roll" },
        coverageAvailableUnit: null,
        itemCoverageUnit: { id: "u3", name: "SF" },
        serviceUnit: null,
      },
      manufacturer: {
        id: "mfg-1",
        companyName: "Acme Flooring",
        agentName: "Jamie Agent",
        website: null,
      },
    })

    expect(normalized.manufacturerName).toBe("Acme Flooring")
  })

  it("prevents deleting a manufacturer that still has linked products", async () => {
    prismaMock.flooringProduct.count.mockResolvedValue(2)

    const response = await DELETE(new Request("http://localhost/api/flooring/manufacturers/mfg-1"), {
      params: Promise.resolve({ id: "mfg-1" }),
    })

    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This manufacturer has linked products and cannot be deleted")
    expect(prismaMock.flooringManufacturer.delete).not.toHaveBeenCalled()
  })
})
