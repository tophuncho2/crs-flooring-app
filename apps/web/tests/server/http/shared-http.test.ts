import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { requestJson } from "@/modules/shared/engines/common/transport/http"

describe("requestJson", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the parsed payload and forwards the request arguments", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, id: "row-1" }),
    })

    const payload = await requestJson<{ ok: boolean; id: string }>("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    })

    expect(payload).toEqual({ ok: true, id: "row-1" })
    expect(fetchMock).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    })
  })

  it("throws the JSON error message for non-ok responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Record is linked" }),
    })

    await expect(requestJson("/api/test")).rejects.toThrow("Record is linked")
  })

  it("falls back to a generic error when the JSON payload has no error field", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ detail: "Missing" }),
    })

    await expect(requestJson("/api/test")).rejects.toThrow("Request failed")
  })

  it("falls back to a generic error when the response body is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error("Unexpected token")),
    })

    await expect(requestJson("/api/test")).rejects.toThrow("Request failed")
  })
})
