"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import type { ToolSlug } from "@/server/platform/tool-subscriptions"
import { FLOORING_AVATAR_BUTTON_CLASS_NAME } from "@/features/flooring/shared/accent-styles"
import { requestJson } from "@/features/flooring/shared/http"
import { useFlooringHotkeys } from "../hooks/use-hotkeys"

type HotkeyRow = {
  id: string
  key: string
  combination: string
  action: string
}

function KeyVisualization({ combination }: { combination: string }) {
  const keys = combination
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)

  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((keyPart, index) => (
        <kbd
          key={`${combination}-${index}`}
          className="rounded border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-0.5 text-[11px] font-semibold"
        >
          {keyPart}
        </kbd>
      ))}
    </div>
  )
}

type UserMenuProps = {
  email: string
  role: string
  canUseTools?: boolean
  unlockedToolSlugs?: ToolSlug[]
}

export default function UserMenu({ email, role, canUseTools: canUseToolsProp, unlockedToolSlugs = [] }: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hotkeysOpen, setHotkeysOpen] = useState(false)
  const [hotkeys, setHotkeys] = useState<HotkeyRow[]>([])
  const [hotkeysLoading, setHotkeysLoading] = useState(false)
  const [hotkeysError, setHotkeysError] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const firstLetter = email.charAt(0).toUpperCase()
  const isGovernanceUser = role === "ADMIN" || role === "OWNER"
  const hasBuilderPanelAccess = isGovernanceUser
  const canUseTools = canUseToolsProp ?? (role === "BUILDER" || isGovernanceUser)
  const unlockedToolSet = useMemo(() => new Set(unlockedToolSlugs), [unlockedToolSlugs])
  const canOpenTool = useCallback((slug: ToolSlug) => canUseTools || unlockedToolSet.has(slug), [canUseTools, unlockedToolSet])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    function evaluateMobile() {
      const byWidth = window.matchMedia("(max-width: 767px)").matches
      const byPointer = window.matchMedia("(pointer: coarse)").matches
      setIsMobile(byWidth || byPointer)
    }

    evaluateMobile()
    window.addEventListener("resize", evaluateMobile)
    return () => window.removeEventListener("resize", evaluateMobile)
  }, [])

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" })
  }

  useFlooringHotkeys({
    enabled: !isMobile,
    canOpenTool,
  })

  const fetchHotkeys = useCallback(async () => {
    setHotkeysLoading(true)
    setHotkeysError("")

    try {
      const payload = await requestJson<{ hotkeys?: HotkeyRow[] }>("/api/hotkeys")
      setHotkeys(payload.hotkeys ?? [])
    } catch (error) {
      setHotkeysError(error instanceof Error ? error.message : "Failed to load hotkeys")
    } finally {
      setHotkeysLoading(false)
    }
  }, [])

  const openHotkeysModal = useCallback(async () => {
    setOpen(false)
    setHotkeysError("")
    setHotkeysOpen(true)
    await fetchHotkeys()
  }, [fetchHotkeys])

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`h-10 w-10 ${FLOORING_AVATAR_BUTTON_CLASS_NAME}`}
        >
          {firstLetter}
        </button>

        {open && (
          <div
            className="
              absolute right-0 mt-2 w-48
              bg-[var(--panel-background)]
              border border-[var(--panel-border)]
              rounded-lg
              shadow-[0_0_12px_rgba(59,130,246,0.15)]
              overflow-hidden
              text-sm
            "
          >
            <div className="px-4 py-2 border-b border-[var(--panel-border)] text-blue-500 truncate">
              {email}
            </div>

            {canOpenTool("warehouse") && (
              <button
                onClick={() => {
                  router.push("/dashboard/flooring/warehouse")
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
              >
                Warehouse
              </button>
            )}

            {hasBuilderPanelAccess && (
              <button
                onClick={() => {
                  router.push("/dashboard/builder")
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
              >
                Admin Panel
              </button>
            )}

            <button
              onClick={() => void openHotkeysModal()}
              className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
            >
              Hotkeys
            </button>
            <button
              onClick={() => void handleLogout()}
              className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {hotkeysOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Hotkeys</h2>
                <p className="text-xs text-[var(--foreground)]/70">
                  Hotkeys are disabled on mobile devices.
                </p>
              </div>
              <button
                onClick={() => setHotkeysOpen(false)}
                className="rounded-md border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]"
              >
                Close
              </button>
            </div>

            {hotkeysError && (
              <p className="mb-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
                {hotkeysError}
              </p>
            )}

            <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--panel-hover)] text-left">
                  <tr>
                    <th className="px-3 py-2">Key</th>
                    <th className="px-3 py-2">Combination</th>
                    <th className="px-3 py-2">Action</th>
                    {!isMobile && <th className="px-3 py-2">Visualization</th>}
                  </tr>
                </thead>
                <tbody>
                  {hotkeysLoading ? (
                    <tr>
                      <td
                        colSpan={isMobile ? 3 : 4}
                        className="px-3 py-8 text-center text-[var(--foreground)]/70"
                      >
                        Loading hotkeys...
                      </td>
                    </tr>
                  ) : hotkeys.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isMobile ? 3 : 4}
                        className="px-3 py-8 text-center text-[var(--foreground)]/70"
                      >
                        No hotkeys configured.
                      </td>
                    </tr>
                  ) : (
                    hotkeys.map((hotkey) => (
                      <tr key={hotkey.id} className="border-t border-[var(--panel-border)]">
                        <td className="px-3 py-2">{hotkey.key}</td>
                        <td className="px-3 py-2">{hotkey.combination}</td>
                        <td className="px-3 py-2">{hotkey.action}</td>
                        {!isMobile && (
                          <td className="px-3 py-2">
                            <KeyVisualization combination={hotkey.combination} />
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
