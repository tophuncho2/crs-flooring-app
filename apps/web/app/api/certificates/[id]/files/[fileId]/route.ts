import { deleteCertificateFileUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { enforceRankAtLeast } from "@/server/auth/route-auth"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { getStorageEnvironment } from "@/server/platform/env"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>
}

// DELETE /api/certificates/[id]/files/[fileId]
//
// Per-row sync delete. JSON envelope (idempotency key only — no `expectedUpdatedAt`
// since a file carries no OCC token and its removal is idempotent). Deletes the
// row then best-effort deletes the S3 object.
export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_DELETE,
      scope: "certificates.files.delete",
      route: "/api/certificates/[id]/files/[fileId]",
    },
  })
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  try {
    const { id: rawId, fileId: rawFileId } = await params
    const certificateId = parseUuidParam(rawId, "id")
    const fileId = parseUuidParam(rawFileId, "fileId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(body, (value) => value)

    const receipt = await enforceMutationReceipt({
      scope: "certificates.files.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Certificate file deleted",
        action: "certificates.files.delete",
        route: "/api/certificates/[id]/files/[fileId]",
        entityType: "certificateFile",
        entityId: fileId,
      },
      () =>
        deleteCertificateFileUseCase({
          certificateId,
          fileId,
          storage: getStorageEnvironment(),
        }),
    )

    await finalizeMutationReceipt({
      scope: "certificates.files.delete",
      access,
      mutation,
      responseStatus: 200,
      responseBody: result,
    })
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
