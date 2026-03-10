"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Boxes } from "lucide-react"
import type { UserToolRow } from "@/lib/tool-subscriptions"
import { FLOORING_NAV_ITEMS } from "./flooring-navigation"

type FlooringToolsMenuProps = {
  canUseTools: boolean
  tools: UserToolRow[]
  visibleSlugs: string[]
  onVisibleSlugsChange: (slugs: string[]) => void
}

export default function FlooringToolsMenu({
  canUseTools,
  tools,
  visibleSlugs,
  onVisibleSlugsChange,
}: FlooringToolsMenuProps) {
  const [open, setOpen] = useState(false)
  const [saveError, setSaveError] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const unlockedToolSet = new Set(tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug))
  const lastSavedValueRef = useRef(JSON.stringify(visibleSlugs))

  async function persistVisibleSlugs(nextVisibleSlugs: string[]) {
    const serialized = JSON.stringify(nextVisibleSlugs)
    if (serialized === lastSavedValueRef.current) {
      return
    }

    setSaveError("")

    const response = await fetch("/api/account/flooring-nav", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleSlugs: nextVisibleSlugs }),
      keepalive: true,
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; visibleSlugs?: string[] }
    if (!response.ok || !payload.visibleSlugs) {
      throw new Error(payload.error ?? "Failed to save header tabs")
    }

    lastSavedValueRef.current = JSON.stringify(payload.visibleSlugs)
    onVisibleSlugsChange(payload.visibleSlugs)
  }

  async function closeAndSave() {
    setOpen(false)

    try {
      await persistVisibleSlugs(visibleSlugs)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save header tabs")
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        void closeAndSave()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [visibleSlugs])

  if (!canUseTools) return null

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => {
          if (open) {
            void closeAndSave()
            return
          }
          setOpen(true)
        }}
        className="
          w-10 h-10 rounded-full
          bg-[var(--panel-background)]
          border border-[var(--panel-border)]
          flex items-center justify-center
          hover:bg-[var(--panel-hover)]
          transition
          shadow-[0_0_6px_rgba(59,130,246,0.25)]
        "
      >
        <Boxes size={18} className="text-blue-500" />
      </button>

      {open && (
        <div
          className="
            absolute right-0 mt-2 w-56
            bg-[var(--panel-background)]
            border border-[var(--panel-border)]
            rounded-lg
            shadow-[0_0_12px_rgba(59,130,246,0.15)]
            overflow-hidden
            text-sm
          "
        >
          {saveError ? <p className="border-b border-[var(--panel-border)] px-4 py-2 text-xs text-rose-500">{saveError}</p> : null}
          {FLOORING_NAV_ITEMS.map((tool) => {
            const canOpen = canUseTools || (tool.requiredTool ? unlockedToolSet.has(tool.requiredTool) : false)
            const isVisible = visibleSlugs.includes(tool.slug)

            return (
              <div key={tool.slug} className="flex items-center gap-2 border-b border-[var(--panel-border)]/50 px-2 py-1 last:border-b-0">
                <button
                  onClick={() => {
                    if (canOpen) {
                      void persistVisibleSlugs(visibleSlugs).catch((error) => {
                        setSaveError(error instanceof Error ? error.message : "Failed to save header tabs")
                      })
                      setOpen(false)
                      router.push(tool.href)
                    }
                  }}
                  disabled={!canOpen}
                  className={[
                    "min-w-0 flex-1 rounded px-2 py-2 text-left transition",
                    canOpen ? "hover:bg-[var(--panel-hover)]" : "cursor-not-allowed text-[var(--foreground)]/45",
                  ].join(" ")}
                >
                  {tool.name}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    const nextVisibleSlugs = isVisible
                      ? visibleSlugs.filter((slug) => slug !== tool.slug)
                      : [...visibleSlugs, tool.slug]
                    onVisibleSlugsChange(nextVisibleSlugs)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded hover:bg-[var(--panel-hover)]"
                  aria-label={`${isVisible ? "Hide" : "Show"} ${tool.name} in header`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    readOnly
                    className="h-4 w-4 accent-blue-500"
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
