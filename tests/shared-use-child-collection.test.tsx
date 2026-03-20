// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"

const { requestJsonMock } = vi.hoisted(() => ({
  requestJsonMock: vi.fn(),
}))

vi.mock("@/features/flooring/shared/http", () => ({
  requestJson: requestJsonMock,
}))

import { useChildCollection } from "@/features/flooring/shared/use-child-collection"

type Item = { id: string; name: string }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function renderCollectionHook(options?: {
  skipReloadAfterMutation?: boolean
  onAfterMutation?: () => Promise<void>
}) {
  return renderHook(() =>
    useChildCollection<Item, { name: string }, { name: string }>({
      listUrl: "/api/items",
      createUrl: "/api/items",
      updateUrl: (itemId) => `/api/items/${itemId}`,
      deleteUrl: (itemId) => `/api/items/${itemId}`,
      mapItems: (payload) => (payload.items as Item[]) ?? [],
      serializeCreate: (input) => input,
      serializeUpdate: (input) => input,
      skipReloadAfterMutation: options?.skipReloadAfterMutation,
      onAfterMutation: options?.onAfterMutation,
    }),
  )
}

describe("useChildCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads items and toggles the loading state around the request", async () => {
    const listRequest = deferred<Record<string, unknown>>()
    requestJsonMock.mockReturnValueOnce(listRequest.promise)

    const { result } = renderCollectionHook()

    let loadPromise!: Promise<Item[]>
    await act(async () => {
      loadPromise = result.current.load()
    })

    expect(result.current.loading).toBe(true)

    listRequest.resolve({
      items: [{ id: "item-1", name: "One" }],
    })

    await act(async () => {
      await loadPromise
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.items).toEqual([{ id: "item-1", name: "One" }])
  })

  it("creates an item, reloads the list, and fires onAfterMutation", async () => {
    const onAfterMutation = vi.fn().mockResolvedValue(undefined)
    const createRequest = deferred<Record<string, unknown>>()

    requestJsonMock.mockReturnValueOnce(createRequest.promise)
    requestJsonMock.mockResolvedValueOnce({
      items: [{ id: "item-2", name: "Two" }],
    })

    const { result } = renderCollectionHook({ onAfterMutation })

    let createPromise!: Promise<Item[]>
    await act(async () => {
      createPromise = result.current.createItem({ name: "Two" })
    })

    expect(result.current.adding).toBe(true)

    createRequest.resolve({ ok: true })

    await act(async () => {
      await createPromise
    })

    expect(requestJsonMock).toHaveBeenNthCalledWith(1, "/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Two" }),
    })
    expect(requestJsonMock).toHaveBeenNthCalledWith(2, "/api/items")
    expect(result.current.items).toEqual([{ id: "item-2", name: "Two" }])
    expect(result.current.adding).toBe(false)
    expect(onAfterMutation).toHaveBeenCalledTimes(1)
  })

  it("updates an item, tracks the saving id, and reloads the collection", async () => {
    const updateRequest = deferred<Record<string, unknown>>()

    requestJsonMock.mockReturnValueOnce(updateRequest.promise)
    requestJsonMock.mockResolvedValueOnce({
      items: [{ id: "item-1", name: "Updated" }],
    })

    const { result } = renderCollectionHook()

    let updatePromise!: Promise<Item[]>
    await act(async () => {
      updatePromise = result.current.updateItem("item-1", { name: "Updated" })
    })

    expect(result.current.savingItemId).toBe("item-1")

    updateRequest.resolve({ ok: true })

    await act(async () => {
      await updatePromise
    })

    expect(requestJsonMock).toHaveBeenNthCalledWith(1, "/api/items/item-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    })
    expect(requestJsonMock).toHaveBeenNthCalledWith(2, "/api/items")
    expect(result.current.savingItemId).toBeNull()
    expect(result.current.items).toEqual([{ id: "item-1", name: "Updated" }])
  })

  it("deletes an item without reloading when skipReloadAfterMutation is enabled", async () => {
    const { result } = renderCollectionHook({ skipReloadAfterMutation: true })

    act(() => {
      result.current.setItems([{ id: "item-1", name: "Seed" }])
    })

    const deleteRequest = deferred<Record<string, unknown>>()
    requestJsonMock.mockReturnValueOnce(deleteRequest.promise)

    let deletePromise!: Promise<Item[]>
    await act(async () => {
      deletePromise = result.current.deleteItem("item-1")
    })

    expect(result.current.deletingItemId).toBe("item-1")

    deleteRequest.resolve({ ok: true })

    await act(async () => {
      await expect(deletePromise).resolves.toEqual([{ id: "item-1", name: "Seed" }])
    })

    expect(requestJsonMock).toHaveBeenCalledTimes(1)
    expect(requestJsonMock).toHaveBeenCalledWith("/api/items/item-1", { method: "DELETE" })
    expect(result.current.deletingItemId).toBeNull()
    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: "item-1", name: "Seed" }])
    })
  })
})
