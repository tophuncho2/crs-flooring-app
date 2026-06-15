"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { buildTemplateHubHref } from "@/hooks/navigation"

// Header "Finder" dropdown. Each item navigates to a finder destination; more
// finders are added by appending to this array. "Templates" opens the template
// hub in its empty state (no template pre-selected), same as the prior button.
const FINDER_ITEMS: { key: string; label: string; href: string }[] = [
  { key: "templates", label: "Templates", href: buildTemplateHubHref() },
]

export function FinderMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open finder"
        className="
          h-10 rounded-md px-3
          bg-[var(--panel-background)]
          border border-[var(--panel-border)]
          flex items-center justify-center gap-2
          text-sm font-medium
          hover:bg-[var(--panel-hover)]
          transition
          shadow-[0_0_6px_rgba(59,130,246,0.25)]
        "
      >
        Finder
        <ChevronDown size={16} />
      </button>

      {open && (
        <div
          role="menu"
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
          {FINDER_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                router.push(item.href)
              }}
              className="block w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
