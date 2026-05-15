"use client"

import { useCallback, useState } from "react"
import { ClipboardList } from "lucide-react"
import { SidePanelPreview } from "@/components/side-panel-preview"

export function WorkOrdersSidePanelButton() {
  const [open, setOpen] = useState(false)

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open work orders preview"
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
        <ClipboardList size={18} className="text-blue-500" />
      </button>

      <SidePanelPreview
        open={open}
        side="right"
        onClose={handleClose}
        title="Work orders"
        widthClassName="w-[34rem]"
      >
        {null}
      </SidePanelPreview>
    </>
  )
}
