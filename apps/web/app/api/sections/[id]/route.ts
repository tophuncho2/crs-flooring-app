import { deleteSectionRow, getSectionRowById, updateSectionRow } from "@/modules/warehouse/api"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "warehouse.sections.write",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/sections/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getSectionRowById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { section: currentSnapshot },
      message: "Section changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "sections.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Warehouse section updated",
        action: "sections.update",
        route: "/api/sections/[id]",
        entityType: "flooringSection",
        entityId: id,
      },
      () => updateSectionRow(undefined, id, input),
    )

    const responseBody = { section: result }
    await finalizeMutationReceipt({
      scope: "sections.update",
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "warehouse.sections.delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/sections/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getSectionRowById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { section: currentSnapshot },
      message: "Section changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "sections.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Warehouse section deleted",
        action: "sections.delete",
        route: "/api/sections/[id]",
        entityType: "flooringSection",
        entityId: id,
      },
      () => deleteSectionRow(undefined, id),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "sections.delete",
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
