// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

const { navigationState } = vi.hoisted(() => ({
  navigationState: {
    pathname: "/dashboard/services",
    pushMock: vi.fn(),
    searchParams: new URLSearchParams(),
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationState.pushMock }),
  usePathname: () => navigationState.pathname,
  useSearchParams: () => navigationState.searchParams,
}))

import { useUrlRecordPanel } from "@/modules/shared/engines/common/navigation/url-record-panel"

describe("useUrlRecordPanel", () => {
  beforeEach(() => {
    navigationState.pathname = "/dashboard/services"
    navigationState.pushMock.mockReset()
    navigationState.searchParams = new URLSearchParams()
  })

  it("reads the active record id from the current search params", () => {
    navigationState.searchParams = new URLSearchParams("service=svc-2&tab=active")

    const { result } = renderHook(() => useUrlRecordPanel("service"))

    expect(result.current.activeRecordId).toBe("svc-2")
  })

  it("pushes the record param while preserving unrelated query params", () => {
    navigationState.searchParams = new URLSearchParams("tab=active&page=2")

    const { result } = renderHook(() => useUrlRecordPanel("service"))

    act(() => {
      result.current.openRecord("svc-3")
    })

    expect(navigationState.pushMock).toHaveBeenCalledWith(
      "/dashboard/services?tab=active&page=2&service=svc-3",
      { scroll: false },
    )
  })

  it("removes only the target query param when the record is closed", () => {
    navigationState.searchParams = new URLSearchParams("service=svc-3&tab=active&page=2")

    const { result } = renderHook(() => useUrlRecordPanel("service"))

    act(() => {
      result.current.closeRecord()
    })

    expect(navigationState.pushMock).toHaveBeenCalledWith(
      "/dashboard/services?tab=active&page=2",
      { scroll: false },
    )
  })
})
