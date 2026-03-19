"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ToolSlug } from "@/server/platform/tool-subscriptions"
import { FLOORING_HOTKEYS } from "@/server/flooring/hotkeys"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable
}

export function useFlooringHotkeys({
  enabled,
  hasBuilderPanelAccess,
  canOpenTool,
  onToggleTheme,
}: {
  enabled: boolean
  hasBuilderPanelAccess: boolean
  canOpenTool: (slug: ToolSlug) => boolean
  onToggleTheme: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return
      if (!event.shiftKey) return

      const matchedHotkey = FLOORING_HOTKEYS.find((hotkey) => hotkey.code === event.code)
      if (!matchedHotkey) return

      event.preventDefault()

      if (matchedHotkey.toggleTheme) {
        onToggleTheme()
        return
      }

      if (!matchedHotkey.path) return

      if (matchedHotkey.code === "KeyQ") {
        if (hasBuilderPanelAccess) {
          router.push(matchedHotkey.path)
        }
        return
      }

      const requiredTool: ToolSlug = matchedHotkey.code === "KeyP" ? "products" : "warehouse"
      if (canOpenTool(requiredTool)) {
        router.push(matchedHotkey.path)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [canOpenTool, enabled, hasBuilderPanelAccess, onToggleTheme, router])
}
