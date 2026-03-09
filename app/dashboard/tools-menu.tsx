"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Wrench } from "lucide-react"
import type { UserToolRow } from "@/lib/tool-subscriptions"

type ToolLink = {
  slug: UserToolRow["slug"]
  name: string
  href: string
}

const TOOL_LINKS: ToolLink[] = [
  { slug: "estimator", name: "Estimator", href: "/dashboard/estimator" },
  { slug: "products", name: "Products", href: "/dashboard/products" },
  { slug: "invoices", name: "Invoices", href: "/dashboard/invoices" },
  { slug: "jobs", name: "Jobs", href: "/dashboard/jobs" },
  { slug: "vendors", name: "Vendors", href: "/dashboard/vendors" },
  { slug: "daily-scope", name: "Daily Scope", href: "/dashboard/daily-scope" },
  {
    slug: "subcontractor-agreements",
    name: "Subcontractor Agreements",
    href: "/dashboard/subcontractor-agreements",
  },
  { slug: "warehouse", name: "Warehouse", href: "/dashboard/warehouse" },
]

type ToolsMenuProps = {
  canUseTools: boolean
  tools: UserToolRow[]
}

export default function ToolsMenu({ canUseTools, tools }: ToolsMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const unlockedToolSet = new Set(tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug))

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!canUseTools) return null

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
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
        <Wrench size={18} className="text-blue-500" />
      </button>

      {open && (
        <div
          className="
            absolute right-0 mt-2 w-44
            bg-[var(--panel-background)]
            border border-[var(--panel-border)]
            rounded-lg
            shadow-[0_0_12px_rgba(59,130,246,0.15)]
            overflow-hidden
            text-sm
          "
        >
          <button
            onClick={() => {
              router.push("/dashboard")
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              router.push("/dashboard/billing")
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
          >
            Billing
          </button>
          {TOOL_LINKS.map((tool) => (
            <button
              key={tool.slug}
              onClick={() => {
                if (canUseTools || unlockedToolSet.has(tool.slug)) {
                  router.push(tool.href)
                  setOpen(false)
                }
              }}
              disabled={!(canUseTools || unlockedToolSet.has(tool.slug))}
              className={[
                "w-full text-left px-4 py-2 transition",
                canUseTools || unlockedToolSet.has(tool.slug)
                  ? "hover:bg-[var(--panel-hover)]"
                  : "cursor-not-allowed text-[var(--foreground)]/45",
              ].join(" ")}
            >
              {tool.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
