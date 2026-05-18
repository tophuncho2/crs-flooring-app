"use client"

import { SidePanelPreviewSyncButton } from "@/components/side-panel-preview"

type Props = {
  disabled: boolean
  isSyncing: boolean
  onClick: () => void
}

export function TemplateSyncSyncButton({ disabled, isSyncing, onClick }: Props) {
  return (
    <SidePanelPreviewSyncButton
      disabled={disabled}
      isSyncing={isSyncing}
      onClick={onClick}
    />
  )
}
