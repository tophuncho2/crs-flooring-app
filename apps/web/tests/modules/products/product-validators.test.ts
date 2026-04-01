import { beforeEach, describe, expect, it, vi } from "vitest"

const { isBucketFileUrlMock } = vi.hoisted(() => ({
  isBucketFileUrlMock: vi.fn(),
}))

vi.mock("@/server/storage/s3", () => ({
  isBucketFileUrl: isBucketFileUrlMock,
}))

const { validateUpdateProductInput } = await import("@/modules/products/domain/validators")

describe("validateUpdateProductInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("accepts uploaded bucket photo URLs", () => {
    isBucketFileUrlMock.mockReturnValue(true)

    expect(validateUpdateProductInput({
      photoUrls: ["https://storage.example.com/builders/uploads/photo-1.png"],
    })).toEqual({
      photoUrls: ["https://storage.example.com/builders/uploads/photo-1.png"],
    })
  })

  it("rejects arbitrary external photo URLs", () => {
    isBucketFileUrlMock.mockReturnValue(false)

    expect(() => validateUpdateProductInput({
      photoUrls: ["https://example.com/photo.png"],
    })).toThrow("photoUrls must contain uploaded product photo URLs only")
  })
})
