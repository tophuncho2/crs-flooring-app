import { describe, expect, it, vi } from "vitest"

import { guardProductsExist } from "../../src/shared/guard-products-exist.js"

// A stand-in for the caller's module ExecutionError — the helper only needs an
// Error carrying the offending productId.
class TestGuardError extends Error {
  constructor(public productId: string) {
    super(`missing ${productId}`)
    this.name = "TestGuardError"
  }
}

describe("guardProductsExist", () => {
  it("resolves when every product exists (and never fabricates an error)", async () => {
    const fetchProduct = vi.fn(async (id: string) => ({ id }))
    await expect(
      guardProductsExist(["a", "b", "c"], fetchProduct, (id) => new TestGuardError(id)),
    ).resolves.toBeUndefined()
    expect(fetchProduct).toHaveBeenCalledTimes(3)
  })

  it("does nothing for an empty id list", async () => {
    const fetchProduct = vi.fn(async (id: string) => ({ id }))
    await expect(
      guardProductsExist([], fetchProduct, (id) => new TestGuardError(id)),
    ).resolves.toBeUndefined()
    expect(fetchProduct).not.toHaveBeenCalled()
  })

  it("throws the caller's error carrying the missing productId", async () => {
    const fetchProduct = async (id: string) => (id === "gone" ? null : { id })
    await expect(
      guardProductsExist(["a", "gone", "b"], fetchProduct, (id) => new TestGuardError(id)),
    ).rejects.toMatchObject({ name: "TestGuardError", productId: "gone" })
  })

  it("throws for the FIRST missing product in array order when several are missing", async () => {
    // All fetches run concurrently; the guard must still report the first
    // missing id in the input order, not whichever promise settled first.
    const fetchProduct = async (id: string) =>
      id === "miss-1" || id === "miss-2" ? null : { id }
    await expect(
      guardProductsExist(
        ["ok", "miss-2", "miss-1"],
        fetchProduct,
        (id) => new TestGuardError(id),
      ),
    ).rejects.toMatchObject({ productId: "miss-2" })
  })
})
