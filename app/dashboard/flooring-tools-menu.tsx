"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Boxes } from "lucide-react"
import type { UserToolRow } from "@/lib/tool-subscriptions"
import type { FlooringNavItem } from "./flooring-navigation"
import { FLOORING_HOTKEYS } from "@/lib/flooring-hotkeys"

type FlooringToolsMenuProps = {
  canUseTools: boolean
  tools: UserToolRow[]
  visibleSlugs: string[]
  orderedItems: FlooringNavItem[]
  onVisibleSlugsChange: (slugs: string[]) => void
  onOrderedSlugsChange: (slugs: string[]) => void
}

export default function FlooringToolsMenu({
  canUseTools,
  tools,
  visibleSlugs,
  orderedItems,
  onVisibleSlugsChange,
  onOrderedSlugsChange,
}: FlooringToolsMenuProps) {
  const [open, setOpen] = useState(false)
  const [saveError, setSaveError] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const unlockedToolSet = new Set(tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug))
  const hotkeyByPath = new Map(
    FLOORING_HOTKEYS.filter((hotkey) => hotkey.path).map((hotkey) => [hotkey.path!, hotkey.combination]),
  )
  const lastSavedValueRef = useRef(
    JSON.stringify({
      nextVisibleSlugs: visibleSlugs,
      nextOrderedSlugs: orderedItems.map((item) => item.slug),
    }),
  )

  async function persistPreferences(nextVisibleSlugs: string[], nextOrderedSlugs: string[]) {
    const serialized = JSON.stringify({ nextVisibleSlugs, nextOrderedSlugs })
    if (serialized === lastSavedValueRef.current) {
      return
    }

    setSaveError("")

    const response = await fetch("/api/account/flooring-nav", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleSlugs: nextVisibleSlugs, orderedSlugs: nextOrderedSlugs }),
      keepalive: true,
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      visibleSlugs?: string[]
      orderedSlugs?: string[]
    }
    if (!response.ok || !payload.visibleSlugs || !payload.orderedSlugs) {
      throw new Error(payload.error ?? "Failed to save header tabs")
    }

    lastSavedValueRef.current = JSON.stringify({
      nextVisibleSlugs: payload.visibleSlugs,
      nextOrderedSlugs: payload.orderedSlugs,
    })
    onVisibleSlugsChange(payload.visibleSlugs)
    onOrderedSlugsChange(payload.orderedSlugs)
  }

  async function closeAndSave() {
    setOpen(false)

    try {
      await persistPreferences(
        visibleSlugs,
        orderedItems.map((item) => item.slug),
      )
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
            absolute right-0 mt-2 w-[28rem]
            bg-[var(--panel-background)]
            border border-[var(--panel-border)]
            rounded-lg
            shadow-[0_0_12px_rgba(59,130,246,0.15)]
            overflow-hidden
            text-sm
          "
        >
          {saveError ? <p className="border-b border-[var(--panel-border)] px-4 py-2 text-xs text-rose-500">{saveError}</p> : null}
          {orderedItems.map((tool) => {
            const canOpen = canUseTools || (tool.requiredTool ? unlockedToolSet.has(tool.requiredTool) : false)
            const isVisible = visibleSlugs.includes(tool.slug)
            const hotkeyLabel = hotkeyByPath.get(tool.href)

            return (
              <div key={tool.slug} className="flex items-center gap-3 border-b border-[var(--panel-border)]/50 px-3 py-2 last:border-b-0">
                <button
                  onClick={() => {
                    if (canOpen) {
                      void persistPreferences(
                        visibleSlugs,
                        orderedItems.map((item) => item.slug),
                      ).catch((error) => {
                        setSaveError(error instanceof Error ? error.message : "Failed to save header tabs")
                      })
                      setOpen(false)
                      router.push(tool.href)
                    }
                  }}
                  disabled={!canOpen}
                  className={[
                    "min-w-0 flex-1 rounded px-3 py-2 text-left transition",
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded hover:bg-[var(--panel-hover)]"
                  aria-label={`${isVisible ? "Hide" : "Show"} ${tool.name} in header`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    readOnly
                    className="h-4 w-4 accent-blue-500"
                  />
                </button>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      const index = orderedItems.findIndex((item) => item.slug === tool.slug)
                      if (index <= 0) return
                      const next = [...orderedItems]
                      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                      onOrderedSlugsChange(next.map((item) => item.slug))
                    }}
                    className="flex h-4 w-4 items-center justify-center rounded text-[var(--foreground)]/65 hover:bg-[var(--panel-hover)] disabled:opacity-30"
                    disabled={orderedItems[0]?.slug === tool.slug}
                    aria-label={`Move ${tool.name} up`}
                  >
                    <ArrowUp size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      const index = orderedItems.findIndex((item) => item.slug === tool.slug)
                      if (index === -1 || index >= orderedItems.length - 1) return
                      const next = [...orderedItems]
                      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                      onOrderedSlugsChange(next.map((item) => item.slug))
                    }}
                    className="flex h-4 w-4 items-center justify-center rounded text-[var(--foreground)]/65 hover:bg-[var(--panel-hover)] disabled:opacity-30"
                    disabled={orderedItems[orderedItems.length - 1]?.slug === tool.slug}
                    aria-label={`Move ${tool.name} down`}
                  >
                    <ArrowDown size={10} />
                  </button>
                </div>
                {hotkeyLabel ? (
                  <span className="min-w-[88px] shrink-0 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/50 px-2 py-1 text-center text-[10px] font-semibold tracking-wide text-[var(--foreground)]/70">
                    {hotkeyLabel}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
