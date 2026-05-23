import { describe, expect, it } from "vitest"
import {
  IMPORT_MATERIALIZE_TOPIC,
  IMPORT_MATERIALIZE_QUEUE,
  IMPORT_MATERIALIZE_JOB_NAME,
  ImportMaterializeBatchPayloadSchema,
  parseImportMaterializeBatchPayload,
} from "../../src/queue/materialize-import-batch.js"

const VALID_PAYLOAD = {
  version: "v1",
  topic: "flooring.imports.materialize",
  importEntryId: "11111111-1111-4111-8111-111111111111",
  stagedRowIds: ["22222222-2222-4222-8222-222222222222"],
  requestedBy: {
    userId: "33333333-3333-4333-8333-333333333333",
    userEmail: "user@example.com",
  },
  requestedAt: "2026-05-22T12:00:00.000Z",
}

describe("queue constants", () => {
  it("topic, queue name, and job name are stable strings", () => {
    expect(IMPORT_MATERIALIZE_TOPIC).toBe("flooring.imports.materialize")
    expect(IMPORT_MATERIALIZE_QUEUE).toBe("flooring-imports-materialize")
    expect(IMPORT_MATERIALIZE_JOB_NAME).toBe("materialize-batch")
  })
})

describe("ImportMaterializeBatchPayloadSchema", () => {
  it("accepts a fully valid payload", () => {
    const parsed = ImportMaterializeBatchPayloadSchema.parse(VALID_PAYLOAD)
    expect(parsed).toEqual(VALID_PAYLOAD)
  })

  it("rejects non-v1 version literals", () => {
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({ ...VALID_PAYLOAD, version: "v2" }),
    ).toThrow()
  })

  it("rejects a wrong topic literal", () => {
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({ ...VALID_PAYLOAD, topic: "flooring.imports.other" }),
    ).toThrow()
  })

  it("requires UUID importEntryId", () => {
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({ ...VALID_PAYLOAD, importEntryId: "not-a-uuid" }),
    ).toThrow()
  })

  it("requires at least 1 stagedRowId", () => {
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({ ...VALID_PAYLOAD, stagedRowIds: [] }),
    ).toThrow()
  })

  it("rejects > 500 stagedRowIds (hard batch ceiling)", () => {
    const tooMany = Array.from(
      { length: 501 },
      (_, i) =>
        // Build UUID-shaped ids deterministically (test fixture only).
        `${i.toString(16).padStart(8, "0")}-1111-4111-8111-111111111111`,
    )
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({ ...VALID_PAYLOAD, stagedRowIds: tooMany }),
    ).toThrow()
  })

  it("accepts exactly 500 stagedRowIds (boundary)", () => {
    const exactly500 = Array.from(
      { length: 500 },
      (_, i) =>
        `${i.toString(16).padStart(8, "0")}-1111-4111-8111-111111111111`,
    )
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({ ...VALID_PAYLOAD, stagedRowIds: exactly500 }),
    ).not.toThrow()
  })

  it("requires non-UUID stagedRowIds to fail", () => {
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({
        ...VALID_PAYLOAD,
        stagedRowIds: ["not-a-uuid"],
      }),
    ).toThrow()
  })

  it("requires requestedBy.userId to be UUID and userEmail to be email-shaped", () => {
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({
        ...VALID_PAYLOAD,
        requestedBy: { userId: "not-uuid", userEmail: "user@example.com" },
      }),
    ).toThrow()
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({
        ...VALID_PAYLOAD,
        requestedBy: { userId: VALID_PAYLOAD.requestedBy.userId, userEmail: "not-an-email" },
      }),
    ).toThrow()
  })

  it("requires requestedAt to be an ISO datetime string", () => {
    expect(() =>
      ImportMaterializeBatchPayloadSchema.parse({ ...VALID_PAYLOAD, requestedAt: "2026-05-22" }),
    ).toThrow()
  })

  it("rejects missing top-level keys", () => {
    const { stagedRowIds, ...withoutRowIds } = VALID_PAYLOAD
    void stagedRowIds
    expect(() => ImportMaterializeBatchPayloadSchema.parse(withoutRowIds)).toThrow()
  })
})

describe("parseImportMaterializeBatchPayload", () => {
  it("returns the parsed payload on success", () => {
    expect(parseImportMaterializeBatchPayload(VALID_PAYLOAD)).toEqual(VALID_PAYLOAD)
  })

  it("throws on garbage input (not just any error — ZodError shape)", () => {
    expect(() => parseImportMaterializeBatchPayload("totally not an object")).toThrow()
    expect(() => parseImportMaterializeBatchPayload(null)).toThrow()
    expect(() => parseImportMaterializeBatchPayload({})).toThrow()
  })
})
