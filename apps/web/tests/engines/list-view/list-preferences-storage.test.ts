// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import {
  clearListPreferences,
  prunePreferencesForUser,
  readListPreferences,
  writeListPreferences,
  type ListPreferencesSnapshot,
} from "@/engines/list-view/client/list-preferences-storage"

const KEY = "inventory-main"
const STORAGE_KEY = `listprefs:v1:${KEY}`

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe("list-preferences-storage", () => {
  it("round-trips a snapshot through write → read", () => {
    const snapshot: ListPreferencesSnapshot = {
      q: "carpet",
      sorts: [{ field: "createdAt", direction: "asc" }],
      filters: { warehouseId: ["w1", "w2"] },
      columnWidths: { productName: 220 },
    }
    writeListPreferences(KEY, snapshot)
    expect(readListPreferences(KEY)).toEqual(snapshot)
  })

  it("returns null when nothing is stored", () => {
    expect(readListPreferences(KEY)).toBeNull()
  })

  it("namespaces the key per tableKey (versioned prefix)", () => {
    writeListPreferences(KEY, { q: "x" })
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain("\"q\":\"x\"")
    // A different table does not see it.
    expect(readListPreferences("adjustments-main")).toBeNull()
  })

  it("clear removes the entry", () => {
    writeListPreferences(KEY, { q: "x" })
    clearListPreferences(KEY)
    expect(readListPreferences(KEY)).toBeNull()
  })

  it("self-heals a corrupt blob: drops it and returns null", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json")
    expect(readListPreferences(KEY)).toBeNull()
    // The bad entry was removed, not left to fail again.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("write swallows a QuotaExceededError instead of throwing", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("quota full", "QuotaExceededError")
    })
    expect(() => writeListPreferences(KEY, { q: "x" })).not.toThrow()
  })

  describe("prunePreferencesForUser", () => {
    const userA = "aaaaaaaa-1111-2222-3333-444444444444"
    const userB = "bbbbbbbb-5555-6666-7777-888888888888"

    it("drops every other user's namespace, keeps the current user's", () => {
      window.localStorage.setItem(`listprefs:v1:${userA}:inventory-main`, "{}")
      window.localStorage.setItem(`listprefs:v1:${userA}:adjustments-main`, "{}")
      window.localStorage.setItem(`listprefs:v1:${userB}:inventory-main`, "{}")
      window.localStorage.setItem("unrelated:key", "keep-me")

      prunePreferencesForUser(userA)

      expect(window.localStorage.getItem(`listprefs:v1:${userA}:inventory-main`)).not.toBeNull()
      expect(window.localStorage.getItem(`listprefs:v1:${userA}:adjustments-main`)).not.toBeNull()
      expect(window.localStorage.getItem(`listprefs:v1:${userB}:inventory-main`)).toBeNull()
      expect(window.localStorage.getItem("unrelated:key")).toBe("keep-me")
    })

    it("leaves a legacy bare key (no userId segment) untouched", () => {
      window.localStorage.setItem(STORAGE_KEY, "{}")
      prunePreferencesForUser(userA)
      expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    })
  })
})
