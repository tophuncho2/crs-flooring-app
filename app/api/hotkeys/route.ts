import { ensureAuthenticated } from "@/server/auth/route-auth"
import { FLOORING_HOTKEYS } from "@/server/flooring/hotkeys"
import { getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

export async function GET() {
  const authError = await ensureAuthenticated()
  if (authError) return authError

  return jsonWithRequestId(
    {
      hotkeys: FLOORING_HOTKEYS.map((hotkey) => ({
        id: hotkey.id,
        key: hotkey.key,
        combination: hotkey.combination,
        action: hotkey.action,
      })),
    },
    getRequestId(),
  )
}
