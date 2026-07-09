import { createCertificateFileDownloadUrlUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { enforceRankAtLeast } from "@/server/auth/route-auth"
import { parseUuidParam } from "@/server/http/api-helpers"
import { getStorageEnvironment } from "@/server/platform/env"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>
}

// GET /api/certificates/[id]/files/[fileId]/download
//
// Returns a short-lived presigned GET URL ({ url }); the client opens it. The
// bucket is private, so the object is never public-read.
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const forbidden = enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)
  if (forbidden) return forbidden

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/certificates/[id]/files/[fileId]/download",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, fileId: rawFileId } = await params
    const certificateId = parseUuidParam(rawId, "id")
    const fileId = parseUuidParam(rawFileId, "fileId")

    const result = await createCertificateFileDownloadUrlUseCase({
      certificateId,
      fileId,
      storage: getStorageEnvironment(),
    })
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
