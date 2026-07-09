import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getCertificateByIdMock,
  createCertificateFileRowMock,
  uploadBucketObjectMock,
  deleteBucketObjectMock,
  PrismaKnownError,
} = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string
    constructor(message: string, opts: { code: string }) {
      super(message)
      this.code = opts.code
    }
  }
  return {
    withDatabaseTransactionMock: vi.fn(),
    getCertificateByIdMock: vi.fn(),
    createCertificateFileRowMock: vi.fn(),
    uploadBucketObjectMock: vi.fn(),
    deleteBucketObjectMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getCertificateById: getCertificateByIdMock,
  createCertificateFileRow: createCertificateFileRowMock,
}))

vi.mock("@builders/lib", () => ({
  uploadBucketObject: uploadBucketObjectMock,
  deleteBucketObject: deleteBucketObjectMock,
}))

import { uploadCertificateFileUseCase } from "../../src/certificates/upload-certificate-file.js"

const STORAGE = { accessKeyId: "a", defaultRegion: "r", endpointUrl: "http://s3", bucketName: "b", secretAccessKey: "s" }
const ACTOR = "user@x.com"
const CERT_ID = "cert-1"

function pdf(bytes = 10): Buffer {
  return Buffer.alloc(bytes, 1)
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    certificateId: CERT_ID,
    fileName: "coi.pdf",
    contentType: "application/pdf",
    data: pdf(),
    storage: STORAGE,
    ...overrides,
  } as never
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getCertificateByIdMock.mockReset()
  createCertificateFileRowMock.mockReset()
  uploadBucketObjectMock.mockReset()
  deleteBucketObjectMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getCertificateByIdMock.mockResolvedValue({ id: CERT_ID })
  uploadBucketObjectMock.mockResolvedValue("http://s3/b/key")
  deleteBucketObjectMock.mockResolvedValue(undefined)
  createCertificateFileRowMock.mockResolvedValue({
    id: "file-1",
    fileName: "coi.pdf",
    contentType: "application/pdf",
    sizeBytes: 10,
    createdAt: "2026-07-09T00:00:00.000Z",
    createdBy: ACTOR,
  })
})

describe("uploadCertificateFileUseCase", () => {
  it("rejects an empty buffer with 400 and never uploads", async () => {
    await expect(
      uploadCertificateFileUseCase(baseInput({ data: Buffer.alloc(0) }), ACTOR),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_VALIDATION_FAILED", status: 400 })
    expect(uploadBucketObjectMock).not.toHaveBeenCalled()
  })

  it("rejects a disallowed content type with 400 and never uploads", async () => {
    await expect(
      uploadCertificateFileUseCase(baseInput({ contentType: "application/zip" }), ACTOR),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_VALIDATION_FAILED", status: 400 })
    expect(uploadBucketObjectMock).not.toHaveBeenCalled()
  })

  it("rejects an over-cap file with 400 and never uploads", async () => {
    await expect(
      uploadCertificateFileUseCase(baseInput({ data: pdf(10 * 1024 * 1024 + 1) }), ACTOR),
    ).rejects.toMatchObject({ code: "CERTIFICATE_FILE_VALIDATION_FAILED", status: 400 })
    expect(uploadBucketObjectMock).not.toHaveBeenCalled()
  })

  it("maps a missing parent (P2025) to a 404 and never uploads", async () => {
    getCertificateByIdMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(uploadCertificateFileUseCase(baseInput(), ACTOR)).rejects.toMatchObject({
      code: "CERTIFICATE_NOT_FOUND",
      status: 404,
    })
    expect(uploadBucketObjectMock).not.toHaveBeenCalled()
  })

  it("uploads the object then inserts the row and returns it", async () => {
    const result = await uploadCertificateFileUseCase(baseInput(), ACTOR)
    expect(uploadBucketObjectMock).toHaveBeenCalledTimes(1)
    expect(createCertificateFileRowMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ id: "file-1", fileName: "coi.pdf" })
    // Object was written before the row (compensation invariant).
    expect(uploadBucketObjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      createCertificateFileRowMock.mock.invocationCallOrder[0],
    )
    expect(deleteBucketObjectMock).not.toHaveBeenCalled()
  })

  it("compensates by deleting the object when the insert fails", async () => {
    createCertificateFileRowMock.mockRejectedValue(new Error("insert boom"))
    await expect(uploadCertificateFileUseCase(baseInput(), ACTOR)).rejects.toThrowError("insert boom")
    expect(uploadBucketObjectMock).toHaveBeenCalledTimes(1)
    expect(deleteBucketObjectMock).toHaveBeenCalledTimes(1)
  })

  it("stamps the actor as createdBy on the row", async () => {
    await uploadCertificateFileUseCase(baseInput(), ACTOR)
    expect(createCertificateFileRowMock).toHaveBeenCalledWith(
      expect.objectContaining({ certificateId: CERT_ID, createdBy: ACTOR, fileName: "coi.pdf" }),
      expect.anything(),
    )
  })
})
