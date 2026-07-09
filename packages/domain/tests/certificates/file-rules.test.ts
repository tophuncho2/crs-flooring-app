import { describe, expect, it } from "vitest"
import {
  CERTIFICATE_FILE_MAX_BYTES,
  buildCertificateFileObjectKey,
  isAllowedCertificateFileContentType,
  isAllowedCertificateFileSize,
  sanitizeCertificateFileName,
} from "../../src/certificates/file-rules.js"

describe("isAllowedCertificateFileContentType", () => {
  it("accepts PDF and the image formats", () => {
    for (const type of ["application/pdf", "image/png", "image/jpeg", "image/webp"]) {
      expect(isAllowedCertificateFileContentType(type)).toBe(true)
    }
  })

  it("rejects everything else", () => {
    for (const type of ["application/zip", "text/html", "image/gif", "", "application/x-msdownload"]) {
      expect(isAllowedCertificateFileContentType(type)).toBe(false)
    }
  })
})

describe("isAllowedCertificateFileSize", () => {
  it("accepts 1 byte up to the 10 MB cap", () => {
    expect(isAllowedCertificateFileSize(1)).toBe(true)
    expect(isAllowedCertificateFileSize(CERTIFICATE_FILE_MAX_BYTES)).toBe(true)
  })

  it("rejects zero, over-cap, and non-integer sizes", () => {
    expect(isAllowedCertificateFileSize(0)).toBe(false)
    expect(isAllowedCertificateFileSize(CERTIFICATE_FILE_MAX_BYTES + 1)).toBe(false)
    expect(isAllowedCertificateFileSize(-5)).toBe(false)
    expect(isAllowedCertificateFileSize(12.5)).toBe(false)
  })
})

describe("sanitizeCertificateFileName", () => {
  it("strips path separators and reserved chars", () => {
    expect(sanitizeCertificateFileName("../../etc/passwd")).toBe("etc_passwd")
    expect(sanitizeCertificateFileName("my cert (2024).pdf")).toBe("my_cert_2024_.pdf")
  })

  it("collapses underscore runs and trims leading dots/underscores", () => {
    expect(sanitizeCertificateFileName("___a...b")).toBe("a...b")
  })

  it("falls back to 'file' when nothing survives", () => {
    expect(sanitizeCertificateFileName("///")).toBe("file")
    expect(sanitizeCertificateFileName("   ")).toBe("file")
  })

  it("caps length at 120 chars", () => {
    expect(sanitizeCertificateFileName("a".repeat(500))).toHaveLength(120)
  })
})

describe("buildCertificateFileObjectKey", () => {
  it("builds the certificates/{certId}/{fileId}/{safeName} key", () => {
    expect(
      buildCertificateFileObjectKey({
        certificateId: "cert-1",
        fileId: "file-9",
        fileName: "COI 2024.pdf",
      }),
    ).toBe("certificates/cert-1/file-9/COI_2024.pdf")
  })
})
