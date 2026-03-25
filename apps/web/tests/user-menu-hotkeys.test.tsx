// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { pushMock, signOutMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}))

vi.mock("@/app/dashboard/use-flooring-hotkeys", () => ({
  useFlooringHotkeys: () => {},
}))

import UserMenu from "@/app/dashboard/user-menu"

describe("UserMenu hotkeys modal", () => {
  beforeEach(() => {
    pushMock.mockReset()
    signOutMock.mockReset()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hotkeys: [
            {
              id: "hotkey-categories",
              key: "Categories",
              combination: "SHIFT + Q",
              action: "Open Categories",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: "hotkey-services",
              key: "Services",
              combination: "SHIFT + S",
              action: "Open Services",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      }),
    )

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it("shows a read-only hotkeys table without inline save actions", async () => {
    render(<UserMenu email="admin@test.com" role="OWNER" canUseTools unlockedToolSlugs={["products", "warehouse"]} />)

    fireEvent.click(screen.getByRole("button", { name: "A" }))
    expect(screen.queryByRole("button", { name: "Toggle Theme" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Hotkeys" }))

    await waitFor(() => {
      expect(screen.getByText("Open Categories")).toBeTruthy()
      expect(screen.getByText("SHIFT + S")).toBeTruthy()
    })

    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    expect(screen.queryAllByRole("textbox")).toHaveLength(0)
  })
})
