"use client"

import { SidePanelPreviewClearButton } from "@/components/side-panel-preview"

type Props = {
  disabled: boolean
  onClick: () => void
}

export function TemplateSyncClearButton({ disabled, onClick }: Props) {
  return <SidePanelPreviewClearButton disabled={disabled} onClick={onClick} />
}
