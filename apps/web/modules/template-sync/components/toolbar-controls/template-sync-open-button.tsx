"use client"

import { SidePanelPreviewOpenButton } from "@/components/side-panel-preview"

type Props = {
  disabled: boolean
  onClick: () => void
}

export function TemplateSyncOpenButton({ disabled, onClick }: Props) {
  return <SidePanelPreviewOpenButton disabled={disabled} onClick={onClick} />
}
