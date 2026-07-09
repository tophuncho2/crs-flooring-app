import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  listCertificateFileKeysByCertificateIdMock,
  deleteCertificateRecordByIdMock,
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
    listCertificateFileKeysByCertificateIdMock: vi.fn(),
    deleteCertificateRecordByIdMock: vi.fn(),
    deleteBucketObjectMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  listCertificateFileKeysByCertificateId: listCertificateFileKeysByCertificateIdMock,
  deleteCertificateRecordById: deleteCertificateRecordByIdMock,
}))

vi.mock("@builders/lib", () => ({
  deleteBucketObject: deleteBucketObjectMock,
}))

import { deleteCertificateUseCase } from "../../src/certificates/delete-certificate.js"

const STORAGE = { accessKeyId: "a", defaultRegion: "r", endpointUrl: "http://s3", bucketName: "b", secretAccessKey: "s" }
const ID = "cert-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  listCertificateFileKeysByCertificateIdMock.mockReset()
  deleteCertificateRecordByIdMock.mockReset()
  deleteBucketObjectMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  listCertificateFileKeysByCertificateIdMock.mockResolvedValue([])
  deleteCertificateRecordByIdMock.mockResolvedValue(undefined)
  deleteBucketObjectMock.mockResolvedValue(undefined)
})

describe("deleteCertificateUseCase", () => {
  it("deletes the record and returns ok when there are no files", async () => {
    expect(await deleteCertificateUseCase(ID, STORAGE)).toEqual({ ok: true })
    expect(deleteCertificateRecordByIdMock).toHaveBeenCalledWith(ID, expect.anything())
    expect(deleteBucketObjectMock).not.toHaveBeenCalled()
  })

  it("captures child keys before the row cascade, then deletes each object", async () => {
    listCertificateFileKeysByCertificateIdMock.mockResolvedValue(["k1", "k2"])
    expect(await deleteCertificateUseCase(ID, STORAGE)).toEqual({ ok: true })
    // Keys captured before the record delete (cascade removes the rows).
    expect(listCertificateFileKeysByCertificateIdMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteCertificateRecordByIdMock.mock.invocationCallOrder[0],
    )
    expect(deleteBucketObjectMock).toHaveBeenCalledWith(STORAGE, "k1")
    expect(deleteBucketObjectMock).toHaveBeenCalledWith(STORAGE, "k2")
  })

  it("maps a P2025 on delete to a 404 not-found", async () => {
    deleteCertificateRecordByIdMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(deleteCertificateUseCase(ID, STORAGE)).rejects.toMatchObject({
      code: "CERTIFICATE_NOT_FOUND",
      status: 404,
    })
  })

  it("still returns ok when a best-effort object delete fails", async () => {
    listCertificateFileKeysByCertificateIdMock.mockResolvedValue(["k1"])
    deleteBucketObjectMock.mockRejectedValue(new Error("s3 down"))
    expect(await deleteCertificateUseCase(ID, STORAGE)).toEqual({ ok: true })
  })
})
