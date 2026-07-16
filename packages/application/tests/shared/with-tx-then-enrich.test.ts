import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock } = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
}))

import { withTxThenEnrich } from "../../src/shared/with-tx-then-enrich.js"

const TX = { tx: true }
const POOL_RECORD = { id: "r1", full: true }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  withDatabaseTransactionMock.mockImplementation(
    async (cb: (tx: unknown) => unknown, _options?: unknown) => cb(TX),
  )
})

describe("withTxThenEnrich", () => {
  it("runs the write on the tx client, then enriches on the pool and returns the record", async () => {
    const write = vi.fn(async (c: unknown) => {
      expect(c).toBe(TX)
      return { id: "r1" }
    })
    const enrich = vi.fn(async (written: { id: string }) => {
      expect(written).toEqual({ id: "r1" })
      return POOL_RECORD
    })
    const onMissing = vi.fn(() => {
      throw new Error("should not be called")
    })

    const result = await withTxThenEnrich(write, enrich, onMissing)

    expect(result).toBe(POOL_RECORD)
    expect(write).toHaveBeenCalledOnce()
    expect(enrich).toHaveBeenCalledOnce()
    expect(onMissing).not.toHaveBeenCalled()
  })

  it("passes options.client to the write instead of the tx when composing", async () => {
    const CALLER_CLIENT = { caller: true }
    const write = vi.fn(async (c: unknown) => {
      expect(c).toBe(CALLER_CLIENT)
      return { id: "r1" }
    })

    await withTxThenEnrich(write, async () => POOL_RECORD, () => {
      throw new Error("nope")
    }, { client: CALLER_CLIENT as never })

    expect(write).toHaveBeenCalledOnce()
  })

  it("calls onMissing (throwing) when the post-commit enrich returns null", async () => {
    const onMissing = vi.fn((written: { id: string }): never => {
      throw new Error(`missing ${written.id}`)
    })

    await expect(
      withTxThenEnrich(async () => ({ id: "gone" }), async () => null, onMissing),
    ).rejects.toThrowError(/missing gone/)
    expect(onMissing).toHaveBeenCalledOnce()
  })

  it("forwards timeout/maxWait to withDatabaseTransaction", async () => {
    await withTxThenEnrich(async () => ({ id: "r1" }), async () => POOL_RECORD, () => {
      throw new Error("nope")
    }, { timeout: 15_000, maxWait: 10_000 })

    expect(withDatabaseTransactionMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 15_000,
      maxWait: 10_000,
    })
  })

  it("omits the options arg entirely when no budget override is given", async () => {
    await withTxThenEnrich(async () => ({ id: "r1" }), async () => POOL_RECORD, () => {
      throw new Error("nope")
    })

    expect(withDatabaseTransactionMock).toHaveBeenCalledWith(expect.any(Function), undefined)
  })
})
