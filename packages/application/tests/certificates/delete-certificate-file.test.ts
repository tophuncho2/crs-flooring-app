import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getCertificateFileByIdMock,
  deleteCertificateFileRowMock,
  deleteBucketObjectMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  getCertificateFileByIdMock: vi.fn(),
  deleteCertificateFileRowMock: vi.fn(),
  deleteBucketObjectMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
  getCertificateFileById: getCertificateFileByIdMock,
  deleteCertificateFileRow: deleteCertificateFileRowMock,
}))

vi.mock("@builders/lib", () => ({
  deleteBucketObject: deleteBucketObjectMock,
}))

import { deleteCertificateFileUseCase } from "../../src/certificates/delete-certificate-file.js"

const STORAGE = { accessKeyId: "a", defaultRegion: "r", endpointUrl: "http://s3", bucketName: "b", secretAccessKey: "s" }
const CERT_ID = "cert-1"
const FILE_ID = "file-1"
const KEY = "certificates/cert-1/file-1/coi.pdf"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getCertificateFileByIdMock.mockReset()
  deleteCertificateFileRowMock.mockReset()
  deleteBucketObjectMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getCertificateFileByIdMock.mockResolvedValue({ id: FILE_ID, certificateId: CERT_ID, objectKey: KEY })
  deleteCertificateFileRowMock.mockResolvedValue(undefined)
  deleteBucketObjectMock.mockResolvedValue(undefined)
})

describe("deleteCertificateFileUseCase", () => {
  it("404s when the file does not exist and never deletes the object", async () => {
    getCertificateFileByIdMock.mockResolvedValue(null)
    await expect(
      deleteCertificateFileUseCase({ certificateId: CERT_ID, fileId: FILE_ID, storage: STORAGE }),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_NOT_FOUND", status: 404 })
    expect(deleteCertificateFileRowMock).not.toHaveBeenCalled()
    expect(deleteBucketObjectMock).not.toHaveBeenCalled()
  })

  it("404s when the file belongs to a different certificate", async () => {
    getCertificateFileByIdMock.mockResolvedValue({ id: FILE_ID, certificateId: "other", objectKey: KEY })
    await expect(
      deleteCertificateFileUseCase({ certificateId: CERT_ID, fileId: FILE_ID, storage: STORAGE }),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_NOT_FOUND", status: 404 })
    expect(deleteCertificateFileRowMock).not.toHaveBeenCalled()
  })

  it("deletes the row then the object and returns ok", async () => {
    expect(
      await deleteCertificateFileUseCase({ certificateId: CERT_ID, fileId: FILE_ID, storage: STORAGE }),
    ).toEqual({ ok: true })
    expect(deleteCertificateFileRowMock).toHaveBeenCalledWith(FILE_ID, expect.anything())
    expect(deleteBucketObjectMock).toHaveBeenCalledWith(STORAGE, KEY)
    // Row committed before the object delete.
    expect(deleteCertificateFileRowMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteBucketObjectMock.mock.invocationCallOrder[0],
    )
  })

  it("still returns ok when the best-effort object delete fails", async () => {
    deleteBucketObjectMock.mockRejectedValue(new Error("s3 down"))
    expect(
      await deleteCertificateFileUseCase({ certificateId: CERT_ID, fileId: FILE_ID, storage: STORAGE }),
    ).toEqual({ ok: true })
  })
})
