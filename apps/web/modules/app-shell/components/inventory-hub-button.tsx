"use client"

import { Boxes } from "lucide-react"
import { useInventoryHub } from "@/modules/app-shell/components/inventory-hub-provider"

// Header trigger for the app-wide inventory hub. The panel itself is mounted
// once by InventoryHubProvider; this button only opens it on the starting-spot
// cascade. Sits to the left of the template-sync button in the header.
export function InventoryHubButton() {
  const { openInventoryHub } = useInventoryHub()

  return (
    <button
      type="button"
      onClick={openInventoryHub}
      aria-label="Open inventory hub"
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
  )
}
