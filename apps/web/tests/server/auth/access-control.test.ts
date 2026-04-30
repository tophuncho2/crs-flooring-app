import { describe, expect, it } from "vitest"
import { hasCapability } from "@/server/auth/access-control"

describe("access-control capability matrix", () => {
  it("keeps owner as the top platform role", () => {
    expect(hasCapability("OWNER", "tool.admin")).toBe(true)
    expect(hasCapability("OWNER", "system.access")).toBe(true)
  })

  it("gives admins operational capabilities but not tool.admin", () => {
    expect(hasCapability("ADMIN", "system.access")).toBe(true)
    expect(hasCapability("ADMIN", "tool.admin")).toBe(false)
  })

  it("keeps builders operational", () => {
    expect(hasCapability("BUILDER", "system.access")).toBe(true)
    expect(hasCapability("BUILDER", "tool.admin")).toBe(false)
  })

  it("denies system access to contractor and customer", () => {
    expect(hasCapability("CONTRACTOR", "system.access")).toBe(false)
    expect(hasCapability("CUSTOMER", "system.access")).toBe(false)
  })
})
