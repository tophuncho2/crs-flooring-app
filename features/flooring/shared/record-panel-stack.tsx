"use client"

import type { ReactNode } from "react"
import { RecordModalShell } from "./record-form"

export type RecordPanelLayer = {
  key: string
  title: string
  onClose: () => void
  content: ReactNode
}

export function RecordPanelStack({ layers }: { layers: RecordPanelLayer[] }) {
  return (
    <>
      {layers.map((layer, index) => (
        <RecordModalShell key={layer.key} title={layer.title} onClose={layer.onClose} zIndex={40 + index * 10}>
          {layer.content}
        </RecordModalShell>
      ))}
    </>
  )
}
