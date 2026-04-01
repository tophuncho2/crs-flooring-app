"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import type { ToolSlug } from "@/server/platform/tool-subscriptions"
import { FLOORING_AVATAR_BUTTON_CLASS_NAME } from "@/features/flooring/shared/accent-styles"

type UserMenuProps = {
  email: string
  role: string
  canUseTools?: boolean
  unlockedToolSlugs?: ToolSlug[]
}

export default function UserMenu({ email, role, canUseTools: canUseToolsProp, unlockedToolSlugs = [] }: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
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
              onClick={() => void handleLogout()}
              className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>

    </>
  )
}
