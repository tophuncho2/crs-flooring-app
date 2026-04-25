// Action descriptor for header / action-panel surfaces. The `kind` hint lets
// consumers style primary actions differently from secondary or destructive
// ones; the header component is free to ignore it.

export type HeaderActionKind = "primary" | "secondary" | "destructive"

export type HeaderAction = {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  kind?: HeaderActionKind
  ariaLabel?: string
}
