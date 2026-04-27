// Action item shape for `ActionsPanel`. A panel is a vertical list of these
// actions, optionally grouped via `group` and visually divided. Actions can be
// destructive, disabled, and carry an optional secondary `description` line.

import type { ReactNode } from "react"

export type ActionsPanelAction = {
  key: string
  label: string
  /** Optional secondary line rendered below the label in a smaller, muted font. */
  description?: string
  /** Optional leading icon rendered to the left of the label. */
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  /** When true, the row uses rose-tinted colours and signals a destructive intent. */
  destructive?: boolean
  /**
   * Optional grouping key. Adjacent actions sharing the same `group` are
   * rendered as a cluster; a divider is drawn between groups. Order is
   * preserved as supplied.
   */
  group?: string
}
