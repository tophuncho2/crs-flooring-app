// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest"
import {
  clearListPreferences,
  readListPreferences,
  writeListPreferences,
  type ListPreferencesSnapshot,
} from "@/engines/list-view/client/list-preferences-storage"

const KEY = "inventory-main"
const STORAGE_KEY = `listprefs:v1:${KEY}`

afterEach(() => {
  window.localStorage.clear()
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
})
