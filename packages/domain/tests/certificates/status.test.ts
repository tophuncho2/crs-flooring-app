import { describe, expect, it } from "vitest"
import {
  CERTIFICATE_EXPIRING_SOON_DAYS,
  computeCertificateStatus,
} from "../../src/certificates/status.js"

// Fixed reference so the day math is deterministic.
const NOW = new Date("2026-07-01T12:00:00Z")

function daysFromNow(days: number): string {
  const base = Date.UTC(2026, 6, 1) // 2026-07-01 UTC calendar day
  const target = new Date(base + days * 24 * 60 * 60 * 1000)
  const year = target.getUTCFullYear()
  const month = String(target.getUTCMonth() + 1).padStart(2, "0")
  const day = String(target.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

describe("computeCertificateStatus", () => {
  it("flags a past expiration as Expired", () => {
    const status = computeCertificateStatus(daysFromNow(-1), NOW)
    expect(status.key).toBe("expired")
    expect(status.label).toBe("Expired")
    expect(status.tone).toBe("error")
    expect(status.daysUntilExpiration).toBe(-1)
  })

  it("treats today (day 0) as Expiring Soon", () => {
    const status = computeCertificateStatus(daysFromNow(0), NOW)
    expect(status.key).toBe("expiring")
    expect(status.tone).toBe("warning")
    expect(status.daysUntilExpiration).toBe(0)
  })

  it("treats the window boundary (day 30) as Expiring Soon", () => {
    const status = computeCertificateStatus(daysFromNow(CERTIFICATE_EXPIRING_SOON_DAYS), NOW)
    expect(status.key).toBe("expiring")
    expect(status.daysUntilExpiration).toBe(30)
  })

  it("treats one day past the window (day 31) as Valid", () => {
    const status = computeCertificateStatus(daysFromNow(CERTIFICATE_EXPIRING_SOON_DAYS + 1), NOW)
    expect(status.key).toBe("valid")
    expect(status.label).toBe("Valid")
    expect(status.tone).toBe("success")
    expect(status.daysUntilExpiration).toBe(31)
  })

  it("returns No Expiration for null / undefined / empty", () => {
    for (const value of [null, undefined, ""] as const) {
      const status = computeCertificateStatus(value, NOW)
      expect(status.key).toBe("none")
      expect(status.label).toBe("No Expiration")
      expect(status.tone).toBe("muted")
      expect(status.daysUntilExpiration).toBeNull()
    }
  })

  it("matches between a Date instance and its ISO string", () => {
    const iso = computeCertificateStatus(daysFromNow(10), NOW)
    const date = computeCertificateStatus(new Date(`${daysFromNow(10)}T00:00:00Z`), NOW)
    expect(date).toEqual(iso)
  })
})
