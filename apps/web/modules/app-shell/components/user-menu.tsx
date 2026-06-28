"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/modules/auth/auth-client"
import { FLOORING_AVATAR_BUTTON_CLASS_NAME } from "@/engines/common"

type UserMenuProps = {
  email: string
  rank: string
}

export default function UserMenu({ email, rank }: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const firstLetter = email.charAt(0).toUpperCase()

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
    await authClient.signOut()
    router.push("/login")
    router.refresh()
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
              absolute bottom-full left-0 mb-2 w-48
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
