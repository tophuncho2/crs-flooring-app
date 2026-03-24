import { FLOORING_HOTKEYS } from "@/server/flooring/hotkeys"
import { routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, { capability: "hotkeys.view" })
  if (access instanceof Response) return access

  return routeJson(
    access,
    {
      hotkeys: FLOORING_HOTKEYS.map((hotkey) => ({
        id: hotkey.id,
        key: hotkey.key,
        combination: hotkey.combination,
        action: hotkey.action,
      })),
    },
  )
}
