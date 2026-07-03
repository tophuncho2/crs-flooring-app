import { describe, expect, it, vi } from "vitest"

import { guardUnitsExist } from "../../src/shared/guard-units-exist.js"

// A stand-in for the caller's module ExecutionError — the helper only needs an
// Error carrying the offending unitId.
class TestGuardError extends Error {
  constructor(public unitId: string) {
    super(`missing ${unitId}`)
    this.name = "TestGuardError"
  }
}

describe("guardUnitsExist", () => {
  it("resolves when every unit exists (and never fabricates an error)", async () => {
    const fetchUnit = vi.fn(async (id: string) => ({ id }))
    await expect(
      guardUnitsExist(["a", "b", "c"], fetchUnit, (id) => new TestGuardError(id)),
    ).resolves.toBeUndefined()
    expect(fetchUnit).toHaveBeenCalledTimes(3)
  })

  it("does nothing for an empty id list (the nullable-unit case)", async () => {
    const fetchUnit = vi.fn(async (id: string) => ({ id }))
    await expect(
      guardUnitsExist([], fetchUnit, (id) => new TestGuardError(id)),
    ).resolves.toBeUndefined()
    expect(fetchUnit).not.toHaveBeenCalled()
  })

  it("throws the caller's error carrying the missing unitId", async () => {
    const fetchUnit = async (id: string) => (id === "gone" ? null : { id })
    await expect(
      guardUnitsExist(["a", "gone", "b"], fetchUnit, (id) => new TestGuardError(id)),
    ).rejects.toMatchObject({ name: "TestGuardError", unitId: "gone" })
  })

  it("throws for the FIRST missing unit in array order when several are missing", async () => {
    // All fetches run concurrently; the guard must still report the first
    // missing id in the input order, not whichever promise settled first.
    const fetchUnit = async (id: string) =>
      id === "miss-1" || id === "miss-2" ? null : { id }
    await expect(
      guardUnitsExist(["ok", "miss-2", "miss-1"], fetchUnit, (id) => new TestGuardError(id)),
    ).rejects.toMatchObject({ unitId: "miss-2" })
  })
})
