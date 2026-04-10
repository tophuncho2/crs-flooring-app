import { describe, expect, it } from "vitest"
import {
  canEditCategories,
  canManageUsers,
  hasCapability,
} from "@/server/auth/access-control"

describe("access-control capability matrix", () => {
  it("keeps owner as the top governance role", () => {
    expect(hasCapability("OWNER", "tool.admin")).toBe(true)
    expect(hasCapability("OWNER", "users.manage")).toBe(true)
    expect(hasCapability("OWNER", "adminPanel.access")).toBe(true)
  })

  it("allows admins to govern but not act as the top platform role", () => {
    expect(hasCapability("ADMIN", "users.manage")).toBe(true)
    expect(hasCapability("ADMIN", "adminPanel.access")).toBe(true)
    expect(hasCapability("ADMIN", "tool.admin")).toBe(false)
  })

  it("keeps builders operational but non-governing", () => {
    expect(hasCapability("BUILDER", "system.access")).toBe(true)
    expect(hasCapability("BUILDER", "users.manage")).toBe(false)
    expect(canManageUsers("builder@test.com", "BUILDER")).toBe(false)
    expect(canEditCategories("BUILDER")).toBe(false)
  })
})
