import { uploadCertificateFileUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { enforceRankAtLeast } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { getStorageEnvironment } from "@/server/platform/env"
import { UPLOAD } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
} from "@/server/http/route-policy"
import { validateCertificateFileUpload } from "../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/certificates/[id]/files
//
// Server-proxied multipart upload. The mutation gauntlet's JSON envelope
// (`parseMutationEnvelope`) can't ride a multipart body, so we read `formData()`,
// pull the file + `idempotencyKey` field, and drive the receipt primitives
// directly off a synthetic body hash. Returns 201 with the created file row.
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...UPLOAD,
      scope: "certificates.files.create",
      route: "/api/certificates/[id]/files",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  try {
    const { id: rawId } = await params
    const certificateId = parseUuidParam(rawId, "id")

    const formData = await request.formData()
    const filePart = formData.get("file")
    const idempotencyKey = formData.get("idempotencyKey")

    if (!(filePart instanceof File)) {
      return routeJson(access, { error: "A file is required", field: "file" }, { status: 400 })
    }
    if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
      return routeJson(
        access,
        { error: "idempotencyKey is required", field: "idempotencyKey" },
        { status: 400 },
      )
    }

    // Validate against the File's declared size FIRST — reject an oversize
    // upload before buffering the whole body into memory. The use case
    // re-validates the real byte length (defense in depth).
    const metadata = validateCertificateFileUpload({
      fileName: filePart.name,
      contentType: filePart.type,
      sizeBytes: filePart.size,
    })

    const data = Buffer.from(await filePart.arrayBuffer())

    const mutation = { idempotencyKey: idempotencyKey.trim() }
    const receiptBody = {
      certificateId,
      fileName: metadata.fileName,
      contentType: metadata.contentType,
      sizeBytes: metadata.sizeBytes,
      mutation,
    }

    const receipt = await enforceMutationReceipt({
      scope: "certificates.files.create",
      request,
      access,
      mutation,
      body: receiptBody,
    })
    if (receipt.replay) return receipt.replay

    const file = await withMutationTelemetry(
      access,
      {
        message: "Certificate file uploaded",
        action: "certificates.files.create",
        route: "/api/certificates/[id]/files",
        entityType: "certificateFile",
        entityId: certificateId,
      },
      () =>
        uploadCertificateFileUseCase(
          {
            certificateId,
            fileName: metadata.fileName,
            contentType: metadata.contentType,
            data,
            storage: getStorageEnvironment(),
          },
          access.user.email,
        ),
    )

    const responseBody = { file }
    await finalizeMutationReceipt({
      scope: "certificates.files.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
