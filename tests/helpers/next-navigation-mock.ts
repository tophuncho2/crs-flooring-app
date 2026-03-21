import { vi } from "vitest"

export const navigationMocks = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}

export function resetNavigationMocks() {
  navigationMocks.push.mockReset()
  navigationMocks.replace.mockReset()
  navigationMocks.refresh.mockReset()
  navigationMocks.back.mockReset()
  navigationMocks.forward.mockReset()
  navigationMocks.prefetch.mockReset()
}
