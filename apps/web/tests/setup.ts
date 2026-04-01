import { beforeEach, vi } from "vitest"
import { navigationMocks, resetNavigationMocks } from "./helpers/next-navigation-mock"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    replace: navigationMocks.replace,
    refresh: navigationMocks.refresh,
    back: navigationMocks.back,
    forward: navigationMocks.forward,
    prefetch: navigationMocks.prefetch,
  }),
  usePathname: () => "/dashboard/test",
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  resetNavigationMocks()
})
