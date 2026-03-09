"use client"

import { useEffect, useRef, useState } from "react"
import { useCallback } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { isMasterEmail } from "@/lib/access-control"
import type { ToolSlug } from "@/lib/tool-subscriptions"

type Theme = "light" | "dark"

type HotkeyRow = {
  id: string
  key: string
  combination: string
  action: string
  createdAt: string
  updatedAt: string
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable
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
  const [open, setOpen] = useState(false)
  const [hotkeysOpen, setHotkeysOpen] = useState(false)
  const [hotkeys, setHotkeys] = useState<HotkeyRow[]>([])
  const [hotkeysLoading, setHotkeysLoading] = useState(false)
  const [hotkeysError, setHotkeysError] = useState("")
  const [hotkeysMessage, setHotkeysMessage] = useState("")
  const [hotkeyDrafts, setHotkeyDrafts] = useState<Record<string, Pick<HotkeyRow, "key" | "combination" | "action">>>({})
  const [savingHotkeyId, setSavingHotkeyId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const firstLetter = email.charAt(0).toUpperCase()
  const isMaster = isMasterEmail(email)
  const isBuilder = role === "BUILDER"
  const hasBuilderPanelAccess = isBuilder || isMaster
  const canUseTools = canUseToolsProp ?? (role === "BUILDER" || role === "ADMIN")
  const unlockedToolSet = new Set(unlockedToolSlugs)
  const canOpenTool = (slug: ToolSlug) => canUseTools || unlockedToolSet.has(slug)

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

  function toggleTheme(closeMenu = true) {
    const activeTheme = document.documentElement.dataset.theme
    const fallbackTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    const currentTheme: Theme = activeTheme === "dark" || activeTheme === "light" ? activeTheme : fallbackTheme
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark"
    document.documentElement.dataset.theme = nextTheme
    localStorage.setItem("theme", nextTheme)
    if (closeMenu) {
      setOpen(false)
    }
  }

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" })
  }

  const fetchHotkeys = useCallback(async () => {
    setHotkeysLoading(true)
    setHotkeysError("")

    try {
      const response = await fetch("/api/hotkeys")
      const payload = (await response.json()) as { hotkeys?: HotkeyRow[]; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load hotkeys")
      }

      setHotkeys(payload.hotkeys ?? [])
      setHotkeyDrafts({})
    } catch (error) {
      setHotkeysError(error instanceof Error ? error.message : "Failed to load hotkeys")
    } finally {
      setHotkeysLoading(false)
    }
  }, [])

  const openHotkeysModal = useCallback(async () => {
    setOpen(false)
    setHotkeysMessage("")
    setHotkeysError("")
    setHotkeysOpen(true)
    await fetchHotkeys()
  }, [fetchHotkeys])

  function getDraft(hotkey: HotkeyRow) {
    return hotkeyDrafts[hotkey.id] ?? {
      key: hotkey.key,
      combination: hotkey.combination,
      action: hotkey.action,
    }
  }

  function updateDraft(hotkeyId: string, field: "key" | "combination" | "action", value: string) {
    setHotkeyDrafts((prev) => ({
      ...prev,
      [hotkeyId]: {
        ...(prev[hotkeyId] ?? { key: "", combination: "", action: "" }),
        [field]: value,
      },
    }))
  }

  async function saveHotkey(hotkey: HotkeyRow) {
    const draft = getDraft(hotkey)

    if (!draft.key.trim() || !draft.combination.trim() || !draft.action.trim()) {
      setHotkeysError("Key, Combination, and Action are required")
      return
    }

    setSavingHotkeyId(hotkey.id)
    setHotkeysError("")
    setHotkeysMessage("")

    try {
      const response = await fetch(`/api/hotkeys/${hotkey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: draft.key.trim(),
          combination: draft.combination.trim(),
          action: draft.action.trim(),
        }),
      })

      const payload = (await response.json()) as { hotkey?: HotkeyRow; error?: string }
      if (!response.ok || !payload.hotkey) {
        throw new Error(payload.error ?? "Failed to save hotkey")
      }

      setHotkeys((prev) => prev.map((row) => (row.id === hotkey.id ? payload.hotkey! : row)))
      setHotkeyDrafts((prev) => {
        const next = { ...prev }
        delete next[hotkey.id]
        return next
      })
      setHotkeysMessage("Hotkey saved")
    } catch (error) {
      setHotkeysError(error instanceof Error ? error.message : "Failed to save hotkey")
    } finally {
      setSavingHotkeyId(null)
    }
  }

  useEffect(() => {
    if (isMobile) return

    async function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return
      if (!event.shiftKey) return

      const key = event.key.toLowerCase()

      if (key === "escape") {
        event.preventDefault()
        await handleLogout()
        return
      }

      if (event.code === "Space") {
        event.preventDefault()
        router.push("/dashboard")
        return
      }

      if (key === "e") {
        if (canOpenTool("estimator")) {
          event.preventDefault()
          router.push("/dashboard/estimator")
        }
        return
      }

      if (key === "p") {
        if (canOpenTool("products")) {
          event.preventDefault()
          router.push("/dashboard/products")
        }
        return
      }

      if (key === "i") {
        if (canOpenTool("invoices")) {
          event.preventDefault()
          router.push("/dashboard/invoices")
        }
        return
      }

      if (key === "w") {
        if (canOpenTool("warehouse")) {
          event.preventDefault()
          router.push("/dashboard/warehouse")
        }
        return
      }

      if (key === "b") {
        if (hasBuilderPanelAccess) {
          event.preventDefault()
          router.push("/dashboard/builder")
        }
        return
      }

      if (key === "h") {
        event.preventDefault()
        void openHotkeysModal()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [canUseTools, hasBuilderPanelAccess, isMobile, openHotkeysModal, router])

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="
            h-10 w-10 rounded-full
            bg-blue-600
            text-black
            font-bold
            flex items-center justify-center
            transition-all duration-200
            hover:bg-blue-500
            shadow-[0_0_6px_rgba(59,130,246,0.35)]
          "
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

            {hasBuilderPanelAccess && (
              <button
                onClick={() => {
                  router.push("/dashboard/builder")
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
              >
                Builder Panel
              </button>
            )}

            <button
              onClick={() => void openHotkeysModal()}
              className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
            >
              Hotkeys
            </button>

            <button
              onClick={() => toggleTheme()}
              className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
            >
              Toggle Theme
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

            {hotkeysMessage && (
              <p className="mb-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                {hotkeysMessage}
              </p>
            )}
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
                    {isBuilder && <th className="px-3 py-2">Save</th>}
                  </tr>
                </thead>
                <tbody>
                  {hotkeysLoading ? (
                    <tr>
                      <td
                        colSpan={isBuilder ? (isMobile ? 4 : 5) : (isMobile ? 3 : 4)}
                        className="px-3 py-8 text-center text-[var(--foreground)]/70"
                      >
                        Loading hotkeys...
                      </td>
                    </tr>
                  ) : hotkeys.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isBuilder ? (isMobile ? 4 : 5) : (isMobile ? 3 : 4)}
                        className="px-3 py-8 text-center text-[var(--foreground)]/70"
                      >
                        No hotkeys configured.
                      </td>
                    </tr>
                  ) : (
                    hotkeys.map((hotkey) => {
                      const draft = getDraft(hotkey)
                      const isSaving = savingHotkeyId === hotkey.id

                      return (
                        <tr key={hotkey.id} className="border-t border-[var(--panel-border)]">
                          <td className="px-3 py-2">
                            {isBuilder ? (
                              <input
                                value={draft.key}
                                onChange={(event) => updateDraft(hotkey.id, "key", event.target.value)}
                                className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                              />
                            ) : (
                              <span>{hotkey.key}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isBuilder ? (
                              <input
                                value={draft.combination}
                                onChange={(event) => updateDraft(hotkey.id, "combination", event.target.value)}
                                className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                              />
                            ) : (
                              <span>{hotkey.combination}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isBuilder ? (
                              <input
                                value={draft.action}
                                onChange={(event) => updateDraft(hotkey.id, "action", event.target.value)}
                                className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                              />
                            ) : (
                              <span>{hotkey.action}</span>
                            )}
                          </td>
                          {!isMobile && (
                            <td className="px-3 py-2">
                              <KeyVisualization combination={draft.combination || hotkey.combination} />
                            </td>
                          )}
                          {isBuilder && (
                            <td className="px-3 py-2">
                              <button
                                onClick={() => void saveHotkey(hotkey)}
                                disabled={isSaving}
                                className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })
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
