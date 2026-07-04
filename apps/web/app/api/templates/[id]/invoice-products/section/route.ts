import { saveTemplateInvoiceProductsSectionUseCase } from "@builders/application"
import { getTemplateById } from "@builders/db"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateTemplateInvoiceProductsDiffInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "templates.invoice-products.section.replace",
      route: "/api/templates/[id]/invoice-products/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(
      body,
      validateTemplateInvoiceProductsDiffInput,
      { requireExpectedUpdatedAt: true },
    )

    const currentSnapshot = await getTemplateById(id, { withNeighbors: false })
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { template: currentSnapshot },
      message: "Template changed before invoice products save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "templates.invoice-products.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Template invoice products section replaced",
        action: "templates.invoice-products.section.replace",
        route: "/api/templates/[id]/invoice-products/section",
        entityType: "template",
        entityId: id,
      },
      () => saveTemplateInvoiceProductsSectionUseCase({ templateId: id, diff }, access.user.email),
    )

    const detail = await getTemplateById(id)
    const responseBody = {
      template: detail,
      tempIdMap: result.tempIdMap,
    }
    await finalizeMutationReceipt({
      scope: "templates.invoice-products.section.replace",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
