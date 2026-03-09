"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Boxes } from "lucide-react"
import type { ToolSlug, UserToolRow } from "@/lib/tool-subscriptions"

type FloorToolLink = {
  slug: string
  name: string
  href: string
  requiredTool?: ToolSlug
}

const FLOORS_TOOL_LINKS: FloorToolLink[] = [
  { slug: "warehouse", name: "Warehouse", href: "/dashboard/warehouse", requiredTool: "warehouse" },
  { slug: "products", name: "Products", href: "/dashboard/flooring/products", requiredTool: "products" },
  { slug: "flooring-work-orders", name: "Work Orders", href: "/dashboard/flooring/work-orders", requiredTool: "warehouse" },
  { slug: "flooring-properties", name: "Properties", href: "/dashboard/flooring/properties", requiredTool: "warehouse" },
  { slug: "flooring-management-companies", name: "Management Companies", href: "/dashboard/flooring/management-companies", requiredTool: "warehouse" },
  { slug: "flooring-templates", name: "Templates", href: "/dashboard/flooring/templates", requiredTool: "warehouse" },
  { slug: "flooring-manufacturers", name: "Manufacturers", href: "/dashboard/flooring/manufacturers", requiredTool: "warehouse" },
]

type FlooringToolsMenuProps = {
  canUseTools: boolean
  tools: UserToolRow[]
}

export default function FlooringToolsMenu({ canUseTools, tools }: FlooringToolsMenuProps) {
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
          {FLOORS_TOOL_LINKS.map((tool) => {
            const canOpen = canUseTools || (tool.requiredTool ? unlockedToolSet.has(tool.requiredTool) : false)

            return (
              <button
                key={tool.slug}
                onClick={() => {
                  if (canOpen) {
                    router.push(tool.href)
                    setOpen(false)
                  }
                }}
                disabled={!canOpen}
                className={[
                  "w-full text-left px-4 py-2 transition",
                  canOpen ? "hover:bg-[var(--panel-hover)]" : "cursor-not-allowed text-[var(--foreground)]/45",
                ].join(" ")}
              >
                {tool.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
