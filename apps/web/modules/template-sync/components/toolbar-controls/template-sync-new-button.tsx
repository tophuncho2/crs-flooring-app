"use client"

import { SidePanelPreviewNewButton } from "@/components/side-panel-preview"

type Props = {
  disabled: boolean
  onClick: () => void
}

export function TemplateSyncNewButton({ disabled, onClick }: Props) {
  return <SidePanelPreviewNewButton disabled={disabled} onClick={onClick} label="New template" />
}
