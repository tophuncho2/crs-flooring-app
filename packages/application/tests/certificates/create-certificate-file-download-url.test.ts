import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCertificateFileByIdMock, createBucketObjectPresignedUrlMock } = vi.hoisted(() => ({
  getCertificateFileByIdMock: vi.fn(),
  createBucketObjectPresignedUrlMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  getCertificateFileById: getCertificateFileByIdMock,
}))

vi.mock("@builders/lib", () => ({
  createBucketObjectPresignedUrl: createBucketObjectPresignedUrlMock,
}))

import { createCertificateFileDownloadUrlUseCase } from "../../src/certificates/create-certificate-file-download-url.js"

const STORAGE = { accessKeyId: "a", defaultRegion: "r", endpointUrl: "http://s3", bucketName: "b", secretAccessKey: "s" }
const CERT_ID = "cert-1"
const FILE_ID = "file-1"
const KEY = "certificates/cert-1/file-1/coi.pdf"

beforeEach(() => {
  getCertificateFileByIdMock.mockReset()
  createBucketObjectPresignedUrlMock.mockReset()
  getCertificateFileByIdMock.mockResolvedValue({ id: FILE_ID, certificateId: CERT_ID, objectKey: KEY })
  createBucketObjectPresignedUrlMock.mockResolvedValue("http://s3/signed")
})

describe("createCertificateFileDownloadUrlUseCase", () => {
  it("404s when the file is missing", async () => {
    getCertificateFileByIdMock.mockResolvedValue(null)
    await expect(
      createCertificateFileDownloadUrlUseCase({ certificateId: CERT_ID, fileId: FILE_ID, storage: STORAGE }),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_NOT_FOUND", status: 404 })
    expect(createBucketObjectPresignedUrlMock).not.toHaveBeenCalled()
  })

  it("404s when the file belongs to another certificate", async () => {
    getCertificateFileByIdMock.mockResolvedValue({ id: FILE_ID, certificateId: "other", objectKey: KEY })
    await expect(
      createCertificateFileDownloadUrlUseCase({ certificateId: CERT_ID, fileId: FILE_ID, storage: STORAGE }),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_NOT_FOUND", status: 404 })
  })

  it("signs the object key and returns the url", async () => {
    const result = await createCertificateFileDownloadUrlUseCase({
      certificateId: CERT_ID,
      fileId: FILE_ID,
      storage: STORAGE,
    })
    expect(createBucketObjectPresignedUrlMock).toHaveBeenCalledWith(STORAGE, KEY, {
      expiresInSeconds: undefined,
    })
    expect(result).toEqual({ url: "http://s3/signed" })
  })
})
