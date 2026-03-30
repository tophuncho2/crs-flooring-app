import { describe, expect, it } from "vitest"
import { FLOORING_HOTKEYS } from "@/server/flooring/hotkeys"

describe("FLOORING_HOTKEYS", () => {
  it("uses unique key codes and combinations", () => {
    const codes = FLOORING_HOTKEYS.map((hotkey) => hotkey.code)
    const combinations = FLOORING_HOTKEYS.map((hotkey) => hotkey.combination)

    expect(new Set(codes).size).toBe(codes.length)
    expect(new Set(combinations).size).toBe(combinations.length)
  })

  it("includes the updated categories, services, and unit-of-measures shortcuts", () => {
    expect(FLOORING_HOTKEYS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Categories",
          combination: "SHIFT + Q",
          code: "KeyQ",
          path: "/dashboard/flooring/categories",
        }),
        expect.objectContaining({
          key: "Services",
          combination: "SHIFT + S",
          code: "KeyS",
          path: "/dashboard/flooring/services",
        }),
        expect.objectContaining({
          key: "Unit Of Measures",
          combination: "SHIFT + W",
          code: "KeyW",
          path: "/dashboard/flooring/unit-of-measures",
        }),
      ]),
    )
  })

  it("removes the calendar, warehouse, admin panel, theme, and cut logs shortcuts", () => {
    const labels = FLOORING_HOTKEYS.map((hotkey) => hotkey.key)

    expect(labels).not.toContain("Calendar")
    expect(labels).not.toContain("Warehouse")
    expect(labels).not.toContain("Admin Panel")
    expect(labels).not.toContain("Theme")
    expect(labels).not.toContain("Cut Logs")
  })
})
